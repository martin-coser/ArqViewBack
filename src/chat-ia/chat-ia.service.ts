import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PropiedadService } from 'src/propiedad/propiedad.service';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';

@Injectable()
export class ChatIaService {
  private readonly logger = new Logger(ChatIaService.name);
  private readonly ollamaApiUrl = 'http://localhost:11434/api/generate';

  constructor(
    private readonly httpService: HttpService,
    private readonly propiedadService: PropiedadService,
  ) {}

  async obtenerRespuestaChat(mensajeDeUsuario: string): Promise<any> {
    this.logger.log(`Mensaje recibido del usuario: "${mensajeDeUsuario}"`);

    const prompt = `
      Eres un asistente experto en bienes raíces. Tu tarea es extraer la intención de búsqueda y los parámetros de las propiedades. Los parámetros son: tipo_propiedad (ej. casa, apartamento), habitaciones, precio_min, precio_max, y localidad.
      También, debes identificar si la búsqueda es por características visuales de las imágenes (ej. "baño grande", "cocina moderna"). Si es así, usa el parámetro 'tags_visuales'. Si no se menciona, usa 'null'.
      Devuelve la respuesta como un objeto JSON válido. Si un parámetro no se menciona, usa 'null'. No incluyas texto adicional fuera del JSON.

      Ejemplo de búsqueda por tags: "muéstrame propiedades con un baño grande" -> {"tags_visuales": ["baño", "grande"]}
      Ejemplo de búsqueda mixta: "casas con un dormitorio en el centro y con una cocina moderna" -> {"tipo_propiedad": "casa", "habitaciones": 1, "tags_visuales": ["cocina", "moderna"]}

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

      let propiedades: Propiedad[] = [];

      // 3. Verifica si la búsqueda es por tags visuales o por otros criterios.
      if (criteriosDeBusqueda.tags_visuales && criteriosDeBusqueda.tags_visuales.length > 0) {
        // Llama al nuevo método para la búsqueda visual
        propiedades = await this.propiedadService.buscarPropiedadesPorTags(criteriosDeBusqueda.tags_visuales);
      } else {
        // Llama al método de búsqueda tradicional por parámetros de texto
        propiedades = await this.propiedadService.buscarPropiedades(criteriosDeBusqueda);
      }
      // ---------------------------------------------

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