import { Module } from '@nestjs/common';
import { ActividadClienteService } from './actividad-cliente.service';
import { ActividadClienteController } from './actividad-cliente.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActividadCliente } from './entities/actividad-cliente.entity';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { ListaDeInteres } from 'src/lista-de-interes/entities/lista-de-interes.entity';

@Module({
  imports: [
      TypeOrmModule.forFeature([
        ActividadCliente,
        Propiedad,
        Cliente,
        ListaDeInteres
    ]),
  ], 
  controllers: [ActividadClienteController],
  providers: [ActividadClienteService],
  exports: [ActividadClienteService],
})
export class ActividadClienteModule {}
