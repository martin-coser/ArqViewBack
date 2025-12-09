import { Module } from '@nestjs/common';
import { EstadisticaAdministradorService } from './estadistica-administrador.service';
import { EstadisticaAdministradorController } from './estadistica-administrador.controller';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inmobiliaria
    ]),
  ],
  controllers: [EstadisticaAdministradorController],
  providers: [EstadisticaAdministradorService],
})
export class EstadisticaAdministradorModule {}
