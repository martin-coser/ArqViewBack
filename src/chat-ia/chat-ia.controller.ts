import { Controller, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ChatIaService } from './chat-ia.service'; 
import { Roles } from 'src/guards/decoradores/roles.decorator';

@Controller('chat')
export class ChatIaController {
  constructor(private readonly chatIaService: ChatIaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('CLIENTE')
  async handleChat(@Body('message') message: string, @Req() req) {
    const userId = req.user.id
    return this.chatIaService.processChatQuery(message, userId);
  }
}