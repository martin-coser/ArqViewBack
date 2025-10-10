import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ChatIaService {
  constructor(private readonly httpService: HttpService) {}

  async processChatQuery(query: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:5000/chat', { query })
      );
      return response.data;
    } catch (error) {
      throw new Error('Error al procesar la consulta del chat');
    }
  }
}