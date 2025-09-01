import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatIaImagenService } from './chat-ia-imagen.service';

@Module({
  imports: [HttpModule],
  providers: [ChatIaImagenService],
  exports: [ChatIaImagenService] 
})
export class ChatIaImagenModule {}