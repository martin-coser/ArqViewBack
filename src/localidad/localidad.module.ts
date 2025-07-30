import { Module } from '@nestjs/common';
import { LocalidadService } from './localidad.service';
import { LocalidadController } from './localidad.controller';
import { TypeOrmModule } from '@nestjs/typeorm'; 
import { Localidad } from './entities/localidad.entity'; 
import { Provincia } from 'src/provincia/entities/provincia.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Localidad,
      Provincia

    ]), // Agrega esto para que TypeORM sepa de tu entidad Localidad
  ],
  controllers: [LocalidadController],
  providers: [LocalidadService],
})
export class LocalidadModule {}