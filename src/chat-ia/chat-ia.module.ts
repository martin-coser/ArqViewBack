import { Module } from '@nestjs/common';
import { ChatIaService } from './chat-ia.service';
import { ChatIaController } from './chat-ia.controller';
import { HttpModule } from '@nestjs/axios';
import { PropiedadModule } from 'src/propiedad/propiedad.module';


@Module({
  imports: [
    HttpModule,
    PropiedadModule

  ],
  controllers: [ChatIaController],
  providers: [ChatIaService],
})
export class ChatIaModule {}
