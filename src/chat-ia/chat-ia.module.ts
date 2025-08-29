import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatIaService } from './chat-ia.service';
import { PropiedadModule } from 'src/propiedad/propiedad.module';

@Module({
  imports: [
    HttpModule,
    PropiedadModule, 
  ],
  controllers: [],
  providers: [ChatIaService],
  exports: [ChatIaService],
})
export class ChatIaModule {}