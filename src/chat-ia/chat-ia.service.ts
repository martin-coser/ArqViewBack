import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ActividadClienteService } from 'src/actividad-cliente/actividad-cliente.service';

@Injectable()
export class ChatIaService {
  constructor(private readonly httpService: HttpService, 
    private readonly actividadClienteService: ActividadClienteService,) {}

  async processChatQuery(message: string, session_id : number): Promise<undefined> {
    try {
      //registrar el uso del chat
      this.actividadClienteService.registerChatUsage(session_id)
      .catch(error => console.error("Fallo al registrar log de chat:", error));

      //Llamar al API de Python (usando session_id en la llamada)
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:5001/chat', { session_id, message })
      );
      return response.data;
    } catch (error) {
      throw new Error('Error al procesar la consulta del chat');
    }
  }
}