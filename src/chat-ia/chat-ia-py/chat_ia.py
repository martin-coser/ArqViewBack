from flask import Flask, request, jsonify
import google.generativeai as genai
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import logging
import os
import re
from datetime import datetime

# Configuración de logging para depuración
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configura Gemini con la API key hardcodeada
genai.configure(api_key="AIzaSyAiBjAVZ3jJxH-at6QXqsw7YT8tkXfWeUM")
model = genai.GenerativeModel('gemini-2.5-flash')

# Configuración de la base de datos
DB_CONFIG = {
    "dbname": "arqview",
    "user": "postgres",
    "password": "postgres",
    "host": "localhost",
    "port": 5432
}

# Sistema de sesiones en memoria (Redis en producción)
conversation_histories = {}

def extract_parameters(user_query):
    """Extrae parámetros de la consulta del usuario usando Gemini API."""
    prompt = f"""
    Eres un asistente de búsqueda de propiedades. Extrae los siguientes parámetros de la consulta en formato JSON estricto.
    NO asumas valores por defecto a menos que el usuario los mencione explícitamente. Si algo no está claro o no se menciona, pon null.
    Si el usuario menciona 'propiedad' o 'propiedades' sin especificar tipo, no asumas un tipoPropiedad y deja el campo como null, indicando que necesita más detalles.
    Si el usuario menciona características visuales de espacios (e.g., 'dormitorio grande', 'baño pequeño', 'cocina luminosa'), agrégalas como strings en 'tagsVisuales' (e.g., ['dormitorio grande', 'baño pequeño']) solo si todas las características mencionadas pueden esperarse juntas en una propiedad. Si el usuario menciona múltiples características visuales (e.g., 'cocina grande y baño pequeño'), asegúrate de que solo se incluyan en 'tagsVisuales' si todas pueden cumplirse; de lo contrario, omite 'tagsVisuales' o déjalo como un array vacío. 
    Si el usuario menciona una 'familia grande', '4 o 5 personas' o 'más personas', interpreta que necesitan al menos 3 habitaciones; si dice '5 o más personas', asigna un mínimo de 4 habitaciones.
    Si el usuario solo saluda o charla (e.g., 'hola cómo estás'), no extraigas parámetros y devuelve un JSON vacío.
    NO INCLUYAS texto adicional, solo el JSON.

    Parámetros:
    - tipoOperacion: 'venta' o 'alquiler' (solo si se menciona explícitamente)
    - tipoPropiedad: e.g., 'casa', 'departamento', 'terreno' (solo si se menciona explícitamente)
    - localidad: e.g., 'Villa Maria', 'Córdoba', 'Federacion' (solo si se menciona explícitamente)
    - cantidadDormitorios: número entero (solo si se menciona explícitamente)
    - cantidadBanios: número entero (solo si se menciona explícitamente)
    - cantidadAmbientes: número entero (solo si se menciona explícitamente)
    - precioMax: número decimal (solo si se menciona explícitamente)
    - superficieMin: número entero (solo si se menciona explícitamente)
    - estiloArquitectonico: e.g., 'moderno', 'clásico' (solo si se menciona explícitamente)
    - tipoVisualizaciones: lista de strings, e.g., ['vista al mar', 'vista a la montaña'] (solo si se menciona explícitamente)
    - tagsVisuales: lista de strings, e.g., ['dormitorio grande', 'baño pequeño'] (default: [], solo incluye si todas las características pueden cumplirse juntas)

    Consulta del usuario: "{user_query}"

    Responde SOLO con el JSON válido. Ejemplo: {{"tipoPropiedad": "casa", "tagsVisuales": ["cocina grande", "baño pequeño"]}} si ambas características son válidas juntas, o {{"localidad": "Villa María"}} si solo se menciona localidad, o vacio si es un saludo.
    """
    try:
        response = model.generate_content(prompt)
        json_str = response.text.strip()
        logger.info(f"Respuesta de Gemini (parámetros): {json_str}")
        
        # Limpiar bloques Markdown (```json ... ```)
        json_str = re.sub(r'^```json\s*|\s*```$', '', json_str, flags=re.MULTILINE).strip()
        
        params = json.loads(json_str)
        return params
    except json.JSONDecodeError as e:
        logger.error(f"Error al parsear JSON de Gemini: {e}, JSON recibido: {json_str}")
        return {}
    except Exception as e:
        logger.error(f"Error al extraer parámetros con Gemini: {e}")
        return {}

def get_conversational_response(user_query, history):
    """Genera una respuesta conversacional usando Gemini."""
    prompt = f"""
    Eres un asistente virtual amigable y experto en bienes raíces para la plataforma 'ArqView'.
    Responde de manera natural y conversacional al usuario.
    
    Historial de la conversación:
    {history}
    
    Mensaje del usuario: "{user_query}"
    
    Instrucciones:
    - Si el usuario saluda o hace preguntas generales (e.g., 'hola', '¿cómo estás?'), responde amigablemente y pregúntale qué tipo de propiedad o lugar le interesa buscar.
    - Si menciona 'propiedad' o 'propiedades' sin especificar tipo (e.g., 'quiero una propiedad'), pide amablemente que indique qué tipo de propiedad desea (e.g., ¿Qué tipo de propiedad te gustaría buscar?).
    - Si menciona un tipo de propiedad (e.g., 'quiero una casa') pero no especifica localidad, pide amablemente que indique en qué localidad quiere buscar (e.g., ¿En qué localidad te gustaría buscar tu casa?).
    - Si menciona una localidad (e.g., 'propiedades en Villa María') pero no un tipo de propiedad, pide aclaraciones amigables (e.g., ¿Qué tipo de propiedad te gustaría encontrar en Villa María?).
    - Usa el historial para mantener el contexto (e.g., si ya hablaron de una localidad, refiérete a ella).
    - Siempre termina invitando al usuario a continuar la conversación o especificar qué busca.
    - Mantén las respuestas cortas y directas.
    
    Responde SOLO con el texto de la respuesta, sin formato JSON ni código.
    """
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Error al generar respuesta conversacional: {e}")
        return "¡Hola! ¿En qué puedo ayudarte hoy con tu búsqueda de propiedades?"

def query_properties(params):
    """Consulta la base de datos con los parámetros extraídos, incluyendo filtros por tags visuales con coincidencia parcial."""
    conditions = []  # Inicializar conditions para usarla más abajo
    sql_params = []  # Inicializar sql_params para usarla más abajo
    
    try:
        conn = psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
        cur = conn.cursor()
        
        # Lista base de columnas disponibles
        select_columns = [
            'p.id', 'p.nombre', 'p.descripcion', 'p.direccion', 'p.precio', 'p.superficie',
            'p."cantidadBanios"', 'p."cantidadDormitorios"', 'p."cantidadAmbientes"', 'p."tipoOperacion"',
            'p.latitud', 'p.longitud',
            'l.nombre as localidad_nombre',
            'tp.nombre as tipo_propiedad_nombre',
            'ea.nombre as estilo_arquitectonico_nombre',
            'array_agg(tv.nombre) as tipo_visualizaciones_nombres',
            'array_agg(i.tags_visuales) as tags_visuales'  # Agregar tags_visuales
        ]
        
        sql = f"""
        SELECT {', '.join(select_columns)}
        FROM propiedad p
        LEFT JOIN localidad l ON p.localidad_id = l.id
        LEFT JOIN tipo_de_propiedad tp ON p."tipoDePropiedad_id" = tp.id
        LEFT JOIN estilo_arquitectonico ea ON p."estiloArquitectonico_id" = ea.id
        LEFT JOIN propiedad_tipo_visualizacion ptv ON p.id = ptv.propiedad_id
        LEFT JOIN tipo_de_visualizacion tv ON ptv.tipo_visualizacion_id = tv.id
        LEFT JOIN imagen2d i ON p.id = i.propiedad_id
        WHERE 1=1
        """
        # Mapeo de valores de tipoOperacion para coincidir con el enum
        tipo_operacion_map = {
            'compra': 'VENTA',
            'venta': 'VENTA',
            'alquiler': 'ALQUILER'
        }
        # Construir condiciones basadas en parámetros
        tipo_operacion = params.get('tipoOperacion')
        if tipo_operacion and tipo_operacion.lower() in tipo_operacion_map:
            conditions = [f"p.\"tipoOperacion\" = %s"]
            sql_params.append(tipo_operacion_map[tipo_operacion.lower()])
        elif params.get('tipoPropiedad') and not tipo_operacion:  # Si hay tipoPropiedad pero no tipoOperacion, buscar ambas
            conditions = [f"p.\"tipoOperacion\" IN (%s, %s)"]
            sql_params.extend(['VENTA', 'ALQUILER'])
        elif tipo_operacion:
            logger.warning(f"Valor de tipoOperacion '{tipo_operacion}' no reconocido, omitiendo.")
        
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
        
        # Filtro por tags visuales con coincidencia parcial
        if params.get('tagsVisuales') and params['tagsVisuales']:
            like_patterns = []
            for tag in params['tagsVisuales']:
                space_part = tag.split()[0]  # e.g., "dormitorio"
                features = tag.split()[1:]  # e.g., ["grande"]
                full_tag = f"{space_part},{' '.join(features)}"  # e.g., "dormitorio,grande"
                like_patterns.append(f"%{full_tag}%")
            conditions.append("i.tags_visuales ILIKE ANY (%s)")
            sql_params.append(like_patterns)

        if conditions:
            sql += " AND " + " AND ".join(conditions)
        
        sql += " GROUP BY p.id, l.nombre, tp.nombre, ea.nombre HAVING COUNT(DISTINCT i.id) > 0 ORDER BY p.precio ASC LIMIT 10"
        
        logger.info(f"SQL: {sql}, Params: {sql_params}")
        
        # Ejecutar la consulta, con fallback si falla
        try:
            cur.execute(sql, sql_params)
            results = cur.fetchall()
        except psycopg2.ProgrammingError as e:
            logger.error(f"Error en la consulta SQL, omitiendo columnas problemáticas: {e}")
            results = [] 
        
        cur.close()
        conn.close()
        return results
    except Exception as e:
        logger.error(f"Error al consultar la base de datos: {e}")
        return []

# Endpoint principal para el chat
@app.route('/chat', methods=['POST'])
def chat():
    """Endpoint principal para procesar consultas del chat con historial."""
    try:
        data = request.json
        if not data or 'session_id' not in data or 'message' not in data:
            return jsonify({"error": "Se requiere session_id y message en la solicitud"}), 400
        
        session_id = data['session_id']
        user_query = data['message']
        logger.info(f"Consulta del usuario (session_id: {session_id}): {user_query}")
        
        # Recuperar o inicializar el historial de la conversación
        history = conversation_histories.get(session_id, "")
        
        # Extraer parámetros si es una búsqueda
        params = extract_parameters(user_query)
        bot_response = ""
        properties = []  # Inicializar properties
        
        if not params:
            # Si no se extraen parámetros (saludos o charlas), generar una respuesta conversacional
            bot_response = get_conversational_response(user_query, history)
        else:
            # Verificar si falta información clave para la búsqueda
            if not params.get('tipoPropiedad') and not params.get('localidad'):
                # Caso donde se menciona "propiedad" sin tipo ni localidad
                bot_response = get_conversational_response("Busco una propiedad pero no especificaste ni el tipo ni la localidad", history)
            elif params.get('tipoPropiedad') and not params.get('localidad'):
                # Caso donde se especifica tipo pero no localidad
                bot_response = get_conversational_response(f"Busco una {params.get('tipoPropiedad')} pero no especificaste la localidad", history)
            elif params.get('localidad') and not params.get('tipoPropiedad'):
                # Caso donde se especifica localidad pero no tipo
                bot_response = get_conversational_response(f"Busco propiedades en {params.get('localidad')} pero no especificaste tipo", history)
            else:
                # Si hay parámetros suficientes (tipoPropiedad y localidad), realizar la búsqueda
                logger.info(f"Parámetros extraídos: {params}")
                properties = query_properties(params)
                
                if not properties:
                    bot_response = "No encontré propiedades que coincidan con tu búsqueda. ¿Quieres ajustar los detalles o añadir más características visuales?"
                else:
                    response = "¡Encontré estas propiedades que podrían interesarte!\n\n"
                    for i, prop in enumerate(properties, 1):
                        visualizaciones = prop.get('tipo_visualizaciones_nombres', [])
                        # Filtra None de la lista de visualizaciones
                        visualizaciones = ', '.join([v for v in visualizaciones if v is not None]) if visualizaciones else 'Ninguna especificada'
                        
                        tags = prop.get('tags_visuales', [])
                        # PARTE CORREGIDA para evitar el error 'NoneType'
                        tags_str_list = []
                        for sublist in tags:
                            if sublist is not None and isinstance(sublist, str):
                                tags_str_list.extend([tag.strip() for tag in sublist.split(', ') if tag.strip()])
                        
                        tags_str = ', '.join(tags_str_list)
                        if not tags_str:
                            tags_str = 'No especificados'
                        # FIN DE LA PARTE CORREGIDA

                        response += f"{i}. **{prop.get('nombre', 'Sin nombre')}** - {prop.get('tipo_propiedad_nombre', 'Sin tipo')} en {prop.get('localidad_nombre', 'Sin localidad')}\n"
                        response += f"   • Dormitorios: {prop.get('cantidadDormitorios', 'N/A')}, Baños: {prop.get('cantidadBanios', 'N/A')}, Ambientes: {prop.get('cantidadAmbientes', 'N/A')}\n"
                        response += f"   • Superficie: {prop.get('superficie', 'N/A')} m², Precio: ${prop.get('precio', 0):,}\n"
                        response += f"   • Estilo: {prop.get('estilo_arquitectonico_nombre', 'N/A')}, Visualizaciones: {visualizaciones}\n"
                        response += f"   • Tags Visuales: {tags_str}\n"
                        response += f"   • Dirección: {prop.get('direccion', 'Sin dirección')}\n\n"
                    response += "Elige un número (ej: 'más info sobre la 1') o describe otra búsqueda para refinar."
                    bot_response = response
        
        # Actualizar el historial de la conversación
        timestamp = datetime.now().strftime("%Y-%m-%d %H:M:%S")
        conversation_histories[session_id] = (
            f"{history}\n[{timestamp}] Usuario: {user_query}\n[{timestamp}] Asistente: {bot_response}\n"
        )
        logger.info(f"Historial actualizado (session_id: {session_id}): {conversation_histories[session_id]}")
        
        return jsonify({
            "response": bot_response,
            "properties": [dict(prop) for prop in properties] if properties else [],
            "params": params if params else {}
        })
    except Exception as e:
        logger.error(f"Error en el endpoint /chat: {e}")
        return jsonify({"error": "Error interno del servidor. Revisa los logs."}), 500

# Endpoint de salud
@app.route('/health', methods=['GET'])
def health():
    """Endpoint para verificar si el servicio está vivo."""
    return jsonify({"status": "OK", "model": "Gemini 2.5-flash"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)