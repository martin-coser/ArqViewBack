import os
import httpx
import json
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

# --- CONFIGURACIÓN INICIAL ---

# Cargar las variables de entorno (tu API key) desde el archivo .env
load_dotenv()

# Configurar la API de Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("No se encontró la GEMINI_API_KEY en el archivo .env")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('models/gemini-pro-latest')

# URL de tu backend de NestJS
NESTJS_API_URL = "http://localhost:3000/propiedad/search-chatbot"

# Inicializar la aplicación FastAPI
app = FastAPI(
    title="Chatbot Inmobiliario API",
    description="API para orquestar la conversación y búsqueda de propiedades.",
    version="1.0.0"
)

# --- MODELOS DE DATOS (para validar las entradas de la API) ---

class ChatRequest(BaseModel):
    session_id: str
    message: str

# Simulación de una base de datos en memoria para el historial de conversaciones
# En producción, esto debería ser una base de datos real como Redis.
conversation_histories = {}


# --- LÓGICA DEL CHATBOT ---

def get_prompt_for_criteria_extraction():
    """
    Crea el prompt principal que le da instrucciones a Gemini para extraer
    los criterios de búsqueda de la conversación del usuario.
    """
    return """
    Eres un asistente virtual experto en bienes raíces para la plataforma 'ArqView'.
    Tu objetivo es analizar la conversación con un usuario y extraer sus criterios de búsqueda 
    de propiedades en un formato JSON estructurado.

    CRITERIOS DE BÚSQUEDA DISPONIBLES:
    - tipoPropiedad: string (ej: "casa", "departamento", "oficina")
    - tipoOperacion: string (SOLO puede ser 'COMPRA', 'VENTA', o 'ALQUILER')
    - localidad: string (ej: "Villa María", "Córdoba Capital")
    - cantidadDormitorios: integer
    - precioMax: integer
    - tags: list[string] (características subjetivas como "luminoso", "patio", "moderno", "grande", "cocina")

    INSTRUCCIONES:
    1.  Analiza el "Mensaje del usuario" actual, usando el "Historial de conversación" como contexto.
    2.  Extrae CUALQUIER criterio que el usuario mencione.
    3.  Si el usuario menciona un rango de precios, usa el valor más alto para "precioMax".
    4.  Si el usuario no proporciona suficiente información para una búsqueda, devuelve un JSON con el campo "ask_clarification" y una pregunta amigable para obtener más detalles.
    5.  Tu respuesta DEBE SER ÚNICAMENTE un objeto JSON, sin texto adicional antes o después.

    EJEMPLOS:
    -   Usuario: "Hola, busco una casa de 2 dormitorios en Villa María"
        Respuesta JSON: {"criteria": {"tipoPropiedad": "casa", "cantidadDormitorios": 2, "localidad": "Villa María"}}
    -   Usuario: "Algo que sea luminoso y con patio"
        Respuesta JSON: {"criteria": {"tags": ["luminoso", "patio"]}}
    -   Usuario: "hola que tal"
        Respuesta JSON: {"ask_clarification": "¡Hola! Claro, estoy para ayudarte. ¿Qué tipo de propiedad estás buscando?"}
    
    Ahora, analiza la siguiente conversación.
    """

async def extract_search_criteria(user_message: str, history: str) -> dict:
    """
    Llama a la API de Gemini para extraer los criterios de búsqueda.
    """
    prompt = get_prompt_for_criteria_extraction()
    full_prompt = f"{prompt}\n--- HISTORIAL DE CONVERSACIÓN ---\n{history}\n--- MENSAJE DEL USUARIO ---\n{user_message}"
    
    try:
        response = model.generate_content(full_prompt)
        # Limpiar la respuesta para asegurarse de que es un JSON válido
        cleaned_response = response.text.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned_response)
    except (json.JSONDecodeError, Exception) as e:
        print(f"Error al procesar la respuesta de Gemini: {e}")
        return {"ask_clarification": "No pude entender del todo tu pedido, ¿podrías reformularlo?"}

async def search_properties_in_backend(criteria: dict) -> list:
    """
    Llama al endpoint del backend de NestJS para buscar propiedades.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(NESTJS_API_URL, json=criteria, timeout=10.0)
            
            if response.status_code == 200:
                return response.json()
            # Si NestJS devuelve 404 (Not Found), devolvemos una lista vacía.
            elif response.status_code == 404:
                return []
            else:
                # Para otros errores del servidor
                print(f"Error en el backend NestJS: {response.status_code} - {response.text}")
                return None
    except httpx.RequestError as e:
        print(f"No se pudo conectar con el backend de NestJS: {e}")
        return None

def format_properties_for_user(properties: list) -> str:
    """
    Toma la lista de propiedades y le pide a Gemini que la resuma amigablemente.
    """
    if not properties:
        return "Lo siento, no encontré ninguna propiedad que coincida exactamente con tu búsqueda. ¿Te gustaría que la ampliemos un poco?"

    # Simplificamos la data para no exceder el límite de tokens del prompt
    simplified_properties = [
        f"- {p.get('nombre', 'Propiedad sin nombre')} en {p.get('direccion', 'dirección no especificada')}, ${p.get('precio', 0)}"
        for p in properties
    ]
    
    prompt = f"""
    Eres un asistente inmobiliario. Has encontrado las siguientes propiedades para un cliente.
    Resume esta lista de forma amigable y conversacional. Menciona que encontraste algunas opciones interesantes 
    y presenta la lista de forma clara. Termina preguntándole si quiere más detalles sobre alguna de ellas.
    
    Propiedades encontradas:
    {", ".join(simplified_properties)}
    """
    
    response = model.generate_content(prompt)
    return response.text


# --- ENDPOINT DE LA API ---

@app.post("/chat")
async def handle_chat(request: ChatRequest):
    """
    Endpoint principal que maneja la conversación del chat.
    """
    # 1. Recuperar o inicializar el historial de la conversación
    history = conversation_histories.get(request.session_id, "")
    
    # 2. Extraer criterios de búsqueda con Gemini
    llm_response = await extract_search_criteria(request.message, history)
    
    bot_response_text = ""
    
    if "ask_clarification" in llm_response:
        # 3a. Si Gemini necesita más información, devuelve su pregunta
        bot_response_text = llm_response["ask_clarification"]
    
    elif "criteria" in llm_response:
        # 3b. Si se extrajeron criterios, buscar propiedades en el backend
        search_criteria = llm_response["criteria"]
        properties = await search_properties_in_backend(search_criteria)
        
        if properties is None:
            # Hubo un error en el backend
            raise HTTPException(status_code=500, detail="Hubo un problema al conectar con el servicio de propiedades.")
        
        # 4. Formatear la respuesta final para el usuario
        bot_response_text = format_properties_for_user(properties)
        
    else:
        bot_response_text = "Disculpa, no estoy seguro de cómo ayudarte con eso. ¿Podrías intentar buscar una propiedad?"

    # 5. Actualizar el historial de la conversación
    conversation_histories[request.session_id] = (
        f"{history}\n"
        f"Usuario: {request.message}\n"
        f"Asistente: {bot_response_text}\n"
    )
    
    return {"response": bot_response_text}