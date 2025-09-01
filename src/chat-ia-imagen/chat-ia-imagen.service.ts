import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ChatIaImagenService {
  private readonly logger = new Logger(ChatIaImagenService.name);
  private readonly ollamaApiUrl = 'http://localhost:11434/api/generate';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Analiza una imagen usando el modelo LLaVA para extraer etiquetas clave.
   * @param imageBase64 La imagen codificada en formato Base64.
   * @returns Un array de strings con las etiquetas visuales.
   */
  async analizarImagen(imageBase64: string): Promise<string[]> {
    this.logger.log('Enviando imagen a LLaVA para análisis...');

    const prompt = `
      Describe la habitación en la imagen y clasifícala. ¿Es un baño, una cocina o un dormitorio?
      Además, infiere si es grande, mediano o pequeño.
      Devuelve la respuesta como una lista de etiquetas separadas por comas, sin texto adicional.
      Ejemplo: "baño, grande, moderno"
    `;

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.ollamaApiUrl, {
          model: 'llava',
          prompt: prompt,
          stream: false,
          images: [imageBase64],
        }),
      );

      const textoDeRepuestaLlama = response.data.response;
      this.logger.debug(`Respuesta de LLaVA: ${textoDeRepuestaLlama}`);

      const tags = textoDeRepuestaLlama
        .trim()
        .toLowerCase()
        .split(',')
        .map(tag => tag.trim());

      return tags;
    } catch (error) {
      this.logger.error('Error al analizar la imagen con LLaVA', error);
      return [];
    }
  }
}