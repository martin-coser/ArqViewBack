"""
ArqView - Backend del asistente de búsqueda de propiedades.

REESCRITURA: pasa de un esquema "extraer parámetros con JSON + acumularlos a mano +
clasificar la intención con flags booleanas" a un esquema de FUNCTION CALLING nativo
de Gemini, con historial de conversación manejado por el propio SDK (ChatSession).

Ventajas frente a la versión anterior:
- El modelo decide él mismo, con TODO el contexto de la conversación, cuándo buscar en
  la base, cuándo responder con lo que ya mostró, cuándo pedir un dato que falta, y
  cuándo redirigir una pregunta fuera de tema. Ya no hay flags rígidos
  (is_off_topic / is_friendly_message / is_contextual_query / reset_search).
- No existe más un diccionario `params` que se va acumulando turno a turno. En cada
  llamada a la herramienta, el modelo manda el conjunto COMPLETO de filtros vigentes
  según toda la conversación. Si el usuario corrige o contradice algo anterior, el
  modelo simplemente no lo incluye — no hace falta un comando explícito de "reset".
- El historial de la conversación (incluyendo llamadas a la herramienta y sus
  resultados) lo mantiene el propio ChatSession de Gemini, no un string que se
  concatena a mano y se re-envía entero en cada prompt.

Requiere: google-generativeai >= 0.5 (soporte de automatic function calling).
"""

from flask import Flask, request, jsonify
import google.generativeai as genai
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
import logging
import os
import uuid
import atexit
from decimal import Decimal
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

# --- Configuración Inicial ---
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
app = Flask(__name__)

GM_API_KEY = os.getenv("GM_API_KEY")
if not GM_API_KEY:
    raise ValueError("GM_API_KEY no configurada. Revisa tu archivo .env.")
genai.configure(api_key=GM_API_KEY)

MODEL_NAME = "gemini-3.5-flash-lite"

# --- Configuración de la Base de Datos ---
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT"),
}

try:
    pg_pool = psycopg2.pool.SimpleConnectionPool(1, 20, **DB_CONFIG)
    logger.info("✅ Pool de conexiones de PostgreSQL creado exitosamente.")
except (Exception, psycopg2.DatabaseError) as error:
    logger.error(f"Error conectando a PostgreSQL: {error}")
    pg_pool = None

FTS_CONFIG = "spanish"

# --- Estado de sesiones en memoria ---
# Cada sesión guarda su ChatSession de Gemini (con el historial completo) y los
# resultados crudos de la última búsqueda ejecutada en ESTE turno (para devolverlos
# al frontend con todos los campos, aunque al modelo le mandemos una versión resumida).
SESSIONS: Dict[str, Dict[str, Any]] = {}

SYSTEM_INSTRUCTION = """
Sos el asistente virtual de ArqView, una plataforma de búsqueda de propiedades
inmobiliarias (venta y alquiler). Tu única función es ayudar a los usuarios a
encontrar propiedades que se ajusten a lo que buscan, conversando de forma natural.

Contás con tres herramientas:
- `buscar_propiedades`: ejecuta una búsqueda contra la base de datos y te devuelve
  los resultados para que VOS los analices. Esta herramienta NUNCA le muestra nada
  al usuario directamente — solo te da datos.
- `mostrar_propiedades`: es la ÚNICA forma de mostrarle tarjetas visuales al
  usuario. Recibe una lista de IDs (de una búsqueda reciente o de una anterior en
  esta misma conversación) y hace que esas propiedades puntuales se rendericen
  como tarjetas. No vuelve a consultar la base.
- `obtener_valores_referencia`: te muestra las localidades, tipos de propiedad y
  estilos arquitectónicos que existen realmente en la base de datos.

Reglas de comportamiento:

1. Cuando el usuario describa (aunque sea parcialmente) una propiedad que busca por
   primera vez, o pida explícitamente cambiar/ampliar los filtros de la búsqueda,
   llamá a `buscar_propiedades` con TODOS los filtros que sigan vigentes según la
   conversación COMPLETA hasta este punto, no solo lo dicho en el último mensaje. Si
   el usuario contradice, corrige o reemplaza un filtro anterior (ej. "mejor en
   Córdoba, no en Villa María", "sin pileta ya no hace falta"), NO incluyas el
   filtro viejo en la llamada.

1b. Si no estás seguro de cómo se escribe exactamente una localidad, un tipo de
   propiedad o un estilo arquitectónico que mencionó el usuario (por ejemplo,
   dudas si lleva tilde, o si el usuario usó una forma coloquial o abreviada),
   llamá primero a `obtener_valores_referencia` y usá el valor más parecido al que
   te devuelva en tu llamada a `buscar_propiedades`, en vez de adivinar.

2. Si al usuario le faltan los dos datos mínimos para buscar (tipo de propiedad Y
   localidad), no llames a ninguna herramienta: preguntale amablemente por el dato
   que falta, de forma breve y natural.

3. CRÍTICO — separá siempre "buscar" de "mostrar": después de llamar a
   `buscar_propiedades`, los resultados son solo para VOS, para razonar y decidir.
   Después tenés que llamar explícitamente a `mostrar_propiedades` con los IDs que
   realmente correspondan mostrarle al usuario. NO son necesariamente todos los
   resultados de la búsqueda:
     - Si el pedido del usuario era una búsqueda general ("busco un depto en
       Villa María"), normalmente mostrale TODOS los resultados relevantes.
     - Si el pedido era una pregunta puntual sobre algo específico (ej. "¿esta
       propiedad tiene pileta o asador?", "¿hay alguna con pileta?"), y buscaste
       para chequearlo, mostrale SOLO la o las propiedades que realmente responden
       esa pregunta puntual — no todo lo que trajo la búsqueda exploratoria. Si
       ninguna de las que trajo la búsqueda es relevante para lo que preguntó, no
       llames a `mostrar_propiedades` y respondé solo en texto.

4. Si el usuario pregunta o pide ver de nuevo propiedades que YA aparecieron antes
   en esta conversación (ej. "¿cuáles son esas casas?", "mostrame las que tienen
   pileta", "la segunda y la cuarta", "¿cuál es la más barata?"), NO vuelvas a
   llamar a `buscar_propiedades`. Identificá los IDs correspondientes usando el
   historial y llamá directamente a `mostrar_propiedades` con esos IDs.

5. Si el usuario pide explícitamente reiniciar o cambiar completamente de búsqueda
   ("empecemos de nuevo", "olvidate de todo lo anterior"), tratá la siguiente
   búsqueda como si no hubiera ningún filtro previo vigente.

6. Si el mensaje del usuario no tiene relación con buscar propiedades (ej. pide una
   receta, pregunta la hora, charla de otro tema), respondé amablemente que tu
   función es ayudar a buscar inmuebles en ArqView y redirigí la conversación hacia
   eso, sin llamar a ninguna herramienta.

7. Si el usuario solo saluda, agradece o confirma algo sin pedir nada nuevo,
   respondé con cordialidad y preguntá cómo seguir (refinar la búsqueda actual o
   buscar en otro lado), sin llamar a ninguna herramienta.

8. Nunca inventes propiedades, precios, ubicaciones ni características que no vengan
   del resultado de `buscar_propiedades` o `mostrar_propiedades`. Si una búsqueda no
   devuelve resultados relevantes, decilo con naturalidad y ofrecé ajustar los
   filtros.

9. Interpretá con libertad lo que el usuario quiere decir: sinónimos, expresiones
   coloquiales, pedidos indirectos ("algo para una familia grande", "que no sea
   caro"). No le exijas que use términos exactos ni una sintaxis particular.

10. Por defecto (por ejemplo, apenas mostrás los resultados de una búsqueda nueva, o
   volvés a mostrar propiedades ya conocidas sin que te pidan más), tu texto debe
   ser breve (1-2 líneas): NO repitas nombre, precio, dormitorios, baños ni otros
   datos que ya se ven en las tarjetas. Alcanza con un comentario general y una
   pregunta de cómo seguir.

11. Si el usuario pide explícitamente un análisis más profundo sobre las
   propiedades mostradas (ej. "dame un detalle de cada una", "describime cada
   propiedad", "qué recomendás", "pros y contras", "en qué me tengo que fijar",
   "cuál te parece mejor y por qué"), tu texto SÍ debe ser sustancial. Para cada
   propiedad relevante, escribí algunas líneas con información que la tarjeta NO
   muestra: para qué tipo de persona o situación es ideal, qué conviene chequear o
   tener en cuenta antes de decidir (antigüedad, estado, zona, gastos, posibles
   dudas para confirmar con la inmobiliaria), y cómo se compara con las otras
   opciones mostradas. No hace falta que repitas precio, dormitorios o m² en el
   texto (eso ya está en la tarjeta), pero el resto del análisis tiene que aportar
   algo nuevo y útil, no ser un resumen genérico de una sola oración. Mantené las
   tarjetas visibles (llamando a `mostrar_propiedades` igual) salvo que el usuario
   pida explícitamente no verlas.

12. Para saber si tenemos propiedades disponibles en una localidad, debemos buscar las localidades existentes, 
    y si tienen propiedades disponibles.
""".strip()


# --- Normalización de tags visuales (se mantiene igual que antes) ---
def normalize_visual_tags(tags_list: Optional[List[str]]) -> List[str]:
    """Convierte frases tipo 'cocina grande' en pares 'cocina,grande'."""
    normalized_tags = []
    if not tags_list:
        return normalized_tags
    for phrase in tags_list:
        parts = phrase.strip().lower().split()
        if not parts:
            continue
        space = parts[0]
        features = parts[1:]
        if not features:
            continue
        adjectives = [f for f in features if f not in ("y", "o", "con", "sin")]
        for adj in adjectives:
            normalized_tags.append(f"{space},{adj}")
    return normalized_tags


def to_jsonable(row: dict) -> dict:
    """Convierte tipos no serializables (Decimal) a tipos nativos de Python/JSON."""
    clean = {}
    for k, v in row.items():
        if isinstance(v, Decimal):
            clean[k] = float(v)
        else:
            clean[k] = v
    return clean


# --- Consulta de propiedades (lógica SQL sin cambios respecto a la versión anterior) ---
def query_properties(params: dict) -> list:
    """
    Consulta propiedades aplicando filtros duros y usando contentFilter SÓLO para
    ranking por relevancia (full-text search).
    """
    if pg_pool is None:
        raise RuntimeError("No hay conexión disponible a la base de datos.")

    tags_visuales_solicitados = normalize_visual_tags(params.get("tagsVisuales"))
    tags_visuales_excluir = normalize_visual_tags(params.get("tagsVisualesExcluir"))

    conn = pg_pool.getconn()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        sql_params: list = []

        content_filter = params.get("contentFilter")
        if content_filter:
            rank_select = (
                f", COALESCE(ts_rank(to_tsvector('{FTS_CONFIG}', p.descripcion), "
                f"plainto_tsquery('{FTS_CONFIG}', %s)), 0) AS rank"
            )
            sql_params.append(content_filter)
        else:
            rank_select = ", 0 AS rank"

        select_columns = [
            "p.id", "p.nombre", "p.descripcion", "p.direccion", "p.precio", "p.superficie",
            'p."cantidadBanios"', 'p."cantidadDormitorios"', 'p."cantidadAmbientes"',
            'p."tipoOperacion"', "p.latitud", "p.longitud",
            "l.nombre as localidad_nombre",
            "tp.nombre as tipo_propiedad_nombre",
            "ea.nombre as estilo_arquitectonico_nombre",
            "array_agg(DISTINCT tv.nombre) as tipo_visualizaciones_nombres",
            "array_agg(i.tags_visuales) as tags_visuales_agregados",
        ]
        sql_select = f"SELECT {', '.join(select_columns)} {rank_select}"

        sql_from = """
        FROM propiedad p
        LEFT JOIN localidad l ON p.localidad_id = l.id
        LEFT JOIN tipo_de_propiedad tp ON p."tipoDePropiedad_id" = tp.id
        LEFT JOIN estilo_arquitectonico ea ON p."estiloArquitectonico_id" = ea.id
        LEFT JOIN propiedad_tipo_visualizacion ptv ON p.id = ptv.propiedad_id
        LEFT JOIN tipo_de_visualizacion tv ON ptv.tipo_visualizacion_id = tv.id
        LEFT JOIN imagen2d i ON p.id = i.propiedad_id
        WHERE 1=1
        """

        conditions = []
        tipo_operacion_map = {"compra": "VENTA", "venta": "VENTA", "alquiler": "ALQUILER"}
        tipo_operacion = params.get("tipoOperacion")
        if tipo_operacion and tipo_operacion.lower() in tipo_operacion_map:
            conditions.append('p."tipoOperacion" = %s')
            sql_params.append(tipo_operacion_map[tipo_operacion.lower()])
        elif params.get("tipoPropiedad") and not tipo_operacion:
            conditions.append('p."tipoOperacion" IN (%s, %s)')
            sql_params.extend(["VENTA", "ALQUILER"])

        if params.get("tipoPropiedad"):
            conditions.append("unaccent(tp.nombre) ILIKE unaccent(%s)")
            sql_params.append(f"%{params['tipoPropiedad']}%")

        if params.get("localidad"):
            conditions.append("unaccent(l.nombre) ILIKE unaccent(%s)")
            sql_params.append(f"%{params['localidad']}%")

        if params.get("cantidadDormitorios") is not None:
            conditions.append('p."cantidadDormitorios" = %s')
            sql_params.append(params["cantidadDormitorios"])

        if params.get("cantidadBanios") is not None:
            conditions.append('p."cantidadBanios" = %s')
            sql_params.append(params["cantidadBanios"])

        if params.get("cantidadAmbientes") is not None:
            conditions.append('p."cantidadAmbientes" >= %s')
            sql_params.append(params["cantidadAmbientes"])

        if params.get("precioMax") is not None:
            conditions.append("p.precio <= %s")
            sql_params.append(params["precioMax"])

        if params.get("superficieMin") is not None:
            conditions.append("p.superficie >= %s")
            sql_params.append(params["superficieMin"])

        if params.get("estiloArquitectonico"):
            conditions.append("unaccent(ea.nombre) ILIKE unaccent(%s)")
            sql_params.append(f"%{params['estiloArquitectonico']}%")

        if params.get("tipoVisualizaciones"):
            conditions.append("tv.nombre = ANY(%s)")
            sql_params.append(params["tipoVisualizaciones"])

        if tags_visuales_solicitados:
            tag_conditions = []
            for tag_pair in tags_visuales_solicitados:
                parts = tag_pair.split(",")
                if len(parts) != 2:
                    continue
                fts_query_term = f"{parts[0].strip()} & {parts[1].strip()}"
                tag_conditions.append(
                    f"to_tsvector('{FTS_CONFIG}', i_sub.tags_visuales) @@ "
                    f"plainto_tsquery('{FTS_CONFIG}', %s)"
                )
                sql_params.append(fts_query_term)
            if tag_conditions:
                full_tag_condition = " OR ".join(tag_conditions)
                conditions.append(
                    f"p.id IN (SELECT i_sub.propiedad_id FROM imagen2d i_sub "
                    f"WHERE {full_tag_condition} GROUP BY i_sub.propiedad_id)"
                )

        if tags_visuales_excluir:
            tag_exclude_conditions = []
            for tag_pair in tags_visuales_excluir:
                parts = tag_pair.split(",")
                if len(parts) != 2:
                    continue
                fts_query_term = f"{parts[0].strip()} & {parts[1].strip()}"
                tag_exclude_conditions.append(
                    f"to_tsvector('{FTS_CONFIG}', i_sub_exc.tags_visuales) @@ "
                    f"plainto_tsquery('{FTS_CONFIG}', %s)"
                )
                sql_params.append(fts_query_term)
            if tag_exclude_conditions:
                full_exclude_condition = " OR ".join(tag_exclude_conditions)
                conditions.append(
                    f"p.id NOT IN (SELECT i_sub_exc.propiedad_id FROM imagen2d i_sub_exc "
                    f"WHERE {full_exclude_condition} GROUP BY i_sub_exc.propiedad_id)"
                )

        if conditions:
            sql_from += " AND " + " AND ".join(conditions)

        sql = sql_select + sql_from
        sql += ' GROUP BY p.id, l.nombre, tp.nombre, ea.nombre'
        sql += " ORDER BY rank DESC, p.precio ASC LIMIT 10"

        logger.info(f"SQL: {sql} | Params: {sql_params}")

        try:
            cur.execute(sql, sql_params)
            results = cur.fetchall()
        except psycopg2.ProgrammingError as e:
            logger.error(f"Error en la consulta SQL: {e}")
            results = []

        cur.close()
        return results
    finally:
        pg_pool.putconn(conn)


# --- Herramienta (tool) que el modelo puede llamar ---
def make_buscar_propiedades(session_id: str):
    """
    Fábrica de la herramienta `buscar_propiedades`, atada a una sesión puntual.
    Se necesita como closure porque el resultado completo (con todos los campos,
    para renderizar en el frontend) se guarda aparte del resumen que recibe el
    modelo para razonar.
    """

    def buscar_propiedades(
        tipoOperacion: Optional[str] = None,
        tipoPropiedad: Optional[str] = None,
        localidad: Optional[str] = None,
        cantidadDormitorios: Optional[int] = None,
        cantidadBanios: Optional[int] = None,
        cantidadAmbientes: Optional[int] = None,
        precioMax: Optional[float] = None,
        superficieMin: Optional[float] = None,
        estiloArquitectonico: Optional[str] = None,
        tipoVisualizaciones: Optional[List[str]] = None,
        tagsVisuales: Optional[List[str]] = None,
        tagsVisualesExcluir: Optional[List[str]] = None,
        contentFilter: Optional[str] = None,
    ) -> dict:
        """Busca propiedades en la base de datos de ArqView según los filtros indicados.

        Llamá a esta función con el conjunto COMPLETO de filtros vigentes según toda
        la conversación hasta ahora, no solo lo mencionado en el último mensaje del
        usuario. No incluyas un filtro que el usuario haya corregido o descartado.

        Args:
            tipoOperacion: 'venta' o 'alquiler'. Omitir si el usuario no lo especificó.
            tipoPropiedad: tipo de inmueble buscado, ej 'casa', 'departamento', 'terreno'.
            localidad: ciudad o localidad donde buscar, ej 'Villa María', 'Córdoba Capital'.
            cantidadDormitorios: cantidad exacta de dormitorios requerida.
            cantidadBanios: cantidad exacta de baños requerida.
            cantidadAmbientes: cantidad mínima de ambientes requerida.
            precioMax: precio máximo que el usuario está dispuesto a pagar.
            superficieMin: superficie mínima en metros cuadrados.
            estiloArquitectonico: estilo edilicio, ej 'moderno', 'colonial'.
            tipoVisualizaciones: tipos de vista o render deseados, ej ['3D', 'Planta'].
            tagsVisuales: frases "espacio + adjetivo" de ambientes deseados, ej
                ['cocina grande', 'living luminoso'].
            tagsVisualesExcluir: igual que tagsVisuales pero para lo que el usuario
                NO quiere, ej ['garage pequeño'].
            contentFilter: frase libre con equipamiento o contexto de uso deseado,
                ej 'pileta, asador, cerca del parque, ideal para estudiantes'.

        Returns:
            Diccionario con la cantidad de resultados y un resumen de hasta 10
            propiedades (id, nombre, precio, dormitorios, baños, superficie,
            localidad y una descripción breve). Esto es SOLO para que vos razones
            y decidas qué hacer — no le muestra nada al usuario todavía. Si querés
            mostrarle alguna de estas propiedades como tarjeta, llamá después a
            `mostrar_propiedades` con los IDs que correspondan.
        """
        try:
            params = {
                "tipoOperacion": tipoOperacion,
                "tipoPropiedad": tipoPropiedad,
                "localidad": localidad,
                "cantidadDormitorios": cantidadDormitorios,
                "cantidadBanios": cantidadBanios,
                "cantidadAmbientes": cantidadAmbientes,
                "precioMax": precioMax,
                "superficieMin": superficieMin,
                "estiloArquitectonico": estiloArquitectonico,
                "tipoVisualizaciones": tipoVisualizaciones,
                "tagsVisuales": tagsVisuales,
                "tagsVisualesExcluir": tagsVisualesExcluir,
                "contentFilter": contentFilter,
            }
            params = {k: v for k, v in params.items() if v is not None}

            logger.info(f"[{session_id}] buscar_propiedades llamada con: {params}")
            raw_results = query_properties(params)
            full_results = [to_jsonable(dict(r)) for r in raw_results]

            # OJO: acá NO se setea last_results. buscar_propiedades solo consigue
            # datos; nunca decide por sí sola qué se muestra como tarjeta. Eso lo
            # decide el modelo explícitamente llamando a mostrar_propiedades con
            # los IDs que realmente quiera mostrarle al usuario.
            known = SESSIONS[session_id].setdefault("known_properties", {})
            for prop in full_results:
                pid = prop.get("id")
                if pid is not None:
                    known[pid] = prop

            summary = []
            for i, prop in enumerate(full_results, 1):
                summary.append({
                    "nro": i,
                    "id": prop.get("id"),
                    "nombre": prop.get("nombre"),
                    "precio": prop.get("precio"),
                    "tipoOperacion": prop.get("tipoOperacion"),
                    "dormitorios": prop.get("cantidadDormitorios"),
                    "banios": prop.get("cantidadBanios"),
                    "superficie": prop.get("superficie"),
                    "localidad": prop.get("localidad_nombre"),
                    "descripcion_breve": (prop.get("descripcion") or "")[:200],
                })

            return {"cantidad_resultados": len(full_results), "propiedades": summary}
        except Exception as e:
            logger.error(f"[{session_id}] Error en buscar_propiedades: {e}", exc_info=True)
            return {"error": "Ocurrió un error al buscar en la base de datos."}

    return buscar_propiedades


def make_mostrar_propiedades(session_id: str):
    """
    Fábrica de la herramienta `mostrar_propiedades`, atada a una sesión puntual.
    No consulta la base de datos: solo recupera propiedades que ya se encontraron
    antes en esta conversación (guardadas en `known_properties`) para volver a
    mostrarlas como tarjetas.
    """

    def mostrar_propiedades(ids: List[int]) -> dict:
        """Muestra como tarjetas propiedades puntuales para el usuario. Es la ÚNICA forma de mostrarle propiedades visualmente.

        Llamala después de `buscar_propiedades` (con los IDs que decidas que
        realmente le sirven al usuario, no necesariamente todos los resultados) o
        directamente cuando el usuario pida ver de nuevo propiedades que ya
        aparecieron antes en esta conversación. Por ejemplo: si buscaste para
        chequear si alguna propiedad tenía pileta y solo una de cinco resultados la
        tiene, llamá a esta función solo con el ID de esa una — no con las cinco.

        Args:
            ids: lista de IDs de propiedades (tal como vinieron en los resultados
                de una llamada anterior a `buscar_propiedades` en esta misma
                conversación) que querés mostrar ahora.

        Returns:
            Diccionario con la cantidad de propiedades efectivamente encontradas y
            mostradas (puede ser menor a la cantidad de IDs pedidos si alguno ya
            no está disponible).
        """
        known = SESSIONS.get(session_id, {}).get("known_properties", {})
        found = [known[i] for i in ids if i in known]
        SESSIONS[session_id]["last_results"] = found
        return {"cantidad_mostradas": len(found)}

    return mostrar_propiedades


def obtener_valores_referencia() -> dict:
    """Devuelve las localidades, tipos de propiedad y estilos arquitectónicos que existen actualmente en la base de datos de ArqView.

    Llamá a esta función (antes de `buscar_propiedades`) si no estás seguro de la
    ortografía exacta de una localidad, tipo de propiedad o estilo que mencionó el
    usuario, para usar el valor tal como está cargado en la base en vez de
    adivinarlo. No hace falta llamarla si ya conocés el valor correcto por el
    historial de la conversación.

    Returns:
        Diccionario con tres listas de strings: `localidades`, `tipos_propiedad` y
        `estilos_arquitectonicos`.
    """
    if pg_pool is None:
        return {"error": "No hay conexión disponible a la base de datos."}
    conn = pg_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT nombre FROM localidad ORDER BY nombre;")
        localidades = [r[0] for r in cur.fetchall()]
        cur.execute("SELECT DISTINCT nombre FROM tipo_de_propiedad ORDER BY nombre;")
        tipos_propiedad = [r[0] for r in cur.fetchall()]
        cur.execute("SELECT DISTINCT nombre FROM estilo_arquitectonico ORDER BY nombre;")
        estilos = [r[0] for r in cur.fetchall()]
        cur.close()
        return {
            "localidades": localidades,
            "tipos_propiedad": tipos_propiedad,
            "estilos_arquitectonicos": estilos,
        }
    except Exception as e:
        logger.error(f"Error en obtener_valores_referencia: {e}", exc_info=True)
        return {"error": "No se pudieron obtener los valores de referencia."}
    finally:
        pg_pool.putconn(conn)


def get_or_create_session(session_id: str) -> dict:
    if session_id not in SESSIONS:
        SESSIONS[session_id] = {"last_results": [], "known_properties": {}}
        buscar_fn = make_buscar_propiedades(session_id)
        mostrar_fn = make_mostrar_propiedades(session_id)
        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            system_instruction=SYSTEM_INSTRUCTION,
            tools=[buscar_fn, mostrar_fn, obtener_valores_referencia],
        )
        chat = model.start_chat(enable_automatic_function_calling=True)
        SESSIONS[session_id]["chat"] = chat
    return SESSIONS[session_id]


# --- Endpoint Principal ---
@app.route("/chat", methods=["POST"])
def chat():
    session_id = None
    try:
        data = request.json or {}
        user_query = data.get("message", "")
        session_id = data.get("session_id") or str(uuid.uuid4())

        if not user_query:
            return jsonify({"error": "Se requiere el campo 'message'", "session_id": session_id}), 400

        logger.info(f"Consulta del usuario (session_id: {session_id}): {user_query}")

        session = get_or_create_session(session_id)
        session["last_results"] = []  # se completa solo si el modelo busca en este turno

        response = session["chat"].send_message(user_query)
        bot_response = response.text

        properties = session["last_results"]

        return jsonify({
            "response": bot_response,
            "properties": properties,
            "session_id": session_id,
        })

    except Exception as e:
        logger.error(f"Error general en el chat: {e}", exc_info=True)
        return jsonify({
            "error": "Ocurrió un error interno del servidor.",
            "session_id": session_id,
        }), 500


@app.route("/reset", methods=["POST"])
def reset_session():
    """Permite al frontend arrancar una conversación nueva de forma explícita
    (por ejemplo con un botón 'Nueva búsqueda'), sin depender de que el usuario
    lo pida en lenguaje natural."""
    data = request.json or {}
    session_id = data.get("session_id")
    if session_id and session_id in SESSIONS:
        del SESSIONS[session_id]
    new_session_id = str(uuid.uuid4())
    return jsonify({"session_id": new_session_id})


if __name__ == "__main__":
    if pg_pool:
        atexit.register(pg_pool.closeall)
    app.run(host="0.0.0.0", port=5001, debug=True)