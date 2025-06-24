import { Module } from '@nestjs/common';
import { InmobiliariaService } from './inmobiliaria.service';
import { InmobiliariaController } from './inmobiliaria.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inmobiliaria } from './entities/inmobiliaria.entity';
import { Localidad } from 'src/localidad/entities/localidad.entity';

@Module({
  imports:[
    TypeOrmModule.forFeature([
      Inmobiliaria,
      Localidad
    ])
  ],
  controllers: [InmobiliariaController],
  providers: [InmobiliariaService],
  exports: [InmobiliariaService],
})
export class InmobiliariaModule {}
