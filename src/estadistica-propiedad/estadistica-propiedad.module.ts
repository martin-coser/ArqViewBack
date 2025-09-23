import { Module } from '@nestjs/common';
import { EstadisticaPropiedadService } from './estadistica-propiedad.service';
import { EstadisticaPropiedadController } from './estadistica-propiedad.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActividadCliente } from 'src/actividad-cliente/entities/actividad-cliente.entity';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { ListaDeInteres } from 'src/lista-de-interes/entities/lista-de-interes.entity';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';
import { PlanesGuard } from 'src/guards/planes.guard';
import { InmobiliariaModule } from 'src/inmobiliaria/inmobiliaria.module';

@Module({
  imports: [
      TypeOrmModule.forFeature([
        ActividadCliente,
        Propiedad,
        Cliente,
        ListaDeInteres,
        Inmobiliaria
    ]),
    InmobiliariaModule,
  ], 
  controllers: [EstadisticaPropiedadController],
  providers: [EstadisticaPropiedadService],
})
export class EstadisticaPropiedadModule {}
