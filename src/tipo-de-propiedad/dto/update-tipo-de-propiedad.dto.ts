import { PartialType } from '@nestjs/mapped-types';
import { CreateTipoDePropiedadDto } from './create-tipo-de-propiedad.dto';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateTipoDePropiedadDto extends PartialType(CreateTipoDePropiedadDto) {
    @IsString()
    @IsNotEmpty()
    nombre?: string;

    @IsString()
    @IsOptional()
    descripcion?: string 

}
