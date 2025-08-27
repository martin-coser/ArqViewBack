// src/chat-ia/chat-ia.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PropiedadService } from 'src/propiedad/propiedad.service';

@Injectable()
export class ChatIaService {
  private readonly logger = new Logger(ChatIaService.name);
  private readonly ollamaApiUrl = 'http://localhost:11434/api/generate';

  constructor(
    private readonly httpService: HttpService,
    private readonly propiedadService: PropiedadService,
  ) {}

  /**
   * Procesa el mensaje del usuario y devuelve una respuesta de chat.
   * @param mensajeDeUsuario Mensaje de texto enviado por el usuario.
   * @returns Un objeto que contiene el estado, un mensaje y los resultados de la búsqueda.
   */
  async obtenerRespuestaChat(mensajeDeUsuario: string): Promise<any> {
    this.logger.log(`Mensaje recibido del usuario: "${mensajeDeUsuario}"`);

    const prompt = `
      Eres un asistente experto en bienes raíces. Tu tarea es extraer la intención de búsqueda y los parámetros de las propiedades. Los parámetros son: tipo_propiedad (ej. casa, apartamento), habitaciones, precio_min, precio_max, y localidad.
      Devuelve la respuesta como un objeto JSON válido. Si un parámetro no se menciona, usa 'null'. No incluyas texto adicional fuera del JSON.

      Mensaje del usuario: "${mensajeDeUsuario}"

      Respuesta JSON:
    `;

    try {
      // 1. Llama a la API de Ollama para obtener los criterios de búsqueda.
      const response = await firstValueFrom(
        this.httpService.post(this.ollamaApiUrl, {
          model: 'mistral',
          prompt: prompt,
          stream: false,
        }),
      );

      // 2. Extrae y parsea la respuesta JSON del modelo.
      const textoDeRespuestaIa = response.data.response;
      this.logger.debug(`Respuesta cruda de la IA: ${textoDeRespuestaIa}`);
      const criteriosDeBusqueda = JSON.parse(textoDeRespuestaIa.trim());
      
      this.logger.log(`Criterios de búsqueda extraídos: ${JSON.stringify(criteriosDeBusqueda)}`);

      // 3. Usa los criterios para buscar propiedades en la base de datos.
      // Asegúrate de que este método en PropiedadService se llama 'findPropiedades'.
      const propiedades = await this.propiedadService.buscarPropiedades(criteriosDeBusqueda);

      // 4. Genera la respuesta final para el cliente.
      if (propiedades.length > 0) {
        return {
          exito: true,
          mensaje: `¡Encontré ${propiedades.length} propiedades que coinciden con tu búsqueda!`,
          resultados: propiedades,
        };
      } else {
        return {
          exito: false,
          mensaje: 'Lo siento, no pude encontrar propiedades que coincidan con tu búsqueda. ¿Quieres intentar con otros criterios?',
          resultados: [],
        };
      }
    } catch (error) {
      this.logger.error('Error al procesar la solicitud del chat:', error);
      return {
        exito: false,
        mensaje: 'Hubo un error al procesar tu solicitud. Por favor, inténtalo de nuevo más tarde.',
        resultados: [],
      };
    }
  }
}