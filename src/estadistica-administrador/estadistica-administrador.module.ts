import { Module } from '@nestjs/common';
import { EstadisticaAdministradorService } from './estadistica-administrador.service';
import { EstadisticaAdministradorController } from './estadistica-administrador.controller';

@Module({
  controllers: [EstadisticaAdministradorController],
  providers: [EstadisticaAdministradorService],
})
export class EstadisticaAdministradorModule {}
