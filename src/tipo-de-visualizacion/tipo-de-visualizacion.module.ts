import { Module } from '@nestjs/common';
import { TipoDeVisualizacionService } from './tipo-de-visualizacion.service';
import { TipoDeVisualizacionController } from './tipo-de-visualizacion.controller';
import { TipoDeVisualizacion } from './entities/tipo-de-visualizacion.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
      TypeOrmModule.forFeature([TipoDeVisualizacion]),
    ],
  controllers: [TipoDeVisualizacionController],
  providers: [TipoDeVisualizacionService],
  exports:[TipoDeVisualizacionService]
})
export class TipoDeVisualizacionModule {}
