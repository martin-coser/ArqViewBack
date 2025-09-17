import { Module } from '@nestjs/common';
import { SuscripcionService } from './suscripcion.service';
import { SuscripcionController } from './suscripcion.controller';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';
import { Cuenta } from 'src/auth/entities/cuenta.entity';
import { Comprobante } from './entities/comprobante.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InmobiliariaModule } from 'src/inmobiliaria/inmobiliaria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inmobiliaria, Cuenta, Comprobante]),
    InmobiliariaModule,
  ],
  controllers: [SuscripcionController],
  providers: [SuscripcionService],
  exports: [SuscripcionService],
})
export class SuscripcionModule {}
