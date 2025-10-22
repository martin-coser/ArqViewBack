import { forwardRef, Module } from '@nestjs/common';
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
import { Imagen2dModule } from 'src/imagen2d/imagen2d.module';
import { Imagen360Module } from 'src/imagen360/imagen360.module';
import { Modelo3DModule } from 'src/modelo3d/modelo3d.module';


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
    RecomendacionModule,
    HttpModule,
    forwardRef(() => Imagen2dModule),
    Imagen360Module,
    Modelo3DModule

  ],
  controllers: [PropiedadController],
  providers: [PropiedadService, Imagen2dService],
  exports: [PropiedadService],
})
export class PropiedadModule {}