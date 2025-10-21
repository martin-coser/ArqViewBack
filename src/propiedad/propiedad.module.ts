import { Module } from '@nestjs/common';
import { PropiedadService } from './propiedad.service';
import { PropiedadController } from './propiedad.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Propiedad } from './entities/propiedad.entity';
import { Localidad } from 'src/localidad/entities/localidad.entity';
import { TipoDePropiedad } from 'src/tipo-de-propiedad/entities/tipo-de-propiedad.entity';
import { EstiloArquitectonico } from 'src/estilo-arquitectonico/entities/estilo-arquitectonico.entity';
import { TipoDeVisualizacion } from 'src/tipo-de-visualizacion/entities/tipo-de-visualizacion.entity';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';
import { RecomendacionModule } from 'src/recomendacion/recomendacion.module';
import { Imagen2d } from 'src/imagen2d/entities/imagen2d.entity';
import { Imagen2dService } from 'src/imagen2d/imagen2d.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Propiedad,
      Localidad,
      TipoDePropiedad,
      EstiloArquitectonico,
      TipoDeVisualizacion,
      Inmobiliaria,
      Imagen2d, 
    ]),
    RecomendacionModule,HttpModule

  ],
  controllers: [PropiedadController],
  providers: [PropiedadService, Imagen2dService],
  exports: [PropiedadService],
})
export class PropiedadModule {}