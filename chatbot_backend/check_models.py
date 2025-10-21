import os
import google.generativeai as genai
from dotenv import load_dotenv

# Cargar la API key
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("No se encontró la GEMINI_API_KEY en el archivo .env")

genai.configure(api_key=GEMINI_API_KEY)

print("Buscando modelos compatibles con 'generateContent'...\n")

# Listar todos los modelos y encontrar los que son compatibles
for model in genai.list_models():
  # Verificamos si el método 'generateContent' está en la lista de métodos soportados
  if 'generateContent' in model.supported_generation_methods:
    print(f"- {model.name}")

print("\nCopia uno de los nombres de la lista de arriba y pégalo en tu archivo main.py")