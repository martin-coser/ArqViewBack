import { Module } from '@nestjs/common';
import { MensajeService } from './mensaje.service';
import { MensajeController } from './mensaje.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mensaje } from './entities/mensaje.entity';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Mensaje, Cliente, Inmobiliaria])],
  controllers: [MensajeController],
  providers: [MensajeService],
})
export class MensajeModule {}
