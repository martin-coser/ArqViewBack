import { PartialType } from '@nestjs/mapped-types';
import { CreateListaDeIntereDto } from './create-lista-de-intere.dto';

export class UpdateListaDeIntereDto extends PartialType(CreateListaDeIntereDto) {}
