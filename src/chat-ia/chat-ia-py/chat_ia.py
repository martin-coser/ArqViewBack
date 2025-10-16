from flask import Flask, request, jsonify
import google.generativeai as genai
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import logging
import os
import re
from datetime import datetime

# =================================================================
# 1. CONFIGURACIÓN INICIAL
# =================================================================

# Configuración de logging para depuración
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configura Gemini con la API key hardcodeada
# NOTA: HE UTILIZADO UNA CLAVE DUMMY AQUÍ PARA CUMPLIR CON EL FORMATO, 
# ASEGÚRATE DE QUE LA TUYA ES CORRECTA Y NO LA EXPONGAS EN PRODUCCIÓN.
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

# Sistema de sesiones en memoria
conversation_histories = {}
# Almacena el payload completo de la última búsqueda para detalles
last_search_results = {} 


# =================================================================
# 2. FUNCIONES DE AI
# =================================================================

def extract_parameters(user_query):
    """Extrae parámetros de la consulta del usuario usando Gemini API."""
    prompt = f"""
        Eres un asistente de búsqueda de propiedades. Extrae los siguientes parámetros de la consulta en formato JSON estricto.
    
    INSTRUCCIONES CLAVE:
    1.  **Omisión:** NO asumas valores por defecto. Si el usuario no menciona un parámetro, debe ser **null**. Si el usuario solo saluda o charla, devuelve un JSON vacío ({{}}).
    2.  **Propiedad genérica:** Si se menciona 'propiedad' sin especificar tipo (ej: 'una propiedad en La Falda'), deja 'tipoPropiedad' como **null**.
    3.  **Espacios y Características (Doble Filtrado):**
        a.  Si el usuario menciona un **espacio específico** (ej: 'pileta', 'balcón', 'asador', 'patio', 'garage', etc.) o múltiples (ej: 'pileta y balcón'), debes incluirlos en **'tagsVisuales'** como una **lista de strings**.
        b.  **TODAS** las características mencionadas en el punto (a) **DEBEN** agregarse también en **'texto_en_descripcion'** como un **único string separado por comas** (ej: 'pileta, balcón, asador'). La propiedad será válida si cualquiera de los términos de 'tagsVisuales' coincide en el base de datos o si cualquiera de los términos de 'texto_en_descripcion' coincide.
        c.  **Excepción de TagsVisuales:** Si el usuario menciona una característica visual **descriptiva** (ej: 'dormitorio grande', 'baño pequeño'), agrégala **solo** a 'tagsVisuales' y **no** a 'texto_en_descripcion'.
    4.  **Habitaciones:** 'familia grande', '4 o 5 personas' o 'más personas' implica 'cantidadDormitorios': 3. '5 o más personas' implica 'cantidadDormitorios': 4.
    5.  **Detalle:** Si el usuario solicita detalles (ej: 'más info sobre la 1'), extrae el **número de índice** en 'propiedad_id_solicitada' y deja los demás campos como **null**.

    Parámetros (JSON Estricto):
    - tipoOperacion: 'venta' o 'alquiler'
    - tipoPropiedad: e.g., 'casa', 'departamento'
    - localidad: e.g., 'Villa Maria'
    - cantidadDormitorios: número entero
    - cantidadBanios: número entero
    - cantidadAmbientes: número entero
    - precioMax: número decimal
    - superficieMin: número entero
    - estiloArquitectonico: e.g., 'moderno', 'clásico'
    - tipoVisualizaciones: lista de strings
    - tagsVisuales: lista de strings de espacios (ej: ['pileta', 'balcon']) O descripciones visuales (ej: ['dormitorio grande']).
    - propiedad_id_solicitada: número entero que indica el índice (1, 2, etc.) de la propiedad listada.
    - texto_en_descripcion: string con todos los espacios y características textuales a buscar, **separados por coma** (ej: 'pileta, balcon, patio').

    Consulta del usuario: "{user_query}"

    Responde SOLO con el JSON válido.
"""
    try:
        response = model.generate_content(prompt)
        json_str = response.text.strip()
        logger.info(f"Respuesta de Gemini (parámetros): {json_str}")
        
        # Limpiar bloques Markdown (```json ... ```)
        json_str = re.sub(r'^```json\s*|\s*```$', '', json_str, flags=re.MULTILINE).strip()
        
        # Manejar caso de JSON vacío si el modelo solo devuelve {}
        if not json_str:
            return {}
            
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
    Responde de manera natural y conversacional al usuario, usando el historial.
    Si el usuario saluda, pregunta qué tipo de propiedad o lugar le interesa.
    Si faltan parámetros clave (tipo/localidad), pidelos amigablemente.
    Mantén las respuestas cortas y directas.
    Historial de la conversación: {history}
    Mensaje del usuario: "{user_query}"
    Responde SOLO con el texto de la respuesta, sin formato JSON ni código.
    """
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Error al generar respuesta conversacional: {e}")
        return "¡Hola! ¿En qué puedo ayudarte hoy con tu búsqueda de propiedades?"

def query_properties(params):
    """Consulta la base de datos con los parámetros extraídos, incluyendo filtros flexibles por descripción."""
    conditions = [] 
    sql_params = [] 
    
    try:
        conn = psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
        cur = conn.cursor()
        
        select_columns = [
            'p.id', 'p.nombre', 'p.descripcion', 'p.direccion', 'p.precio', 'p.superficie',
            'p."cantidadBanios"', 'p."cantidadDormitorios"', 'p."cantidadAmbientes"', 'p."tipoOperacion"',
            'p.latitud', 'p.longitud',
            'l.nombre as localidad_nombre', 'tp.nombre as tipo_propiedad_nombre',
            'ea.nombre as estilo_arquitectonico_nombre',
            'array_agg(tv.nombre) as tipo_visualizaciones_nombres',
            'array_agg(i.tags_visuales) as tags_visuales' 
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
        
        # Filtros estrictos (tipo, localidad, etc.)
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
        
        if params.get('precioMax') is not None:
            conditions.append("p.precio <= %s")
            sql_params.append(params['precioMax'])

        # 🎯 LÓGICA CLAVE: BÚSQUEDA FLEXIBLE EN DESCRIPCIÓN (OR) 
        descripcion_terms = params.get('texto_en_descripcion')
        
        if descripcion_terms:
            # Dividir los términos por coma y limpiar espacios
            terms = [term.strip() for term in descripcion_terms.split(',') if term.strip()]
            
            if terms:
                desc_conditions = []
                for term in terms:
                    # Aplicar ILIKE a cada término con comodines %
                    desc_conditions.append("p.descripcion ILIKE %s")
                    sql_params.append(f"%{term}%")
                
                # Agregamos las condiciones OR entre paréntesis
                conditions.append("(" + " OR ".join(desc_conditions) + ")")

        # Otros filtros (estilo, visualizaciones, tags visuales)
        if params.get('cantidadBanios') is not None:
            conditions.append("p.\"cantidadBanios\" = %s")
            sql_params.append(params['cantidadBanios'])
        
        if params.get('cantidadAmbientes') is not None:
            conditions.append("p.\"cantidadAmbientes\" >= %s")
            sql_params.append(params['cantidadAmbientes'])
        
        if params.get('superficieMin') is not None:
            conditions.append("p.superficie >= %s")
            sql_params.append(params['superficieMin'])
        
        if params.get('estiloArquitectonico'):
            conditions.append("ea.nombre ILIKE %s")
            sql_params.append(f"%{params['estiloArquitectonico']}%")
        
        if params.get('tipoVisualizaciones') and params['tipoVisualizaciones']:
            conditions.append("tv.nombre = ANY(%s)")
            sql_params.append(params['tipoVisualizaciones'])
        
        if params.get('tagsVisuales') and params['tagsVisuales']:
            like_patterns = []
            for tag in params['tagsVisuales']:
                space_part = tag.split()[0] 
                features = tag.split()[1:] 
                full_tag = f"{space_part},{' '.join(features)}" 
                like_patterns.append(f"%{full_tag}%")
            conditions.append("i.tags_visuales ILIKE ANY (%s)")
            sql_params.append(like_patterns)

        if conditions:
            sql += " AND " + " AND ".join(conditions)
        
        sql += " GROUP BY p.id, l.nombre, tp.nombre, ea.nombre HAVING COUNT(DISTINCT i.id) > 0 ORDER BY p.precio ASC LIMIT 10"
        
        logger.info(f"SQL: {sql}, Params: {sql_params}")
        
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

# =================================================================
# 3. ENDPOINT PRINCIPAL /CHAT
# =================================================================

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
        
        history = conversation_histories.get(session_id, "")
        
        params = extract_parameters(user_query)
        bot_response = ""
        properties = [] 
        
        # 1. MANEJO DE SOLICITUD DE DETALLES (PRIORITARIO)
        prop_index_solicitado = params.get('propiedad_id_solicitada')

        if prop_index_solicitado is not None:
            try:
                prop_index = int(prop_index_solicitado) - 1
                last_results = last_search_results.get(session_id, [])
                
                if 0 <= prop_index < len(last_results):
                    prop_details = last_results[prop_index]
                    precio = prop_details.get('precio', 0)
                    
                    bot_response = f"¡Claro! Aquí tienes la información detallada de la propiedad **{prop_details.get('nombre', 'Sin nombre')}** ({prop_details.get('tipo_propiedad_nombre', 'N/A')} en {prop_details.get('localidad_nombre', 'N/A')}):\n\n"
                    bot_response += f"**Descripción Completa:** {prop_details.get('descripcion', 'No se proporcionó una descripción completa.')}\n\n"
                    bot_response += f" • Dirección: {prop_details.get('direccion', 'N/A')}, Precio: **${precio:,.0f}**\n"
                    bot_response += f" • Dormitorios: {prop_details.get('cantidadDormitorios', 'N/A')}, Baños: {prop_details.get('cantidadBanios', 'N/A')}\n"
                    bot_response += f" • Superficie: {prop_details.get('superficie', 'N/A')} m², Estilo: {prop_details.get('estilo_arquitectonico_nombre', 'N/A')}\n\n"
                    bot_response += "¿Hay algo más que te gustaría saber o quieres refinar tu búsqueda? 🤔"
                    
                else:
                    bot_response = "Lo siento, ese número de propiedad no es válido. Por favor, elige un número de la lista que te mostré anteriormente (ej: 'más info sobre la 1')."
                
                # Finaliza el flujo de detalle aquí
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                conversation_histories[session_id] = (
                    f"{history}\n[{timestamp}] Usuario: {user_query}\n[{timestamp}] Asistente: {bot_response}\n"
                )
                return jsonify({
                    "response": bot_response,
                    "properties": [], # No devolvemos lista de propiedades en un detalle
                    "params": params if params else {}
                })
            except ValueError:
                pass 
        
        # 2. FLUJO NORMAL: BÚSQUEDA O CONVERSACIÓN
        if not params or not any(v for k, v in params.items() if k not in ['propiedad_id_solicitada', 'tagsVisuales', 'texto_en_descripcion'] and v is not None):
            # Si no hay parámetros útiles (es un saludo o chat)
            bot_response = get_conversational_response(user_query, history)
        else:
            # Lógica de verificación de parámetros clave (tipoPropiedad, localidad)
            if not params.get('tipoPropiedad') and not params.get('localidad'):
                bot_response = get_conversational_response("Busco una propiedad pero no especificaste ni el tipo ni la localidad", history)
            elif params.get('tipoPropiedad') and not params.get('localidad'):
                bot_response = get_conversational_response(f"Busco una {params.get('tipoPropiedad')} pero no especificaste la localidad", history)
            elif params.get('localidad') and not params.get('tipoPropiedad'):
                bot_response = get_conversational_response(f"Busco propiedades en {params.get('localidad')} pero no especificaste tipo", history)
            else:
                # 🎯 BÚSQUEDA REAL
                logger.info(f"Parámetros extraídos para búsqueda: {params}")
                properties = query_properties(params)
                
                # 🌟 GUARDAR LA LISTA COMPLETA DE PROPIEDADES PARA EL DETALLE
                last_search_results[session_id] = properties
                
                if not properties:
                    bot_response = "No encontré propiedades que coincidan con tu búsqueda. ¿Quieres ajustar los detalles o añadir más características visuales?"
                else:
                    response = "¡Encontré estas propiedades que podrían interesarte!\n\n"
                    for i, prop in enumerate(properties, 1):
                        visualizaciones = prop.get('tipo_visualizaciones_nombres', [])
                        visualizaciones = ', '.join([v for v in visualizaciones if v is not None]) if visualizaciones else 'Ninguna especificada'
                        
                        tags = prop.get('tags_visuales', [])
                        tags_str_list = []
                        for sublist in tags:
                            if sublist is not None and isinstance(sublist, str):
                                tags_str_list.extend([tag.strip() for tag in sublist.split(', ') if tag.strip()])
                            
                        tags_str = ', '.join(tags_str_list)
                        if not tags_str:
                            tags_str = 'No especificados'

                        response += f"{i}. **{prop.get('nombre', 'Sin nombre')}** - {prop.get('tipo_propiedad_nombre', 'Sin tipo')} en {prop.get('localidad_nombre', 'Sin localidad')}\n"
                        response += f"   • Dormitorios: {prop.get('cantidadDormitorios', 'N/A')}, Baños: {prop.get('cantidadBanios', 'N/A')}, Ambientes: {prop.get('cantidadAmbientes', 'N/A')}\n"
                        # Precio con formato de miles
                        response += f"   • Superficie: {prop.get('superficie', 'N/A')} m², Precio: ${prop.get('precio', 0):,.0f}\n" 
                        response += f"   • Estilo: {prop.get('estilo_arquitectonico_nombre', 'N/A')}, Visualizaciones: {visualizaciones}\n"
                        response += f"   • Tags Visuales: {tags_str}\n"
                        response += f"   • Dirección: {prop.get('direccion', 'Sin dirección')}\n\n"
                        
                    response += "Elige un número (ej: **'más info sobre la 1'**) o describe otra búsqueda para refinar. 🔍"
                    bot_response = response
        
        # 3. Actualizar el historial y devolver el JSON final
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
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