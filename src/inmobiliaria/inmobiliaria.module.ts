import { Module } from '@nestjs/common';
import { InmobiliariaService } from './inmobiliaria.service';
import { InmobiliariaController } from './inmobiliaria.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inmobiliaria } from './entities/inmobiliaria.entity';
import { Localidad } from 'src/localidad/entities/localidad.entity';
import { Cuenta } from 'src/auth/entities/cuenta.entity';

@Module({
  imports:[
    TypeOrmModule.forFeature([
      Inmobiliaria,
      Localidad,
      Cuenta
    ])
  ],
  controllers: [InmobiliariaController],
  providers: [InmobiliariaService],
  exports: [InmobiliariaService],
})
export class InmobiliariaModule {}
