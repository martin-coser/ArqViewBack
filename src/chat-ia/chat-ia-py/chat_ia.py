from flask import Flask, request, jsonify
import google.generativeai as genai
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import logging
import re
from datetime import datetime
import uuid
import os 
from copy import deepcopy 

# --- Configuración Inicial y Seguridad ---

# Configuración de logging para depuración
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# SEGURIDAD: USAR VARIABLES DE ENTORNO EN PRODUCCIÓN
# Se mantiene hardcodeado solo para este ejemplo, pero debes usar os.getenv
GM_API_KEY = "AIzaSyAk_Wk1nlXWeUm07T5t70Mbp_mIvekoqg0" 

genai.configure(api_key=GM_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# Configuración de la base de datos (USAR VARIABLES DE ENTORNO EN PRODUCCIÓN)
DB_CONFIG = {
    "dbname": "arqview",
    "user": "postgres",
    "password": "postgres",
    "host": "localhost",
    "port": 5432
}

# Estructura de Sesión para guardar texto Y parámetros.
conversation_histories = {}

# --- Funciones de IA ---

def extract_parameters(user_query):
    """
    Extrae parámetros SÓLO de la consulta actual usando Gemini API.
    **MODIFICADO:** Restringe tagsVisuales a solo espacios + adjetivos (grande, luminoso, etc.).
    """
    prompt = f"""
    Eres un asistente de búsqueda de propiedades. Tu única tarea es extraer **SÓLO** los siguientes parámetros
    mencionados **explícitamente** en la 'Consulta del usuario' en formato JSON estricto.
    
    NO asumas valores de interacciones pasadas. Si el usuario no menciona un parámetro, **omítelo del JSON o usa null**.

    Si el usuario menciona 'propiedad' o 'propiedades' sin especificar tipo, no asumas un tipoPropiedad y deja el campo como null, indicando que necesita más detalles.

    **REGLA DE TAGS VISUALES**: Si el usuario menciona características visuales de **espacios** acompañados de un adjetivo descriptivo (ej: 'cocina grande', 'habitación luminosa', 'baño pequeño', 'living oscuro'), agrégalas como strings en el array **tagsVisuales**. **OMITE** cualquier otra característica (como 'balcón', 'pileta', 'asador', 'garage') de los tagsVisuales.
    
    Si el usuario menciona características de **equipamiento** ('balcón', 'pileta', 'asador', 'garage') o de **ambiente/uso** ('ideal para estudiantes', 'cerca del parque', 'soleado', 'tranquilo'), extrae toda esa frase en el campo **contentFilter**. Si hay varios, combina las frases de ambiente y equipamiento en una sola frase coherente.
    
    Si el usuario menciona una 'familia grande', '4 o 5 personas' o 'más personas', interpreta que necesitan al menos 3 habitaciones; si dice '5 o más personas', asigna un mínimo de 3 habitaciones.
    Si el usuario solo saluda, agradece o charla (e.g., 'hola cómo estás', 'genial muchas gracias'), no extraigas parámetros y devuelve un JSON vacío, **A MENOS** que se mencione un comando de reinicio.
    
    Si el usuario indica una intención de REINICIAR o CANCELAR la búsqueda actual (ej: 'empezar de cero', 'olvídalo', 'nueva búsqueda', 'comencemos de nuevo'), agrega el campo **"reset_search": true** al JSON.
    NO INCLUYAS texto adicional, solo el JSON.

    Parámetros:
    - tipoOperacion: 'venta' o 'alquiler' (solo si se menciona explícitamente)
    - tipoPropiedad: e.g., 'casa', 'departamento', 'terreno', 'chalet', 'duplex' (solo si se menciona explícitamente)
    - localidad: e.g., 'Villa Maria', 'Córdoba', 'Federacion' (solo si se menciona explícitamente)
    - cantidadDormitorios: número entero (solo si se menciona explícitamente)
    - cantidadBanios: número entero (solo si se menciona explícitamente)
    - cantidadAmbientes: número entero (solo si se menciona explícitamente)
    - precioMax: número decimal (solo si se menciona explícitamente)
    - superficieMin: número entero (solo si se menciona explícitamente)
    - estiloArquitectonico: e.g., 'moderno', 'clásico' (solo si se menciona explícitamente)
    - tipoVisualizaciones: lista de strings, e.g., ['vista al mar', 'vista a la montaña'] (solo si se menciona explícitamente)
    - tagsVisuales: lista de strings, e.g., ['dormitorio grande', 'baño pequeño'] (solo incluye espacios con adjetivos descriptivos)
    - reset_search: bool (true si el usuario quiere reiniciar la búsqueda)
    - **contentFilter**: string con frases descriptivas de uso, ambiente y equipamiento (ej: "ideal para estudiantes, con pileta y asador")

    Consulta del usuario: "{user_query}"

    Responde SOLO con el JSON válido. Ejemplo: {{"tipoPropiedad": "casa", "contentFilter": "muy tranquilo"}} o {{"localidad": "Villa María"}}, o vacio si es un saludo, o {{"reset_search": true}} si es un reinicio.
    """
    try:
        response = model.generate_content(prompt)
        json_str = response.text.strip()
        
        # Limpiar bloques Markdown
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
    - Si el usuario agradece o se despide (e.g., 'Genial muchas gracias', 'adiós'), responde amablemente y cierra la interacción, invitándolo a volver pronto.
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

# --- Función de Búsqueda en DB ---

def query_properties(params):
    """
    Consulta propiedades aplicando todos los filtros y priorizando por
    relevancia de Full-Text Search si se proporciona un contentFilter.
    """
    
    # 1. Preparación y FTS Rank
    content_filter = params.get('contentFilter')
    rank_select = ""
    
    try:
        conn = psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
        cur = conn.cursor()
        
        # Lista final de parámetros para la ejecución de la consulta
        sql_params = []
        
        # Condición de FTS (Si existe, debe ser el primer parámetro)
        if content_filter:
            # Creamos una columna temporal de rankeo
            rank_select = f", ts_rank(to_tsvector('spanish', p.descripcion), plainto_tsquery('spanish', %s)) AS rank"
            sql_params.append(content_filter) 
        
        # Columnas de selección (sin cambios)
        select_columns = [
            'p.id', 'p.nombre', 'p.descripcion', 'p.direccion', 'p.precio', 'p.superficie',
            'p."cantidadBanios"', 'p."cantidadDormitorios"', 'p."cantidadAmbientes"', 'p."tipoOperacion"',
            'p.latitud', 'p.longitud',
            'l.nombre as localidad_nombre',
            'tp.nombre as tipo_propiedad_nombre',
            'ea.nombre as estilo_arquitectonico_nombre',
            'array_agg(DISTINCT tv.nombre) as tipo_visualizaciones_nombres',
            'array_agg(i.tags_visuales) as tags_visuales' 
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
        
        # APLICACIÓN DE FILTRO DE FTS (¡CLAVE!)
        if content_filter:
            # Solo se buscan propiedades donde la descripción coincida con el content_filter
            conditions.append(f"to_tsvector('spanish', p.descripcion) @@ plainto_tsquery('spanish', %s)")
            sql_params.append(content_filter) # Este parámetro ahora es el $2 (o el $1 si no había rank)

        # Mapeo de Operaciones
        tipo_operacion_map = {
            'compra': 'VENTA',
            'venta': 'VENTA',
            'alquiler': 'ALQUILER'
        }
        
        tipo_operacion = params.get('tipoOperacion')
        if tipo_operacion and tipo_operacion.lower() in tipo_operacion_map:
            conditions.append(f"p.\"tipoOperacion\" = %s")
            sql_params.append(tipo_operacion_map[tipo_operacion.lower()])
        elif params.get('tipoPropiedad') and not tipo_operacion:
            conditions.append(f"p.\"tipoOperacion\" IN (%s, %s)")
            sql_params.extend(['VENTA', 'ALQUILER'])

        # Filtros Estructurados (el resto es igual)
        if params.get('tipoPropiedad'):
            conditions.append("tp.nombre ILIKE %s")
            sql_params.append(f"%{params['tipoPropiedad']}%")
        
        if params.get('localidad'):
            conditions.append("l.nombre ILIKE %s")
            sql_params.append(f"%{params['localidad']}%")
        
        # ... (Otros filtros como cantidadDormitorios, precioMax, etc., que no cambian)
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

        # Lógica de Tags Visuales (Sin cambios)
        if params.get('tagsVisuales') and params['tagsVisuales']:
            like_patterns = []
            for tag in params['tagsVisuales']:
                parts = tag.split()
                if len(parts) >= 2:
                    space_part = parts[0]
                    features = ' '.join(parts[1:])
                    full_tag = f"%{space_part},{features}%"
                    like_patterns.append(full_tag)
            
            if like_patterns:
                tag_conditions = []
                for _ in like_patterns:
                    # Usamos un marcador de posición que psycopg2 reemplaza
                    tag_conditions.append("EXISTS (SELECT 1 FROM imagen2d i_sub WHERE i_sub.propiedad_id = p.id AND i_sub.tags_visuales ILIKE %s)")
                
                conditions.append(" AND ".join(tag_conditions))
                sql_params.extend(like_patterns)

        if conditions:
            # Aplica todos los filtros al WHERE
            sql_from += " AND " + " AND ".join(conditions)
                
        # Armado de la consulta completa
        sql = sql_select + sql_from
        
        sql += " GROUP BY p.id, l.nombre, tp.nombre, ea.nombre"
        
        # Lógica de Ordenación por Relevancia (FTS)
        sql_order = " ORDER BY "
        if content_filter:
            sql_order += "rank DESC, " # Ordena primero por relevancia FTS
            
        sql_order += "p.precio ASC LIMIT 10"
        
        sql += sql_order
        
        logger.info(f"SQL: {sql}, Params: {sql_params}")
        
        try:
            cur.execute(sql, sql_params) 
            results = cur.fetchall()
        except psycopg2.ProgrammingError as e:
            logger.error(f"Error en la consulta SQL (verificar FTS en DB): {e}")
            results = [] 
        
        cur.close()
        conn.close()
        return results
    except Exception as e:
        logger.error(f"Error al consultar la base de datos: {e}")
        return []

# --- Endpoint Principal ---

@app.route('/chat', methods=['POST'])
def chat():
    """Endpoint principal para procesar consultas del chat con historial y fusión de contexto."""
    try:
        data = request.json
        user_query = data.get('message', '')
        
        session_id = data.get('session_id')
        if not session_id:
            session_id = str(uuid.uuid4())
            logger.info(f"Nuevo session_id generado: {session_id}")
        
        if not user_query:
              return jsonify({"error": "Se requiere el campo 'message' en la solicitud", "session_id": session_id}), 400

        logger.info(f"Consulta del usuario (session_id: {session_id}): {user_query}")
        
        # 1. Recuperar el historial de texto y los parámetros anteriores
        history_data = conversation_histories.get(session_id, {'text': "", 'params': {}})
        history = history_data['text']
        old_params = history_data['params']
        
        # Extraer solo los parámetros nuevos/modificados de la consulta actual
        new_params = extract_parameters(user_query)
        print(f"Parámetros extraídos: {new_params}") # Mantenido el print del código original
        
        # Inicializar variables
        params = deepcopy(old_params)
        bot_response = ""
        properties = []

        # Lógica de Reinicio
        if new_params.get('reset_search'):
            logger.info("Comando de reinicio detectado. Borrando contexto de búsqueda.")
            params = {} 
            bot_response = get_conversational_response("El usuario ha solicitado un reinicio de búsqueda. Confirma el reinicio y pregunta por el nuevo tipo de propiedad o localidad.", history)
            
        else:
            # Lógica de Fusión de Contexto
            for key, value in new_params.items():
                if value is not None and (not isinstance(value, list) or value):
                    params[key] = value
            
            # Lógica de Priorización de Flujo y Conversación
            has_minimal_params = params.get('tipoPropiedad') and params.get('localidad')

            if not new_params and not has_minimal_params: # Saludo inicial, la búsqueda está vacía
                  bot_response = get_conversational_response(user_query, history)
            
            elif not new_params and has_minimal_params: # Conversación social tras una búsqueda exitosa
                # Opcional: Podrías mantener los resultados previos si los guardaste, pero aquí se regeneran si el usuario refina.
                bot_response = get_conversational_response(user_query, history)
                
            # Caso C: Faltan datos críticos, pero se detectaron nuevos parámetros
            elif not has_minimal_params:
                # El contentFilter no cuenta como parámetro mínimo
                if not params.get('tipoPropiedad') and not params.get('localidad'):
                    prompt_falta = "Busco una propiedad pero no especificaste ni el tipo ni la localidad"
                elif params.get('tipoPropiedad') and not params.get('localidad'):
                    prompt_falta = f"Busco una {params.get('tipoPropiedad')} pero no especificaste la localidad"
                else: # params.get('localidad') y not params.get('tipoPropiedad')
                    prompt_falta = f"Busco propiedades en {params.get('localidad')} pero no especificaste tipo"
                    
                bot_response = get_conversational_response(prompt_falta, history)
                
            # Caso D: Tenemos los datos mínimos para buscar (y quizás refinos), ¡A buscar!
            else:
                logger.info(f"Parámetros finales fusionados: {params}")
                properties = query_properties(params)
                
                if not properties:
                    bot_response = "No encontré propiedades que coincidan con tu búsqueda. ¿Quieres ajustar los detalles, añadir más características visuales o cambiar la localidad?"
                else:
                    response_parts = ["¡Encontré estas propiedades que podrían interesarte! Están ordenadas para que veas primero las que mejor coinciden con tus comentarios descriptivos.\n\n"]
                    
                    for i, prop in enumerate(properties, 1):
                        visualizaciones = prop.get('tipo_visualizaciones_nombres', [])
                        visualizaciones = ', '.join([v for v in visualizaciones if v is not None]) if visualizaciones else 'Ninguna especificada'
                        
                        tags = prop.get('tags_visuales', [])
                        tags_str_list = []
                        for sublist in tags:
                            if sublist is not None and isinstance(sublist, str):
                                # Limpieza simple de los tags para mostrar
                                tags_str_list.extend([tag.strip() for tag in sublist.split(', ') if tag.strip()])
                        
                        tags_str = ', '.join(list(set(tags_str_list))) 
                        if not tags_str:
                            tags_str = 'No especificados'

                        # Formato de respuesta de propiedades
                        # Opcional: Mostrar el rank si se desea para depuración
                        rank_display = f" (Rank: {prop.get('rank'):.2f})" if params.get('contentFilter') and prop.get('rank') is not None else ""
                        
                        response_parts.append(f"{i}. **{prop.get('nombre', 'Sin nombre')}**{rank_display} [ID:{prop.get('id')}] - {prop.get('tipo_propiedad_nombre', 'Sin tipo')} en {prop.get('localidad_nombre', 'Sin localidad')}\n")
                        response_parts.append(f"   • Dormitorios: {prop.get('cantidadDormitorios', 'N/A')}, Baños: {prop.get('cantidadBanios', 'N/A')}, Ambientes: {prop.get('cantidadAmbientes', 'N/A')}\n")
                        response_parts.append(f"   • Superficie: {prop.get('superficie', 'N/A')} m², Precio: ${prop.get('precio', 0):,}\n")
                        response_parts.append(f"   • Estilo: {prop.get('estilo_arquitectonico_nombre', 'N/A')}, Visualizaciones: {visualizaciones}\n")
                        response_parts.append(f"   • Tags Visuales: {tags_str}\n")
                        response_parts.append(f"   • Dirección: {prop.get('direccion', 'Sin dirección')}\n\n")
                        
                    response_parts.append("Elige un número (ej: 'más info sobre la 1') o usa el botón 'Ver Detalle' para más información. Describe otra búsqueda para refinar.")
                    bot_response = "".join(response_parts)

        # 3. Actualizar el historial de la conversación y los parámetros
        timestamp = datetime.now().strftime("%Y-%m-%d %H:M:%S")
        conversation_histories[session_id] = {
            'text': f"{history}\n[{timestamp}] Usuario: {user_query}\n[{timestamp}] Asistente: {bot_response}\n",
            'params': params
        }
            
        # Devolver la respuesta
        return jsonify({
            "response": bot_response,
            "properties": [dict(prop) for prop in properties] if properties else [],
            "params": params, 
            "session_id": session_id 
        })
    except Exception as e:
        logger.error(f"Error en el endpoint /chat: {e}")
        return jsonify({"error": "Error interno del servidor. Revisa los logs.", "session_id": session_id}), 500

# Endpoint de salud
@app.route('/health', methods=['GET'])
def health():
    """Endpoint para verificar si el servicio está vivo."""
    return jsonify({"status": "OK", "model": "Gemini 2.5-flash"})

if __name__ == '__main__':
    # Usar puerto 5000 por defecto
    app.run(host='0.0.0.0', port=5000, debug=True)