import { Module } from '@nestjs/common';
import { InmobiliariaService } from './inmobiliaria.service';
import { InmobiliariaController } from './inmobiliaria.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inmobiliaria } from './entities/inmobiliaria.entity';
import { Localidad } from 'src/localidad/entities/localidad.entity';
import { Cuenta } from 'src/auth/entities/cuenta.entity';
// Importa el AuthModule en lugar de AuthService directamente
import { AuthModule } from 'src/auth/auth.module';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inmobiliaria,
      Localidad,
      Cuenta,
      Propiedad,
    ]),
    AuthModule // Importa el módulo que contiene y exporta AuthService
  ],
  controllers: [InmobiliariaController],
  providers: [InmobiliariaService],
  exports: [InmobiliariaService],
})
export class InmobiliariaModule {}