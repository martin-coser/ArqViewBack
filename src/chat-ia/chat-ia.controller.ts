import { Controller, Post, Body } from '@nestjs/common';
import { ChatIaService } from './chat-ia.service';

@Controller('chat-ia')
export class ChatIaController {
  constructor(private readonly chatIaService: ChatIaService) {}

  @Post()
  async gestionarChat(@Body('message') message: string) {
    if (!message || message.trim() === '') {
      return { success: false, message: 'El mensaje no puede estar vacío.' };
    }
    return this.chatIaService.obtenerRespuestaChat(message);
  }
}