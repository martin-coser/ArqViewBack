import { Module } from '@nestjs/common';
import { LocalidadService } from './localidad.service';
import { LocalidadController } from './localidad.controller';
import { TypeOrmModule } from '@nestjs/typeorm'; // Importa TypeOrmModule
import { Localidad } from './entities/localidad.entity'; // Importa la entidad Localidad

@Module({
  imports: [
    TypeOrmModule.forFeature([Localidad]), // Agrega esto para que TypeORM sepa de tu entidad Localidad
  ],
  controllers: [LocalidadController],
  providers: [LocalidadService],
})
export class LocalidadModule {}