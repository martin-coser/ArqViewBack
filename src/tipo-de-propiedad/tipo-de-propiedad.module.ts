import { Module } from '@nestjs/common';
import { TipoDePropiedadService } from './tipo-de-propiedad.service';
import { TipoDePropiedadController } from './tipo-de-propiedad.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoDePropiedad } from './entities/tipo-de-propiedad.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TipoDePropiedad])],
  controllers: [TipoDePropiedadController],
  providers: [TipoDePropiedadService],
  exports:[TipoDePropiedadService],
})
export class TipoDePropiedadModule {}
