import { PartialType } from '@nestjs/mapped-types';
import { CreateRecomendacionDto } from './create-recomendacion.dto';

export class UpdateRecomendacionDto extends PartialType(CreateRecomendacionDto) {}
