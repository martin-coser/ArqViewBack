import { Controller, Post, Body } from '@nestjs/common';
import { ChatIaService } from './chat-ia.service'; 

@Controller('chat')
export class ChatIaController {
  constructor(private readonly chatIaService: ChatIaService) {}

  @Post()
  async handleChat(@Body('query') query: string) {
    return this.chatIaService.processChatQuery(query);
  }
}