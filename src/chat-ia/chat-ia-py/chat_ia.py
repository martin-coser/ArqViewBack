from flask import Flask, request, jsonify
import google.generativeai as genai
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
import json
import logging
import re
from datetime import datetime
import uuid
import os 
from copy import deepcopy 
from dotenv import load_dotenv 
import atexit 

# --- Configuración Inicial y Seguridad ---
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
app = Flask(__name__)
GM_API_KEY = os.getenv("GM_API_KEY")
if not GM_API_KEY:
    raise ValueError("GM_API_KEY no configurada. Revisa tu archivo .env.")
genai.configure(api_key=GM_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

#-- Configuración de la Base de Datos ---
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT")
}

#--- Pool de Conexiones a PostgreSQL ---
try:
    pg_pool = psycopg2.pool.SimpleConnectionPool(1, 20, **DB_CONFIG)
    logger.info("✅ Pool de conexiones de PostgreSQL creado exitosamente.")
except (Exception, psycopg2.DatabaseError) as error:
    logger.error(f"Error conectando a PostgreSQL: {error}")

# --- Almacenamiento de Historial de Conversaciones en Memoria ---    
conversation_histories = {}

# --- Funciones de IA y Extracción de Parámetros ---
def extract_parameters(user_query):
    """
    Extrae parámetros SÓLO de la consulta actual usando Gemini API.
    """
    prompt = f"""
    Eres un asistente de búsqueda de propiedades. Tu única tarea es extraer **SÓLO** los siguientes parámetros
    mencionados **explícitamente** en la 'Consulta del usuario' en formato JSON estricto.
    
    NO asumas valores de interacciones pasadas. Si el usuario no menciona un parámetro, **omítelo del JSON o usa null**.

    **REGLA CRÍTICA DE CLASIFICACIÓN DE CONSULTA**:
    1. **Pregunta Contextual:** Si el usuario hace una pregunta de seguimiento que se puede responder **analizando la lista de propiedades ya mostrada** (ej: "¿Cuál es la más barata?", "¿Alguna tiene pileta?"), omite todos los demás campos y devuelve **SÓLO** el campo `"is_contextual_query": true`.
    2. **Mensaje Amigable:** Si el usuario está enviando un mensaje de **agradecimiento, confirmación o cortesía** sin modificar la búsqueda ni hacer una pregunta contextual (ej: 'genial', 'perfecto', 'todo bien', 'gracias'), omite todos los demás campos y devuelve **SÓLO** el campo `"is_friendly_message": true`.
    3. **Consulta Fuera de Tema (Off-Topic):** Si la consulta del usuario no es una búsqueda de propiedad, no es contextual, y no es un mensaje de cortesía (ej: "dame una receta", "qué hora es", "clima"), omite todos los demás campos y devuelve **SÓLO** el campo `"is_off_topic": true`.

    **REGLA DE TAGS VISUALES**:
    1. Si el usuario menciona características visuales de **espacios** acompañados de un adjetivo descriptivo (ej: 'cocina grande', 'habitación luminosa', 'baño pequeño', 'living oscuro'), agrégalas como strings en el array **tagsVisuales** (Deseados). **OMITE** cualquier otra característica (como 'balcón', 'pileta', 'asador') de los tagsVisuales.
    2. **REGLA DE EXCLUSIÓN (tagsVisualesExcluir):** Si el usuario menciona **negaciones** de espacios con adjetivos descriptivos (ej: "no quiero un garage pequeño", "sin cocina oscura", "que no tenga baño pequeño"), agrégalas como strings al array **tagsVisualesExcluir**. No las incluyas en `tagsVisuales` ni en `contentFilter`.
    3. Si el usuario menciona alguna palabra que pueda ser tambien un espacio (ej garage) puede que sea un tag visual o un content filter, para determinar de que tipo es, fijate si tiene alguna caracteristica luego de la palabra como por ejemplo "garage grande" o "garage pequeño" en ese caso es un tag visual, si no tiene ninguna caracteristica luego de la palabra entonces es un content filter.
    Si el usuario menciona características de **equipamiento** ('balcón', 'pileta', 'asador', 'garage') o de **ambiente/uso** ('ideal para estudiantes', 'cerca del parque', 'soleado', 'tranquilo') Y **NO** es una pregunta contextual, extrae toda esa frase en el campo **contentFilter**. Si hay varios, combina las frases de ambiente y equipamiento en una sola frase coherente.

    Si el usuario indica una intención de REINICIAR o CANCELAR la búsqueda actual (ej: 'empezar de cero', 'olvídalo', 'nueva búsqueda', 'comencemos de nuevo'), agrega el campo **"reset_search": true** al JSON.
    NO INCLUYAS texto adicional, solo el JSON.

    Parámetros:
    - tipoOperacion: 'venta' o 'alquiler'
    - tipoPropiedad: e.g., 'casa', 'departamento', 'terreno'
    - localidad: e.g., 'Villa Maria', 'Córdoba'
    - cantidadDormitorios: número entero
    - cantidadBanios: número entero
    - precioMax: número decimal
    - tagsVisuales: lista de strings (deseados)
    - tagsVisualesExcluir: lista de strings (NO DESEADOS)
    - **contentFilter**: string con frases descriptivas de uso, ambiente y equipamiento
    - reset_search: bool (true si el usuario quiere reiniciar la búsqueda)
    - **is_contextual_query**: bool (true si la pregunta es sobre la lista mostrada)
    - **is_friendly_message**: bool (true si es solo un mensaje de cortesía/confirmación)
    - **is_off_topic**: bool (true si la pregunta no tiene relación con propiedades)


    Consulta del usuario: "{user_query}"

    Responde SOLO con el JSON válido. Ejemplo: {{"tipoPropiedad": "casa", "localidad": "Villa Maria"}} o {{"is_off_topic": true}}
    """
    try:
        response = model.generate_content(prompt)
        json_str = response.text.strip()
        
        json_str = re.sub(r'^```json\s*|\s*```$', '', json_str, flags=re.MULTILINE).strip()
        
        params = json.loads(json_str)
        return params
    except json.JSONDecodeError as e:
        logger.error(f"Error al parsear JSON de Gemini: {e}, JSON recibido: {json_str}")
        return {}
    except Exception as e:
        logger.error(f"Error al extraer parámetros con Gemini: {e}")
        return {}

# --- Funciones de Respuesta Conversacional y Consulta de Propiedades ---
def get_conversational_response(user_query, history, context_type="default"):
    """Genera una respuesta conversacional para diferentes contextos."""
    
    instruction_off_topic = "El usuario acaba de hacer una pregunta que no tiene nada que ver con propiedades (ej: 'receta de torta'). Responde amablemente que tu función es solo ayudar con la búsqueda de inmuebles en ArqView y redirige la conversación a la propiedad o localidad que busca."
    instruction_friendly = "El usuario acaba de decir un mensaje de cortesía. Confirma amablemente y redirige la conversación al siguiente paso de la búsqueda de propiedades (ej: '¿Quieres refinar tu búsqueda actual o ver propiedades en otra localidad?')."
    instruction_default = "El usuario no especificó tipo de propiedad o localidad. Pregúntale amablemente por el dato faltante para poder iniciar o continuar la búsqueda."

    if context_type == "off_topic":
        instruction = instruction_off_topic
    elif context_type == "friendly":
        instruction = instruction_friendly
    else: # default/falta de parámetros
        instruction = instruction_default


    prompt = f"""
    Eres un asistente virtual amigable y experto en bienes raíces para la plataforma 'ArqView'.
    Responde de manera natural y conversacional al usuario, siguiendo estrictamente la instrucción dada.

    Historial de la conversación:
    {history}

    Mensaje del usuario: "{user_query}"

    Instrucción Específica:
    {instruction}

    Responde SOLO con el texto de la respuesta, sin formato JSON ni código.
    """
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Error al generar respuesta conversacional: {e}")
        return "Disculpa, solo puedo ayudarte con tu búsqueda de propiedades. ¿Qué tipo de propiedad o localidad estás buscando?"

# --- Función de Respuesta Contextual ---
def get_contextual_response(user_query, history, properties_list):
    """
    Genera una respuesta basada en el análisis de los resultados ya obtenidos.
    """
    property_summary = []
    for i, prop in enumerate(properties_list, 1):
        summary = {
            "Nro_Lista": i,
            "ID_DB": prop.get('id'),
            "Nombre": prop.get('nombre'),
            "Precio": prop.get('precio', 0),
            "Dormitorios": prop.get('cantidadDormitorios', 'N/A'),
            "Localidad": prop.get('localidad_nombre', 'N/A'),
            "Descripcion_FTS": prop.get('descripcion', '') 
        }
        property_summary.append(summary)
        
    properties_json = json.dumps(property_summary, indent=2, ensure_ascii=False)
    
    contextual_prompt = f"""
    Eres un asistente de ArqView. El usuario te está haciendo una pregunta sobre la lista de propiedades que acabas de mostrar.
    Tu tarea es analizar la 'Lista de Propiedades (JSON)' y la 'Consulta del Usuario' para responder con precisión.

    Instrucciones:
    - Responde SÓLO con la información encontrada en el JSON. NO busques en la base de datos.
    - Si te preguntan por **precio**, devuelve el nombre, ID y precio de la propiedad más barata/cara.
    - Si te preguntan por una **característica (ej: pileta, asador)**, analiza el campo `Descripcion_FTS` de cada propiedad. Lista los NÚMEROS de lista y nombres de las propiedades que cumplen o informa si ninguna cumple.
    - Mantén la respuesta conversacional y concisa.

    Historial de Conversación: {history}

    Lista de Propiedades (JSON):
    ---
    {properties_json}
    ---

    Consulta del Usuario: "{user_query}"

    Respuesta:
    """
    
    logger.info(f"🔎 PROMPT CONTEXTUAL ENVIADO. Longitud JSON de propiedades: {len(properties_json)}")
    
    try:
        response = model.generate_content(contextual_prompt)
        result_text = response.text.strip()
        
        if not result_text:
            logger.warning("⚠️ RESPUESTA DE GEMINI VACÍA. Puede que el modelo no haya podido procesar el prompt.")
            return "Disculpa, no pude analizar los resultados. ¿Podrías reformular la pregunta?"
        
        logger.info(f"✅ RESPUESTA CONTEXTUAL RECIBIDA: {result_text[:100]}...")
        return result_text
        
    except Exception as e:
        logger.error(f"❌ ERROR FATAL al generar respuesta contextual con Gemini: {e}")
        return "Disculpa, tuve un problema al analizar los resultados. ¿Podrías reformular tu pregunta?"

# --- Función de normalización de tags visuales ---
def normalize_visual_tags(tags_list):
    """
    Normaliza los tags visuales de frases a formato 'espacio,adjetivo' (ej: 'cocina grande' -> 'cocina,grande').
    """
    normalized_tags = []
    
    for phrase in tags_list:
        parts = phrase.strip().lower().split()
        
        if not parts: continue
            
        space = parts[0]
        features = parts[1:]
        
        if not features: continue 

        # Filtra conectores comunes
        adjectives = [f for f in features if f not in ['y', 'o', 'con', 'sin']]
        
        for adj in adjectives:
            normalized_tags.append(f"{space},{adj}")
            
    return normalized_tags

# --- Función de Consulta de Propiedades ---
def query_properties(params):
    """
    Consulta propiedades aplicando filtros duros y usando contentFilter SÓLO para ranking.
    Utiliza el pool de conexiones.
    """
    
    tags_visuales_raw = params.get('tagsVisuales', [])
    tags_visuales_excluir_raw = params.get('tagsVisualesExcluir', []) 
    
    tags_visuales_solicitados = normalize_visual_tags(tags_visuales_raw) 
    tags_visuales_excluir = normalize_visual_tags(tags_visuales_excluir_raw)
    
    conn = pg_pool.getconn() 
    results = []
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        sql_params = []
        
        content_filter = params.get('contentFilter')
        
        FTS_CONFIG = 'spanish' 
        
        if content_filter:
            # Añade ranking FTS si hay un contentFilter
            rank_select = f", COALESCE(ts_rank(to_tsvector('{FTS_CONFIG}', p.descripcion), plainto_tsquery('{FTS_CONFIG}', %s)), 0) AS rank"
            sql_params.append(content_filter)
        else:
            rank_select = ", 0 AS rank"
        
        select_columns = [
            'p.id', 'p.nombre', 'p.descripcion', 'p.direccion', 'p.precio', 'p.superficie',
            'p."cantidadBanios"', 'p."cantidadDormitorios"', 'p."cantidadAmbientes"', 'p."tipoOperacion"',
            'p.latitud', 'p.longitud',
            'l.nombre as localidad_nombre',
            'tp.nombre as tipo_propiedad_nombre',
            'ea.nombre as estilo_arquitectonico_nombre',
            'array_agg(DISTINCT tv.nombre) as tipo_visualizaciones_nombres',
            'array_agg(i.tags_visuales) as tags_visuales_agregados' 
        ]
        
        sql_select = f"SELECT {', '.join(select_columns)} {rank_select}"
        
        sql_from = f"""
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
        
        tipo_operacion_map = {'compra': 'VENTA', 'venta': 'VENTA', 'alquiler': 'ALQUILER'}
        tipo_operacion = params.get('tipoOperacion')
        if tipo_operacion and tipo_operacion.lower() in tipo_operacion_map:
            conditions.append(f"p.\"tipoOperacion\" = %s")
            sql_params.append(tipo_operacion_map[tipo_operacion.lower()])
        elif params.get('tipoPropiedad') and not tipo_operacion:
            conditions.append(f"p.\"tipoOperacion\" IN (%s, %s)")
            sql_params.extend(['VENTA', 'ALQUILER'])

        if params.get('tipoPropiedad'):
            conditions.append("tp.nombre ILIKE %s")
            sql_params.append(f"%{params['tipoPropiedad']}%")
        
        if params.get('localidad'):
            conditions.append("l.nombre ILIKE %s")
            sql_params.append(f"%{params['localidad']}%")
        
        if params.get('cantidadDormitorios') is not None:
            conditions.append("p.\"cantidadDormitorios\" = %s")
            sql_params.append(params['cantidadDormitorios'])
        
        if params.get('cantidadBanios') is not None:
            conditions.append("p.\"cantidadBanios\" = %s")
            sql_params.append(params['cantidadBanios'])
        
        if params.get('cantidadAmbientes') is not None:
            conditions.append("p.\"cantidadAmbientes\" >= %s")
            sql_params.append(params['cantidadAmbientes'])
        
        if params.get('precioMax') is not None:
            conditions.append("p.precio <= %s")
            sql_params.append(params['precioMax'])
        
        if params.get('superficieMin') is not None:
            conditions.append("p.superficie >= %s")
            sql_params.append(params['superficieMin'])
        
        if params.get('estiloArquitectonico'):
            conditions.append("ea.nombre ILIKE %s")
            sql_params.append(f"%{params['estiloArquitectonico']}%")
        
        if params.get('tipoVisualizaciones') and params['tipoVisualizaciones']:
            conditions.append("tv.nombre = ANY(%s)")
            sql_params.append(params['tipoVisualizaciones'])

        if tags_visuales_solicitados:
            tag_conditions = []
            for tag_pair in tags_visuales_solicitados:
                parts = tag_pair.split(',')
                if len(parts) != 2: continue
                fts_query_term = f"{parts[0].strip()} & {parts[1].strip()}"
                tag_conditions.append(f"to_tsvector('{FTS_CONFIG}', i_sub.tags_visuales) @@ plainto_tsquery('{FTS_CONFIG}', %s)")
                sql_params.append(fts_query_term)
            
            if tag_conditions:
                full_tag_condition = " OR ".join(tag_conditions)
                # Subconsulta para asegurar que la propiedad tiene AL MENOS una imagen con el tag deseado
                final_condition = f"p.id IN (SELECT i_sub.propiedad_id FROM imagen2d i_sub WHERE {full_tag_condition} GROUP BY i_sub.propiedad_id)"
                conditions.append(final_condition)
        
        if tags_visuales_excluir:
            tag_exclude_conditions = []
            for tag_pair in tags_visuales_excluir:
                parts = tag_pair.split(',')
                if len(parts) != 2: continue
                fts_query_term = f"{parts[0].strip()} & {parts[1].strip()}"
                tag_exclude_conditions.append(f"to_tsvector('{FTS_CONFIG}', i_sub_exc.tags_visuales) @@ plainto_tsquery('{FTS_CONFIG}', %s)")
                sql_params.append(fts_query_term)
                
            if tag_exclude_conditions:
                full_exclude_condition = " OR ".join(tag_exclude_conditions)
                # Subconsulta para excluir propiedades que tienen AL MENOS una imagen con el tag NO deseado
                final_exclude_condition = f"p.id NOT IN (SELECT i_sub_exc.propiedad_id FROM imagen2d i_sub_exc WHERE {full_exclude_condition} GROUP BY i_sub_exc.propiedad_id)"
                conditions.append(final_exclude_condition)

        if conditions:
            sql_from += " AND " + " AND ".join(conditions)
                
        sql = sql_select + sql_from
        sql += " GROUP BY p.id, l.nombre, tp.nombre, ea.nombre"
        sql_order = " ORDER BY rank DESC, p.precio ASC LIMIT 10"
        sql += sql_order
        
        logger.info(f"SQL: {sql}, Params: {sql_params}")
        
        try:
            cur.execute(sql, sql_params) 
            results = cur.fetchall()
        except psycopg2.ProgrammingError as e:
            logger.error(f"Error en la consulta SQL: {e}")
            results = [] 

        cur.close()
        return results
    except Exception as e:
        logger.error(f"Error al consultar la base de datos: {e}")
        return []
    finally:
        if conn:
            pg_pool.putconn(conn)

# --- Endpoint Principal (/chat) ---
@app.route('/chat', methods=['POST'])
def chat():
    """Endpoint principal para procesar consultas del chat con historial y fusión de contexto."""
    try:
        data = request.json
        user_query = data.get('message', '')
        session_id = data.get('session_id') or str(uuid.uuid4())
        
        if not user_query:
             return jsonify({"error": "Se requiere el campo 'message'", "session_id": session_id}), 400

        logger.info(f"Consulta del usuario (session_id: {session_id}): {user_query}")
        
        history_data = conversation_histories.get(session_id, {'text': "", 'params': {}, 'properties': []}) 
        history = history_data['text']
        old_params = history_data['params']
        last_properties = history_data['properties'] 
        
        new_params = extract_parameters(user_query)
        print(f"Parámetros extraídos: {new_params}")
        
        params = deepcopy(old_params)
        bot_response = ""
        properties = [] 

        # --- 1. Lógica de Reinicio ---
        if new_params.get('reset_search'):
            logger.info("Comando de reinicio detectado. Borrando contexto de búsqueda.")
            params = {} 
            properties = [] 
            last_properties = [] 
            bot_response = get_conversational_response("El usuario ha solicitado un reinicio de búsqueda. Confirma el reinicio y pregunta por el nuevo tipo de propiedad o localidad.", history)
            
            # Devolución para Reinicio
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            conversation_histories[session_id] = {
                'text': f"{history}\n[{timestamp}] Usuario: {user_query}\n[{timestamp}] Asistente: {bot_response}\n",
                'params': params,
                'properties': properties 
            }
            return jsonify({
                "response": bot_response,
                "properties": [],
                "params": params, 
                "session_id": session_id 
            })
            
        # --- 2. Lógica de Consulta Contextual (Pregunta sobre la lista) ---
        elif new_params.get('is_contextual_query') and last_properties:
            logger.info("Flag de consulta contextual detectado. Respondiendo sobre resultados previos.")
            
            # Generar la respuesta contextual
            bot_response = get_contextual_response(user_query, history, last_properties)
            
            # Actualizar el historial (Mantiene los parámetros y propiedades anteriores)
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            conversation_histories[session_id] = {
                'text': f"{history}\n[{timestamp}] Usuario: {user_query}\n[{timestamp}] Asistente: {bot_response}\n",
                'params': params, 
                'properties': last_properties 
            }
            
            # Devolver SÓLO la respuesta de IA y la lista de PROPIEDADES VACÍA al CLIENTE
            return jsonify({
                "response": bot_response,
                "properties": [], 
                "params": params, 
                "session_id": session_id 
            })

        # --- 2.5. Lógica de Mensaje Amigable ---
        elif new_params.get('is_friendly_message'): 
            logger.info("Mensaje amigable/de confirmación detectado. No se ejecuta búsqueda.")
            
            # Genera respuesta amigable con la nueva función que usa context_type
            bot_response = get_conversational_response(user_query, history, context_type="friendly")
            
            # Las propiedades y parámetros NO CAMBIAN, solo se actualiza el historial de texto
            properties = last_properties 
            
            # Devolución para Mensaje Amigable
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            conversation_histories[session_id] = {
                'text': f"{history}\n[{timestamp}] Usuario: {user_query}\n[{timestamp}] Asistente: {bot_response}\n",
                'params': params, # Mantiene los parámetros anteriores
                'properties': last_properties # ¡GUARDA la lista en el historial del servidor!
            }
            
            return jsonify({
                "response": bot_response,
                "properties": [], # Se envía vacío al cliente para no re-renderizar la lista
                "params": params, 
                "session_id": session_id 
            })
            
        # --- 2.7. Lógica de Consulta Fuera de Tema (NUEVA) ---
        elif new_params.get('is_off_topic'): 
            logger.info("Consulta fuera de tema detectada. Respondiendo con enfoque de propiedades.")
            
            # Genera respuesta fuera de tema con la nueva función que usa context_type
            bot_response = get_conversational_response(user_query, history, context_type="off_topic")
            
            # Mantiene los parámetros y propiedades anteriores para seguir con la búsqueda original
            properties = last_properties 
            
            # Devolución para Consulta Fuera de Tema
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            conversation_histories[session_id] = {
                'text': f"{history}\n[{timestamp}] Usuario: {user_query}\n[{timestamp}] Asistente: {bot_response}\n",
                'params': params, 
                'properties': last_properties
            }
            
            return jsonify({
                "response": bot_response,
                "properties": [], # Se envía vacío al cliente para no re-renderizar la lista
                "params": params, 
                "session_id": session_id 
            })
            
        # --- 3. Lógica de Fusión y Búsqueda Estándar ---
        else:
            # Fusión de Contexto: Reemplaza o añade parámetros
            for key, value in new_params.items():
                if value is not None and (not isinstance(value, list) or value):
                    params[key] = value 
            
            has_minimal_params = params.get('tipoPropiedad') and params.get('localidad')

            # Manejo de flujo conversacional (Si faltan datos)
            if not has_minimal_params:
                # Caso de datos incompletos
                prompt_falta = ""
                if not params.get('tipoPropiedad') and not params.get('localidad'):
                    prompt_falta = "Busco una propiedad pero no especificaste ni el tipo ni la localidad"
                elif params.get('tipoPropiedad') and not params.get('localidad'):
                    prompt_falta = f"Busco una {params.get('tipoPropiedad')} pero no especificaste la localidad"
                else: 
                    prompt_falta = f"Busco propiedades en {params.get('localidad')} pero no especificaste tipo"
                    
                bot_response = get_conversational_response(prompt_falta, history)
                properties = [] # No hay resultados para mostrar

            # Caso de nueva búsqueda/refinamiento
            else:
                logger.info(f"Parámetros finales fusionados: {params}")
                properties = query_properties(params) # <- ¡Consulta a la DB!
                
                if not properties:
                    bot_response = "No encontré propiedades que coincidan con tu búsqueda. ¿Quieres ajustar los detalles, añadir más características visuales o cambiar la localidad?"
                else:
                    # Generación de la respuesta con los resultados (código de formateo de lista)
                    response_parts = ["¡Encontré estas propiedades que podrían interesarte! Están ordenadas para que veas primero las que mejor coinciden con tus comentarios descriptivos.\n\n"]
                    
                    for i, prop in enumerate(properties, 1):
                        visualizaciones = prop.get('tipo_visualizaciones_nombres', [])
                        visualizaciones = ', '.join([v for v in visualizaciones if v is not None]) if visualizaciones else 'Ninguna especificada'
                        
                        tags = prop.get('tags_visuales_agregados', []) 
                        tags_str_list = []
                        for sublist in tags:
                            if sublist is not None and isinstance(sublist, str):
                                tags_str_list.extend([tag.strip() for tag in sublist.split(',') if tag.strip()])
                                
                        tags_str = ', '.join(set(tags_str_list)) if tags_str_list else 'No hay tags visuales'
                        
                        response_parts.append(f"--- **{i}. {prop.get('nombre')}** [ID:{prop.get('id')}] ---")
                        response_parts.append(f"• **Precio:** ${prop.get('precio', 'N/A'):,.2f} ({prop.get('tipoOperacion')})")
                        response_parts.append(f"• **Características:** {prop.get('cantidadDormitorios', 0)} Dormitorios, {prop.get('cantidadBanios', 0)} Baños, {prop.get('superficie', 'N/A')} m².")
                        if prop.get('rank', 0) > 0.05:
                             response_parts.append(f"• **Coincidencia Descriptiva:** Alta.")
                        response_parts.append(f"• **Visualizaciones:** {visualizaciones}.")
                        response_parts.append(f"• **Tags Visuales:** {tags_str}.")
                        response_parts.append("\n")

                    bot_response = "".join(response_parts)
                    
            # Actualización final del historial (para los casos de búsqueda/refinamiento)
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            conversation_histories[session_id] = {
                'text': f"{history}\n[{timestamp}] Usuario: {user_query}\n[{timestamp}] Asistente: {bot_response}\n",
                'params': params,
                'properties': properties 
            }
            
            # Devolución final
            return jsonify({
                "response": bot_response,
                "properties": properties, # <-- Devuelve resultados SÓLO si es una búsqueda
                "params": params, 
                "session_id": session_id 
            })

    # --- Manejo de Errores Generales ---
    except Exception as e:
        logger.error(f"Error general en el chat: {e}", exc_info=True)
        return jsonify({"error": "Ocurrió un error interno del servidor.", "session_id": session_id}), 500

if __name__ == '__main__':
    atexit.register(pg_pool.closeall)
    app.run(host='0.0.0.0', port=5001, debug=True)