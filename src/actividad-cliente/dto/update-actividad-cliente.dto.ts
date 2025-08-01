import { PartialType } from '@nestjs/mapped-types';
import { CreateActividadClienteDto } from './create-actividad-cliente.dto';

export class UpdateActividadClienteDto extends PartialType(CreateActividadClienteDto) {}
