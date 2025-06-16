import { Module } from '@nestjs/common';
import { PropiedadService } from './propiedad.service';
import { PropiedadController } from './propiedad.controller';

@Module({
  controllers: [PropiedadController],
  providers: [PropiedadService],
})
export class PropiedadModule {}
