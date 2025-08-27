import { PartialType } from '@nestjs/mapped-types';
import { CreateInmobiliariaDto } from './create-inmobiliaria.dto';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateInmobiliariaDto extends PartialType(CreateInmobiliariaDto) {
    @IsString()
    @IsNotEmpty()
    nombre?: string

    @IsString()
    @IsNotEmpty()
    direccion?: string 

    @IsString()
    @IsNotEmpty()
    caracteristica?: string

    @IsString()
    @IsNotEmpty()
    numeroTelefono?: string

    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    localidad?:number // foranea

    cuenta?:number
}
