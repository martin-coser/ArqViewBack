import { PartialType } from '@nestjs/mapped-types';
import { CreateEstadisticaPropiedadDto } from './create-estadistica-propiedad.dto';

export class UpdateEstadisticaPropiedadDto extends PartialType(CreateEstadisticaPropiedadDto) {}
