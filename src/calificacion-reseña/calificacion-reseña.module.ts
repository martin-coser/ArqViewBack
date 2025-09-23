import { Module } from '@nestjs/common';
import { CalificacionResenaService } from './calificacion-reseña.service';
import { CalificacionResenaController } from './calificacion-reseña.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalificacionResena } from './entities/calificacion-reseña.entity';
import { Mensaje } from '../mensaje/entities/mensaje.entity';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CalificacionResena, Mensaje,Cliente, Inmobiliaria]),
  ],
  controllers: [CalificacionResenaController],
  providers: [CalificacionResenaService],
  exports: [CalificacionResenaService], 
})
export class CalificacionResenaModule {}