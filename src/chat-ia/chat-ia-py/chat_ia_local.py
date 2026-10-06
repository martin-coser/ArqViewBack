"""
ArqView - Backend local con Qwen 2.5 (Ollama)
Replicación de la lógica de Function Calling de Gemini (chat_ia.py), corregida
para las particularidades de un modelo local chico servido por Ollama:

- Sin coerción automática de tipos (se sanea cada argumento de herramienta).
- Contexto limitado por defecto (se fija num_ctx y se recorta el historial).
- Tool calls que a veces salen como texto JSON en `content` (parser de respaldo).
- Mensajes `tool` con `tool_name`, para que el modelo asocie resultado y llamada.
- Respuesta final garantizada (llamada de cierre sin herramientas + mensaje de respaldo).
"""

from flask import Flask, request, jsonify
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
import ollama
import logging
import os
import re
import uuid
import json
import atexit
import threading
import time
import difflib
import unicodedata
from decimal import Decimal
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

# --- Configuración Inicial ---
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
app = Flask(__name__)

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
NUM_CTX = int(os.getenv("OLLAMA_NUM_CTX", "8192"))
MAX_TURNS = int(os.getenv("MAX_TOOL_TURNS", "6"))
MAX_HISTORY_MSGS = int(os.getenv("MAX_HISTORY_MSGS", "40"))
# Los resultados de buscar_propiedades se muestran solos como tarjetas. El modelo puede
# recortarlos después con mostrar_propiedades (lista vacía = ninguna tarjeta).
AUTO_SHOW_ON_SEARCH = os.getenv("AUTO_SHOW_ON_SEARCH", "1") == "1"
MAX_RESULTS = int(os.getenv("MAX_RESULTS", "20"))

OLLAMA_OPTIONS = {"num_ctx": NUM_CTX, "temperature": 0.2}

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
SESSIONS: Dict[str, Dict[str, Any]] = {}
SESSIONS_LOCK = threading.Lock()

SYSTEM_INSTRUCTION = """
Sos el asistente virtual de ArqView, una plataforma de búsqueda de propiedades
inmobiliarias (venta y alquiler). Tu única función es ayudar a los usuarios a
encontrar propiedades que se ajusten a lo que buscan, conversando de forma natural.

Contás con tres herramientas:
- `buscar_propiedades`: ejecuta una búsqueda contra la base de datos y te devuelve
  los resultados para que los analices. Los resultados se le muestran AUTOMÁTICAMENTE
  al usuario como tarjetas visuales: no hace falta pedirle permiso para mostrarlos.
- `mostrar_propiedades`: sirve para CAMBIAR qué tarjetas ve el usuario. Recibe una
  lista de IDs (de una búsqueda de este turno o de una anterior) y deja visibles solo
  esas propiedades. Con una lista vacía no se muestra ninguna tarjeta. No vuelve a
  consultar la base.
- `obtener_valores_referencia`: te muestra las localidades (con su cantidad de
  propiedades), tipos de propiedad y estilos arquitectónicos que existen realmente
  en la base de datos.

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

3. Mostrar es automático: después de `buscar_propiedades` el usuario ya ve TODOS los
   resultados como tarjetas. Solo llamá a `mostrar_propiedades` cuando necesites
   cambiar lo que se ve:
     - Si el pedido era una búsqueda general ("busco un depto en Villa María"), NO
       hace falta llamarla: ya se ven todos los resultados.
     - Si el pedido era una pregunta puntual sobre algo específico (ej. "¿hay alguna
       con pileta?", "¿esta propiedad tiene asador?") y buscaste para chequearlo,
       llamá a `mostrar_propiedades` con SOLO los IDs que realmente responden esa
       pregunta, o con una lista vacía si ninguna aplica, y contestá en texto.

4. Si el usuario pregunta o pide ver de nuevo propiedades que YA aparecieron antes
   en esta conversación (ej. "¿cuáles son esas casas?", "mostrame las que tienen
   pileta", "la segunda y la cuarta", "¿cuál es la más barata?"), NO vuelvas a
   llamar a `buscar_propiedades`. Identificá los IDs correspondientes usando el
   historial y llamá directamente a `mostrar_propiedades` con esos IDs.

5. Solo si el usuario pide de manera explícita reiniciar la búsqueda desde cero,
   ignorá los filtros anteriores. Nunca digas que vas a reiniciar o empezar de nuevo
   si el usuario no lo pidió.

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
   volvés a mostrar propiedades ya conocidas), tu texto debe ser breve (1-2 líneas):
   NO repitas nombre, precio, dormitorios, baños ni otros datos que ya se ven en las
   tarjetas. Alcanza con un comentario general y una pregunta de cómo seguir.

11. Si el usuario pide explícitamente un análisis más profundo sobre las propiedades
   mostradas (ej. "dame un detalle de cada una", "qué recomendás", "pros y contras",
   "cuál te parece mejor y por qué"), tu texto SÍ debe ser sustancial. Para cada
   propiedad relevante, escribí algunas líneas con información que la tarjeta NO
   muestra: para qué tipo de persona o situación es ideal, qué conviene chequear
   antes de decidir (antigüedad, estado, zona, gastos, dudas para confirmar con la
   inmobiliaria) y cómo se compara con las otras opciones. No repitas precio,
   dormitorios o m². Mantené las tarjetas visibles (llamando a
   `mostrar_propiedades`) salvo que el usuario pida no verlas.

12. Para saber si tenemos propiedades disponibles en una localidad, llamá a
    `obtener_valores_referencia`: ahí figura cuántas propiedades tiene cada una.

13. Usá siempre el mecanismo de llamadas a herramientas. NUNCA escribas el JSON de
    una herramienta dentro de tu respuesta de texto al usuario.

14. Apenas tengas tipo de propiedad Y localidad, llamá a `buscar_propiedades` EN ESE
    MISMO TURNO. NO pidas precio, dormitorios ni otros detalles opcionales antes de
    buscar: primero mostrá resultados y después ofrecé refinar. Si el usuario dice
    "ningún otro detalle", "no", "dale" o "sí" ante tu pregunta, buscá directamente
    con lo que ya sabés.

15. NUNCA anuncies que vas a buscar ("estoy buscando", "un momento", "espere") ni le
    pidas al usuario que espere. Las búsquedas son instantáneas: no hay nada que
    anunciar. Llamá a la herramienta y recién cuando tengas el resultado respondé.

16. Hablale de "vos" (voseo rioplatense): "querés", "tenés", "mirá". Nunca de "tú".

17. NUNCA le preguntes al usuario si quiere ver las propiedades ("¿te interesa
    verlas?", "¿querés que te las muestre?") ni le avises que tenés propiedades sin
    mostrarlas. Si ya hay tipo y localidad, buscá y las tarjetas aparecen solas.
    Nunca digas que no encontraste algo sin haber llamado antes a la herramienta.

18. Si el usuario pide varias localidades ("ambos lugares", "las dos", "en todas"),
    pasá la lista completa en `localidades` en UNA sola llamada a `buscar_propiedades`.

19. NUNCA escribas propiedades, nombres ni precios que no vengan del resultado de una
    herramienta. Si no llamaste a una herramienta en este turno, no listes propiedades.

20. Si el usuario pide ver de nuevo la tarjeta, las fotos o los detalles de propiedades
    que ya aparecieron (aunque vengan hablando solo en texto), SIEMPRE llamá a
    `mostrar_propiedades` con sus IDs. Las tarjetas son lo único que tiene las fotos y
    el botón "Ver detalles": describirlas en texto no las reemplaza.
""".strip()

# --- Esquema de Herramientas para Ollama / Qwen ---
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "buscar_propiedades",
            "description": (
                "Busca propiedades en la base de datos de ArqView según los filtros "
                "indicados. Llamala con el conjunto COMPLETO de filtros vigentes según "
                "toda la conversación, no solo lo del último mensaje. No incluyas un "
                "filtro que el usuario haya corregido o descartado. Devuelve datos "
                "para que razones, y TODOS los resultados se muestran automáticamente al usuario como tarjetas."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "tipoOperacion": {
                        "type": "string", "enum": ["venta", "alquiler"],
                        "description": "'venta' o 'alquiler'. Omitir si el usuario no lo especificó.",
                    },
                    "tipoPropiedad": {
                        "type": "string",
                        "description": "UN solo tipo de inmueble, en singular, ej 'casa', 'departamento', 'terreno'.",
                    },
                    "localidades": {
                        "type": "array", "items": {"type": "string"},
                        "description": (
                            "Una o varias localidades donde buscar, ej ['Villa María'] o "
                            "['Villa María', 'General Deheza'] si el usuario pide varias "
                            "('ambos lugares', 'las dos'). Siempre en UNA sola llamada."
                        ),
                    },
                    "cantidadDormitorios": {
                        "type": "integer",
                        "description": "Cantidad exacta de dormitorios requerida.",
                    },
                    "cantidadBanios": {
                        "type": "integer",
                        "description": "Cantidad exacta de baños requerida.",
                    },
                    "cantidadAmbientes": {
                        "type": "integer",
                        "description": "Cantidad mínima de ambientes requerida.",
                    },
                    "precioMax": {
                        "type": "number",
                        "description": "Precio máximo que el usuario está dispuesto a pagar (número, sin símbolos).",
                    },
                    "superficieMin": {
                        "type": "number",
                        "description": "Superficie mínima en metros cuadrados.",
                    },
                    "estiloArquitectonico": {
                        "type": "string",
                        "description": "Estilo edilicio, ej 'moderno', 'colonial'.",
                    },
                    "tipoVisualizaciones": {
                        "type": "array", "items": {"type": "string"},
                        "description": "Tipos de vista o render deseados, ej ['3D', 'Planta'].",
                    },
                    "tagsVisuales": {
                        "type": "array", "items": {"type": "string"},
                        "description": "Frases 'espacio + adjetivo' de ambientes deseados, ej ['cocina grande', 'living luminoso'].",
                    },
                    "tagsVisualesExcluir": {
                        "type": "array", "items": {"type": "string"},
                        "description": "Igual que tagsVisuales pero para lo que el usuario NO quiere, ej ['garage pequeño'].",
                    },
                    "contentFilter": {
                        "type": "string",
                        "description": "Frase libre con equipamiento o contexto de uso deseado, ej 'pileta, asador, cerca del parque'. Solo ordena por relevancia, no filtra.",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "mostrar_propiedades",
            "description": (
                "Define qué tarjetas ve el usuario. buscar_propiedades ya muestra todos sus "
                "resultados; usá esta herramienta solo para dejar visibles ÚNICAMENTE ciertos "
                "IDs (lista vacía = ninguna tarjeta) o para volver a mostrar propiedades que "
                "ya aparecieron antes en la conversación."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "ids": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "description": "IDs de propiedades (tal como vinieron en resultados previos de buscar_propiedades) a mostrar.",
                    }
                },
                "required": ["ids"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_valores_referencia",
            "description": (
                "Devuelve las localidades (con su cantidad de propiedades), tipos de propiedad "
                "y estilos arquitectónicos que existen actualmente en la base de datos. Usala "
                "si dudás de la ortografía de un valor o para saber si hay propiedades en una localidad."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]
TOOL_NAMES = {t["function"]["name"] for t in TOOLS_SCHEMA}


# --- Saneamiento de argumentos (los modelos locales no respetan tipos al 100%) ---
_NULL_STRINGS = {"", "null", "none", "n/a", "na", "undefined", "-"}


def _clean_str(v) -> Optional[str]:
    if v is None:
        return None
    s = str(v).strip()
    return None if s.lower() in _NULL_STRINGS else s


def _to_int(v) -> Optional[int]:
    if v is None or isinstance(v, bool):
        return None
    try:
        return int(float(str(v).strip().replace(",", ".")))
    except (ValueError, TypeError):
        return None


def _to_float(v) -> Optional[float]:
    if v is None or isinstance(v, bool):
        return None
    try:
        return float(str(v).strip().replace(",", "."))
    except (ValueError, TypeError):
        return None


def _to_str_list(v) -> Optional[List[str]]:
    if v is None:
        return None
    if isinstance(v, str):
        s = v.strip()
        try:
            parsed = json.loads(s)
            v = parsed if isinstance(parsed, list) else [s]
        except (json.JSONDecodeError, ValueError):
            v = [x for x in s.split(",")]
    if not isinstance(v, (list, tuple)):
        v = [v]
    out = [c for c in (_clean_str(x) for x in v) if c]
    return out or None


def parse_raw_args(raw) -> dict:
    """Los argumentos pueden venir como dict o como string JSON."""
    if raw is None:
        return {}
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except (json.JSONDecodeError, ValueError):
            return {}
    return dict(raw) if isinstance(raw, dict) else {}


def sanitize_search_args(raw) -> dict:
    a = parse_raw_args(raw)
    out: Dict[str, Any] = {}

    for k in ("estiloArquitectonico", "contentFilter"):
        s = _clean_str(a.get(k))
        if s:
            out[k] = s

    # Tipo y localidades se llevan al nombre EXACTO de la base ("departamentos" -> "Departamento").
    ref = get_reference_cache() or {}
    canon_t = []
    for t in _to_str_list(a.get("tipoPropiedad")) or []:
        canon_t.append(detect_tipo(_norm(t).split(), ref.get("tipos_propiedad", [])) or t)
    if canon_t:
        out["tipoPropiedad"] = list(dict.fromkeys(canon_t))
    canon_l = []
    raw_locs = (_to_str_list(a.get("localidades")) or []) + (_to_str_list(a.get("localidad")) or [])
    for l in raw_locs:
        canon_l.extend(detect_localidades(_norm(l).split(), ref.get("localidades", [])) or [l])
    if canon_l:
        out["localidades"] = list(dict.fromkeys(canon_l))

    op = _clean_str(a.get("tipoOperacion"))
    if op and op.lower() in ("venta", "compra", "alquiler"):
        out["tipoOperacion"] = op.lower()

    for k in ("cantidadDormitorios", "cantidadBanios", "cantidadAmbientes"):
        n = _to_int(a.get(k))
        if n is not None:
            out[k] = n

    for k in ("precioMax", "superficieMin"):
        n = _to_float(a.get(k))
        if n is not None:
            out[k] = n

    for k in ("tipoVisualizaciones", "tagsVisuales", "tagsVisualesExcluir"):
        lst = _to_str_list(a.get(k))
        if lst:
            out[k] = lst

    return out


def sanitize_ids(raw) -> List[int]:
    a = parse_raw_args(raw)
    ids = a.get("ids", [])
    if isinstance(ids, str):
        try:
            ids = json.loads(ids)
        except (json.JSONDecodeError, ValueError):
            ids = re.findall(r"\d+", ids)
    if not isinstance(ids, (list, tuple)):
        ids = [ids]
    out = []
    for i in ids:
        n = _to_int(i)
        if n is not None and n not in out:
            out.append(n)
    return out


# --- Auxiliares de Base de Datos ---
def normalize_visual_tags(tags_list: Optional[List[str]]) -> List[str]:
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
    clean = {}
    for k, v in row.items():
        clean[k] = float(v) if isinstance(v, Decimal) else v
    return clean


def query_properties(params: dict) -> list:
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
            "array_agg(DISTINCT i.tags_visuales) as tags_visuales_agregados",
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

        tipos = params.get("tipoPropiedad") or []
        if isinstance(tipos, str):
            tipos = [tipos]
        if tipos:
            conditions.append("(" + " OR ".join(["unaccent(tp.nombre) ILIKE unaccent(%s)"] * len(tipos)) + ")")
            sql_params.extend(f"%{t}%" for t in tipos)

        locs = params.get("localidades") or ([params["localidad"]] if params.get("localidad") else [])
        if isinstance(locs, str):
            locs = [locs]
        if locs:
            conditions.append("(" + " OR ".join(["unaccent(l.nombre) ILIKE unaccent(%s)"] * len(locs)) + ")")
            sql_params.extend(f"%{x}%" for x in locs)

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
        sql += " GROUP BY p.id, l.nombre, tp.nombre, ea.nombre"
        sql += f" ORDER BY rank DESC, p.precio ASC LIMIT {int(MAX_RESULTS)}"

        logger.info(f"SQL: {sql} | Params: {sql_params}")

        cur.execute(sql, sql_params)
        results = cur.fetchall()
        cur.close()
        return results
    finally:
        # Siempre cerramos la transacción: si la consulta falló, la conexión no
        # vuelve al pool en estado "aborted".
        try:
            conn.rollback()
        except Exception:
            pass
        pg_pool.putconn(conn)


# --- Funciones de Ejecución de Herramientas ---
def ejec_buscar_propiedades(session_id: str, raw_args) -> dict:
    try:
        args = sanitize_search_args(raw_args)
        logger.info(f"[{session_id}] buscar_propiedades con: {args}")
        raw_results = query_properties(args)
        full_results = [to_jsonable(dict(r)) for r in raw_results]

        session = SESSIONS[session_id]
        known = session.setdefault("known_properties", {})
        for prop in full_results:
            pid = prop.get("id")
            if pid is not None:
                known[pid] = prop
        session["last_search_ids"] = [p.get("id") for p in full_results if p.get("id") is not None]
        session["searched_this_turn"] = True
        session["last_search_pair"] = (
            [_norm(t) for t in args.get("tipoPropiedad", [])],
            [_norm(x) for x in args.get("localidades", [])],
        )
        if AUTO_SHOW_ON_SEARCH:
            if session.get("auto_shown"):
                _add_to_last_results(session, full_results)  # varias búsquedas en un turno se acumulan
            else:
                session["last_results"] = list(full_results)
                session["auto_shown"] = True

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
                "direccion": prop.get("direccion"),
                "estilo": prop.get("estilo_arquitectonico_nombre"),
                "tags_visuales": prop.get("tags_visuales_agregados"),
                "visualizaciones": prop.get("tipo_visualizaciones_nombres"),
                "coincide_contenido": (prop.get("rank") or 0) > 0,
                "descripcion_breve": (prop.get("descripcion") or "")[:250],
            })

        result: Dict[str, Any] = {"cantidad_resultados": len(full_results), "propiedades": summary}
        if not full_results:
            result["nota"] = "No hubo resultados: decilo con naturalidad y ofrecé ajustar los filtros."
        elif AUTO_SHOW_ON_SEARCH:
            result["nota"] = (
                f"Estas {len(full_results)} propiedades YA se muestran al usuario como tarjetas. "
                "Si el usuario hizo una pregunta puntual y solo algunas aplican, llamá a "
                "mostrar_propiedades con esos IDs (lista vacía si ninguna aplica). Si no, "
                "respondé en 1 o 2 líneas, hablando de vos, sin listar propiedades ni precios."
            )
        if len(full_results) >= MAX_RESULTS:
            result["aviso"] = "Puede haber más resultados que los listados; ofrecé filtrar (precio, dormitorios, etc.)."
        return result
    except Exception as e:
        logger.error(f"[{session_id}] Error en buscar_propiedades: {e}", exc_info=True)
        return {"error": "Ocurrió un error al buscar en la base de datos."}


def _add_to_last_results(session: dict, props: List[dict]) -> None:
    current = session.setdefault("last_results", [])
    seen = {p.get("id") for p in current}
    for p in props:
        if p.get("id") not in seen:
            current.append(p)
            seen.add(p.get("id"))


def ejec_mostrar_propiedades(session_id: str, raw_args) -> dict:
    ids = sanitize_ids(raw_args)
    session = SESSIONS[session_id]
    known = session.get("known_properties", {})
    found = [known[i] for i in ids if i in known]
    missing = [i for i in ids if i not in known]
    if session.get("auto_shown"):
        # La primera llamada a mostrar_propiedades REEMPLAZA lo que se había auto-mostrado.
        session["last_results"] = []
        session["auto_shown"] = False
    _add_to_last_results(session, found)
    result: Dict[str, Any] = {"cantidad_mostradas": len(found)}
    if found:
        result["nota"] = (
            "Las tarjetas YA son visibles para el usuario. Respondé en 1 o 2 líneas, hablando de "
            "vos, SIN listar propiedades, nombres ni precios (salvo que el usuario haya pedido "
            "un análisis o detalle). Terminá preguntando cómo seguir."
        )
    if missing:
        result["ids_no_encontrados"] = missing
    return result


def ejec_obtener_valores_referencia() -> dict:
    if pg_pool is None:
        return {"error": "No hay conexión disponible a la base de datos."}
    conn = pg_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT l.nombre, COUNT(p.id) FROM localidad l "
            "LEFT JOIN propiedad p ON p.localidad_id = l.id "
            "GROUP BY l.nombre ORDER BY l.nombre;"
        )
        filas = cur.fetchall()
        localidades = [r[0] for r in filas]
        propiedades_por_localidad = {r[0]: r[1] for r in filas}
        cur.execute("SELECT DISTINCT nombre FROM tipo_de_propiedad ORDER BY nombre;")
        tipos_propiedad = [r[0] for r in cur.fetchall()]
        cur.execute("SELECT DISTINCT nombre FROM estilo_arquitectonico ORDER BY nombre;")
        estilos = [r[0] for r in cur.fetchall()]
        cur.close()
        return {
            "localidades": localidades,
            "propiedades_por_localidad": propiedades_por_localidad,
            "tipos_propiedad": tipos_propiedad,
            "estilos_arquitectonicos": estilos,
        }
    except Exception as e:
        logger.error(f"Error en obtener_valores_referencia: {e}", exc_info=True)
        return {"error": "No se pudieron obtener los valores de referencia."}
    finally:
        try:
            conn.rollback()
        except Exception:
            pass
        pg_pool.putconn(conn)


def run_tool(session_id: str, name: str, raw_args) -> dict:
    if name == "buscar_propiedades":
        return ejec_buscar_propiedades(session_id, raw_args)
    if name == "mostrar_propiedades":
        return ejec_mostrar_propiedades(session_id, raw_args)
    if name == "obtener_valores_referencia":
        return ejec_obtener_valores_referencia()
    return {"error": f"Herramienta '{name}' desconocida."}


# --- Auxiliares del bucle con Ollama ---
def msg_to_dict(msg) -> dict:
    """Convierte el Message de ollama (pydantic) a dict plano serializable."""
    if hasattr(msg, "model_dump"):
        d = msg.model_dump(exclude_none=True)
    else:
        d = dict(msg)
    d.setdefault("content", "")
    return d


def extract_text_tool_call(content: Optional[str]) -> Optional[List[dict]]:
    """Qwen a veces escribe la llamada como JSON en `content` en vez de usar tool_calls."""
    if not content:
        return None
    txt = content.strip()
    txt = re.sub(r"</?tool_call>", "", txt)
    txt = re.sub(r"^```(?:json)?\s*|\s*```$", "", txt).strip()
    try:
        obj = json.loads(txt)
    except (json.JSONDecodeError, ValueError):
        return None
    objs = obj if isinstance(obj, list) else [obj]
    calls = []
    for o in objs:
        if isinstance(o, dict) and o.get("name") in TOOL_NAMES:
            calls.append({"function": {"name": o["name"], "arguments": o.get("arguments") or {}}})
    return calls or None


# --- Detección de datos mínimos (tipo + localidad) en lo que escribe el usuario ---
REF_CACHE: Dict[str, Any] = {"ts": 0.0, "data": None}
REF_TTL = 300  # segundos
RESET_RE = re.compile(
    r"\b(desde cero|(empez\w*|empecemos) de nuevo|olvid\w* (de )?(todo|lo anterior)|"
    r"nueva busqueda|borr\w* todo)\b"
)
TIPO_SYNONYMS = {"depto": "departamento", "dpto": "departamento", "depa": "departamento", "lote": "terreno"}
# Palabras de conversación que se parecen a nombres de localidades ("gracias" ~ "Alta Gracia").
CONVERSATIONAL_WORDS = {"gracia", "gracias", "perfecto", "excelente", "genial", "bueno", "buena", "buenas",
                        "buenos", "listo", "claro", "opcion", "opciones", "interesante", "fantastico",
                        "maravilla", "hola", "chau", "adios", "dale"}
LOC_PREPOSITIONS = {"en", "de", "del", "a", "por", "cerca", "zona", "desde", "hacia", "para", "entre", "y", "o"}
THANKS_RE = re.compile(r"\b(gracias|chau|adios|hasta luego|nos vemos)\b")
GENERIC_LOC_WORDS = {"general", "villa", "santa", "santo", "ciudad", "barrio", "puerto", "parque",
                     "capital", "pueblo", "colonia", "cuarto", "cuartos", "centro", "grande"}


def _norm(s) -> str:
    """minúsculas, sin tildes ni signos, espacios colapsados."""
    s = unicodedata.normalize("NFD", str(s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]+", " ", s)).strip()


def _singular(w: str) -> str:
    return w[:-1] if len(w) > 3 and w.endswith("s") else w


def get_reference_cache() -> Optional[dict]:
    now = time.time()
    if REF_CACHE["data"] and now - REF_CACHE["ts"] < REF_TTL:
        return REF_CACHE["data"]
    data = ejec_obtener_valores_referencia()
    if "error" in data:
        return REF_CACHE["data"]  # puede ser None; se reintenta en el próximo turno
    REF_CACHE.update(ts=now, data=data)
    return data


def detect_localidades(words: List[str], localidades: List[str]) -> List[str]:
    """Todas las localidades de la base que aparecen (aun con typos) en las palabras dadas."""
    found = []
    for loc in localidades:
        loc_norm = _norm(loc)
        n = len(loc_norm.split())
        if not n:
            continue
        best = 0.0
        for size in {n - 1, n, n + 1}:  # tolera una palabra de más o de menos
            if size < 1 or size > len(words):
                continue
            for i in range(len(words) - size + 1):
                best = max(best, difflib.SequenceMatcher(None, " ".join(words[i:i + size]), loc_norm).ratio())
        if best >= 0.84:
            found.append(loc)
            continue
        # Respaldo: una palabra distintiva sola ("deheza" para "General Deheza"). Solo cuenta si
        # viene después de una preposición ("en deheza") o si el mensaje es una respuesta corta
        # ("Deheza"), y nunca con palabras de cortesía como "gracias".
        matched = False
        for lw in loc_norm.split():
            if len(lw) < 6 or lw in GENERIC_LOC_WORDS:
                continue
            for i, w in enumerate(words):
                if difflib.SequenceMatcher(None, w, lw).ratio() < 0.88:
                    continue
                prev_ok = i > 0 and words[i - 1] in LOC_PREPOSITIONS
                if w in CONVERSATIONAL_WORDS and not prev_ok:
                    continue
                if prev_ok or len(words) <= 4:
                    matched = True
                    break
            if matched:
                break
        if matched:
            found.append(loc)
    return found


def detect_tipo(words: List[str], tipos: List[str]) -> Optional[str]:
    sing_text = " ".join(_singular(TIPO_SYNONYMS.get(w, w)) for w in words)
    items = sorted(((_norm(t), t) for t in tipos), key=lambda x: -len(x[0]))
    for tn, orig in items:  # tipos de varias palabras primero ("casa quinta")
        if " " in tn and " ".join(_singular(x) for x in tn.split()) in sing_text:
            return orig
    for w in words:
        ws = _singular(TIPO_SYNONYMS.get(w, w))
        for tn, orig in items:
            if " " in tn:
                continue
            ts = _singular(tn)
            if ws == ts or (len(ws) >= 5 and difflib.SequenceMatcher(None, ws, ts).ratio() >= 0.85):
                return orig
    return None


def detect_operacion(text_norm: str) -> Optional[str]:
    if re.search(r"\balquil\w*", text_norm):
        return "alquiler"
    if re.search(r"\b(compr(ar|arlo|arla|ando|a|o)|venta)\b", text_norm):
        return "venta"
    return None


BOTH_RE = re.compile(r"\b(ambos|ambas|los dos|las dos)\b")


def update_slots(session: dict, text: str, prev_assistant: str = "") -> None:
    """Mantiene tipo/localidades/operación vigentes según lo que dijo el usuario (gana lo último)."""
    slots = session.setdefault("slots", {})
    tn = _norm(text)
    if RESET_RE.search(tn):
        slots.clear()
        session["last_search_pair"] = None
    ref = get_reference_cache()
    if not ref:
        return
    words = tn.split()
    locs = detect_localidades(words, ref.get("localidades", []))
    if not locs and BOTH_RE.search(tn) and prev_assistant:
        # "¿Me mostrás en ambos lugares?": ambos = las localidades que mencionó el asistente.
        locs = detect_localidades(_norm(prev_assistant).split(), ref.get("localidades", []))
    tipo = detect_tipo(words, ref.get("tipos_propiedad", []))
    op = detect_operacion(tn)
    if locs:
        slots["localidades"] = locs
    if tipo:
        slots["tipo"] = tipo
    if op:
        slots["operacion"] = op
    logger.info(f"Slots vigentes: {slots}")


def _sing_phrase(s: str) -> str:
    return " ".join(_singular(w) for w in _norm(s).split())


def search_covers_slots(session: dict) -> bool:
    """¿La última búsqueda ejecutada ya corresponde al tipo + localidades vigentes?"""
    slots = session.get("slots", {})
    last = session.get("last_search_pair")
    if not last or not slots.get("tipo") or not slots.get("localidades"):
        return False
    last_tipos = [_sing_phrase(t) for t in last[0]]
    last_locs = list(last[1])

    def close(a: str, b: str) -> bool:
        return bool(a) and bool(b) and (a in b or b in a)

    tipo = _sing_phrase(slots["tipo"])
    tipo_ok = any(close(tipo, t) for t in last_tipos)
    locs_ok = all(any(close(_norm(sl), l) for l in last_locs) for sl in slots["localidades"])
    return tipo_ok and locs_ok


def build_slots_nudge(slots: dict) -> str:
    locs = ", ".join(f"'{x}'" for x in slots["localidades"])
    op = f", tipoOperacion='{slots['operacion']}'" if slots.get("operacion") else ""
    return (
        f"[Sistema] El usuario ya indicó tipo de propiedad ({slots['tipo']}) y localidades "
        f"({', '.join(slots['localidades'])}). No preguntes nada ni pidas permiso para mostrar: "
        f"llamá AHORA a buscar_propiedades con tipoPropiedad='{slots['tipo']}', "
        f"localidades=[{locs}]{op} y los demás filtros vigentes de la conversación, en UNA sola "
        "llamada. Las tarjetas se muestran solas apenas termine la búsqueda."
    )


PRICE_RE = re.compile(r"\$\s*(\d[\d.,]*)")
NUDGE_INVENTED = (
    "[Sistema] Mencionaste propiedades o precios que NO vienen de la base de datos. No inventes "
    "nada. Si el usuario quiere ver propiedades, llamá a buscar_propiedades con los filtros "
    "vigentes de toda la conversación (varias localidades: lista en `localidades`, en una sola "
    "llamada). Si se refiere a propiedades ya mostradas, llamá a mostrar_propiedades con sus IDs."
)
SAFE_TEXT = (
    "Perdón, no pude consultar las propiedades en este momento. "
    "¿Me repetís qué tipo de propiedad y en qué localidad buscás?"
)


def mentions_unknown_prices(text: str, known: Dict[Any, dict]) -> bool:
    """True si el texto cita un precio que no corresponde a ninguna propiedad conocida (alucinación)."""
    known_prices = set()
    for prop in known.values():
        try:
            if prop.get("precio") is not None:
                known_prices.add(int(float(prop["precio"])))
        except (TypeError, ValueError):
            pass
    for mt in PRICE_RE.finditer(text or ""):
        digits = re.sub(r"\D", "", mt.group(1))
        if digits and int(digits) not in known_prices:
            return True
    return False


# --- Pedido de "ver de nuevo" tarjetas/fotos de propiedades ya conocidas ---
SHOW_CUE_RE = re.compile(r"\b(mostr\w*|muestr\w*|ver|veo|reenv\w*|mand\w*|pas(a|ame|ar)|envi\w*)\b")
OBJ_CUE_RE = re.compile(r"\b(tarjetas?|fichas?|fotos?|imagenes|imagen|cards?)\b")
AGAIN_CUE_RE = re.compile(r"\b(de nuevo|otra vez|nuevamente|arriba)\b")
LOST_CUE_RE = re.compile(r"\b(perdi|perdio|no veo|no aparece|no me aparece|desaparec\w*)\b")
ALL_CUE_RE = re.compile(r"\b(todas|todos|las propiedades|los inmuebles|las opciones|las tarjetas|las casas|los departamentos|los deptos)\b")
ORDINAL_RE = re.compile(r"\b(?:la|el)\s+(primer|segund|tercer|cuart|quint|sext|ultim)[ao]?\b")
ORDINAL_IDX = {"primer": 0, "segund": 1, "tercer": 2, "cuart": 3, "quint": 4, "sext": 5, "ultim": -1}
NAME_STOP = {"de", "la", "el", "con", "en", "y", "a", "un", "una", "los", "las", "del", "para", "por", "al", "sobre", "muy"}


def wants_reshow(user_norm: str) -> bool:
    obj = OBJ_CUE_RE.search(user_norm)
    show = SHOW_CUE_RE.search(user_norm)
    again = AGAIN_CUE_RE.search(user_norm)
    lost = LOST_CUE_RE.search(user_norm)
    return bool((obj and (show or again or lost)) or (show and again))


def _name_tokens(name: str) -> List[str]:
    return [_singular(t) for t in _norm(name).split() if t not in NAME_STOP and len(t) > 2]


def properties_mentioned(text: str, known: Dict[Any, dict]) -> List[Any]:
    """IDs de propiedades conocidas cuyo nombre aparece (casi completo) en el texto."""
    toks = {_singular(t) for t in _norm(text).split()}
    scored = []
    for pid, prop in known.items():
        nt = _name_tokens(prop.get("nombre") or "")
        if len(nt) < 2:
            continue
        score = sum(1 for t in nt if t in toks) / len(nt)
        if score >= 0.75:
            scored.append((score, pid))
    scored.sort(key=lambda x: -x[0])
    return [pid for _, pid in scored]


def resolve_reshow_ids(session: dict, user_query: str) -> List[Any]:
    """Qué propiedades quiere ver de nuevo el usuario, según el contexto de la conversación."""
    known = session.get("known_properties", {})
    if not known:
        return []
    un = _norm(user_query)
    last_shown = [i for i in session.get("last_shown_ids", []) if i in known]
    last_set = [i for i in session.get("last_set_ids", []) if i in known]

    ids = properties_mentioned(user_query, known)                 # 1) nombre en su mensaje
    if not ids:
        mo = ORDINAL_RE.search(un)                                # 2) "la segunda"
        if mo and last_set:
            idx = ORDINAL_IDX[mo.group(1)]
            if -len(last_set) <= idx < len(last_set):
                ids = [last_set[idx]]
    if not ids and ALL_CUE_RE.search(un):                         # 3) "todas", "las tarjetas"
        ids = last_set or last_shown
    if not ids:                                                   # 4) de lo que venía hablando el asistente
        seen = 0
        for x in reversed(session["messages"]):
            if x.get("role") == "assistant" and x.get("content"):
                ids = properties_mentioned(x["content"], known)
                seen += 1
                if ids or seen >= 6:
                    break
    if not ids:                                                   # 5) las últimas tarjetas mostradas
        ids = last_shown
    return list(dict.fromkeys(ids))[:10]


def build_reshow_nudge(ids: List[Any], known: Dict[Any, dict]) -> str:
    nombres = "; ".join(f"{i}: {known[i].get('nombre')}" for i in ids if i in known)
    return (
        f"[Sistema] El usuario pide ver de nuevo la tarjeta/fotos de propiedades que ya aparecieron "
        f"({nombres}). Las tarjetas son lo único que tiene las fotos y el botón 'Ver detalles': "
        f"describirlas en texto NO alcanza. Llamá AHORA a mostrar_propiedades con ids={list(ids)} "
        "y después respondé en 1 línea, sin repetir datos de la propiedad."
    )


NARRATION_RE = re.compile(
    r"\b(estoy\s+(buscando|revisando|consultando|procesando)|buscando\s+\w+|"
    r"voy\s+a\s+(buscar|consultar|revisar)|vamos\s+a\s+buscar|"
    r"un\s+momento|un\s+segundo|esper(a|á|e|ar|es)\b|dame\s+(un\s+)?(momento|segundo)|"
    r"ya\s+(te\s+)?(muestro|busco|traigo))",
    re.IGNORECASE,
)
MAX_NUDGES = 2
NUDGE_TEXT = (
    "[Sistema] Anunciaste una búsqueda pero no llamaste a ninguna herramienta. "
    "Si ya tenés tipo de propiedad y localidad, llamá AHORA a buscar_propiedades con los "
    "filtros vigentes de la conversación y después a mostrar_propiedades. "
    "No respondas con texto que anuncie la búsqueda. Si en cambio te falta el tipo de "
    "propiedad o la localidad, preguntá solo por ese dato."
)


def looks_like_narration(content: Optional[str]) -> bool:
    """True si el modelo anuncia una acción ('buscando...', 'un momento') en vez de ejecutarla."""
    return bool(content) and bool(NARRATION_RE.search(content))


LIST_LINE_RE = re.compile(r"^\s*(?:\d+[.)]|[-*•–])\s+")
ANALYSIS_RE = re.compile(
    r"\b(detall(e|es|ame|ar)\s+(de|sobre|cada)|dame\s+(un\s+)?detalle|describ\w*|recomend\w*|"
    r"pros|contras|compar\w*|analiz\w*|cu[aá]l\s+(te\s+parece|es\s+mejor)|por\s+qu[eé]|"
    r"me\s+tengo\s+que\s+fijar|ventajas?|desventajas?|explic\w*)\b",
    re.IGNORECASE,
)
DEFAULT_CARDS_TEXT = "Te dejo las propiedades que encontré. ¿Querés filtrar por precio o algún otro detalle?"


def strip_card_duplicates(text: str, user_query: str, has_cards: bool) -> str:
    """
    Si ya se muestran tarjetas y el usuario no pidió un análisis, el texto no debe
    repetir la lista de propiedades (nombre/precio). Un modelo chico a veces la
    escribe igual; acá se la quita.
    """
    if not has_cards or not text or ANALYSIS_RE.search(user_query or ""):
        return text
    lines = text.splitlines()
    if not any(LIST_LINE_RE.match(ln) for ln in lines):
        return text  # no hay lista: no tocamos nada
    kept = [ln for ln in lines if not LIST_LINE_RE.match(ln) and not ln.rstrip().endswith(":")]
    cleaned = "\n".join(ln for ln in kept if ln.strip()).strip()
    return cleaned or DEFAULT_CARDS_TEXT


def trim_history(messages: List[dict]) -> List[dict]:
    """Conserva el system prompt + los últimos N mensajes, empezando siempre en un 'user'."""
    system, rest = messages[0], messages[1:]
    if len(rest) > MAX_HISTORY_MSGS:
        rest = rest[-MAX_HISTORY_MSGS:]
        while rest and rest[0].get("role") != "user":
            rest = rest[1:]
    return [system] + rest


def get_or_create_session(session_id: str) -> dict:
    with SESSIONS_LOCK:
        if session_id not in SESSIONS:
            SESSIONS[session_id] = {
                "messages": [{"role": "system", "content": SYSTEM_INSTRUCTION}],
                "last_results": [],
                "last_search_ids": [],
                "known_properties": {},
                "slots": {},
                "last_search_pair": None,
                "last_shown_ids": [],
                "last_set_ids": [],
                "searched_this_turn": False,
                "auto_shown": False,
                "lock": threading.Lock(),
            }
        return SESSIONS[session_id]


# --- Endpoint Principal con Bucle Function Calling para Qwen ---
@app.route("/chat", methods=["POST"])
def chat():
    session_id = None
    try:
        data = request.json or {}
        user_query = data.get("message", "")
        session_id = data.get("session_id") or str(uuid.uuid4())

        if not user_query:
            return jsonify({"error": "Se requiere el campo 'message'", "session_id": session_id}), 400

        logger.info(f"Consulta usuario [{session_id}]: {user_query}")
        session = get_or_create_session(session_id)

        with session["lock"]:
            session["last_results"] = []
            session["last_search_ids"] = []
            session["searched_this_turn"] = False
            session["auto_shown"] = False
            prev_assistant = next(
                (x["content"] for x in reversed(session["messages"])
                 if x.get("role") == "assistant" and x.get("content")), ""
            )
            update_slots(session, user_query, prev_assistant)
            session["messages"].append({"role": "user", "content": user_query})
            session["messages"] = trim_history(session["messages"])

            bot_response = ""
            nudges = 0
            extra: List[dict] = []  # mensajes temporales (no se guardan en el historial)

            for turn in range(MAX_TURNS):
                response = ollama.chat(
                    model=OLLAMA_MODEL,
                    messages=session["messages"] + extra,
                    tools=TOOLS_SCHEMA,
                    options=OLLAMA_OPTIONS,
                )
                msg = msg_to_dict(response["message"])
                tool_calls = msg.get("tool_calls") or []

                if not tool_calls:
                    fallback_calls = extract_text_tool_call(msg.get("content"))
                    if fallback_calls:
                        logger.warning(f"[{session_id}] Tool call recibida como texto; se parsea igual.")
                        tool_calls = fallback_calls
                        msg["content"] = ""
                        msg["tool_calls"] = fallback_calls

                if not tool_calls:
                    slots = session.get("slots", {})
                    content = msg.get("content") or ""
                    no_action = not session.get("searched_this_turn") and not session["last_results"]
                    must_search = bool(
                        slots.get("tipo") and slots.get("localidades")
                        and not THANKS_RE.search(_norm(user_query))
                        and not session.get("searched_this_turn")
                        and not search_covers_slots(session)
                    )
                    invented = no_action and mentions_unknown_prices(content, session.get("known_properties", {}))
                    narrating = no_action and looks_like_narration(content)
                    reshow_ids: List[Any] = []
                    if not session["last_results"] and wants_reshow(_norm(user_query)):
                        reshow_ids = resolve_reshow_ids(session, user_query)
                    reshow = bool(reshow_ids) and not must_search
                    if must_search or reshow or invented or narrating:
                        if nudges < MAX_NUDGES:
                            # Descartamos el texto del modelo (no entra al historial) y reintentamos.
                            nudges += 1
                            logger.warning(
                                f"[{session_id}] Sin tool call (must_search={must_search}, reshow={reshow}, invented={invented}, "
                                f"narrating={narrating}), reintento {nudges}/{MAX_NUDGES}: {content!r}"
                            )
                            nudge = (
                                build_slots_nudge(slots) if must_search
                                else build_reshow_nudge(reshow_ids, session["known_properties"]) if reshow
                                else NUDGE_INVENTED if invented
                                else NUDGE_TEXT
                            )
                            extra = [{"role": "user", "content": nudge}]
                            continue
                        if must_search:
                            # El modelo no cooperó: ejecutamos la búsqueda desde el servidor.
                            forced_args = {"tipoPropiedad": slots["tipo"], "localidades": slots["localidades"]}
                            if slots.get("operacion"):
                                forced_args["tipoOperacion"] = slots["operacion"]
                            logger.warning(f"[{session_id}] Búsqueda forzada por el servidor: {forced_args}")
                            tool_calls = [{"function": {"name": "buscar_propiedades", "arguments": forced_args}}]
                            msg = {"role": "assistant", "content": "", "tool_calls": tool_calls}
                        elif reshow:
                            logger.warning(f"[{session_id}] Reenvío de tarjetas forzado por el servidor: {reshow_ids}")
                            tool_calls = [{"function": {"name": "mostrar_propiedades", "arguments": {"ids": reshow_ids}}}]
                            msg = {"role": "assistant", "content": "", "tool_calls": tool_calls}
                        elif invented:
                            logger.warning(f"[{session_id}] Texto con datos inventados descartado: {content!r}")
                            msg["content"] = SAFE_TEXT

                extra = []
                session["messages"].append(msg)

                if not tool_calls:
                    bot_response = (msg.get("content") or "").strip()
                    break

                for call in tool_calls:
                    fn_name = call["function"]["name"]
                    fn_args = call["function"].get("arguments")
                    logger.info(f"⚙️ [Turno {turn + 1}] {fn_name}({fn_args})")

                    res_tool = run_tool(session_id, fn_name, fn_args)

                    session["messages"].append({
                        "role": "tool",
                        "tool_name": fn_name,
                        "content": json.dumps(res_tool, ensure_ascii=False, default=str),
                    })

            # Si se agotaron los turnos o el modelo no dejó texto: forzar respuesta sin herramientas.
            if not bot_response:
                try:
                    final = ollama.chat(
                        model=OLLAMA_MODEL,
                        messages=session["messages"],
                        options=OLLAMA_OPTIONS,
                    )
                    final_msg = msg_to_dict(final["message"])
                    session["messages"].append(final_msg)
                    bot_response = (final_msg.get("content") or "").strip()
                except Exception as e:
                    logger.error(f"[{session_id}] Error en llamada final: {e}", exc_info=True)

            bot_response = strip_card_duplicates(
                bot_response, user_query, has_cards=bool(session["last_results"])
            )

            if not bot_response:
                bot_response = (
                    "Acá tenés las propiedades que encontré. ¿Querés que ajustemos algún filtro?"
                    if session["last_results"]
                    else "No pude armar una respuesta. ¿Podés reformular lo que buscás?"
                )

            properties = list(session["last_results"])
            if properties:
                shown = [p.get("id") for p in properties if p.get("id") is not None]
                session["last_shown_ids"] = shown
                # "Conjunto": lo último que se vio completo (una búsqueda o varias tarjetas juntas).
                # Re-mostrar UNA tarjeta no lo pisa, así "todas" / "la tercera" siguen refiriéndose a él.
                if len(shown) >= 2 or session.get("searched_this_turn"):
                    session["last_set_ids"] = shown

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
    data = request.json or {}
    session_id = data.get("session_id")
    with SESSIONS_LOCK:
        if session_id and session_id in SESSIONS:
            del SESSIONS[session_id]
    return jsonify({"session_id": str(uuid.uuid4())})


if __name__ == "__main__":
    if pg_pool:
        atexit.register(pg_pool.closeall)
    app.run(host="0.0.0.0", port=5001, debug=True)