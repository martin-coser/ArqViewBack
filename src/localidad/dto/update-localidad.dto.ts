import { PartialType } from '@nestjs/mapped-types';
import { CreateLocalidadDto } from './create-localidad.dto';
import { IsInt, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class UpdateLocalidadDto extends PartialType(CreateLocalidadDto) {

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    nombre?: string;

    @IsInt()
    @IsNotEmpty()
    @IsOptional()
    codigoPostal?: number; // Se mantiene como opcional para permitir actualizaciones parciales.
    
    @IsNotEmpty()
    @IsOptional()
    provincia?: number; // Clave foránea a provincia, se mantiene opcional para permitir actualizaciones parciales.

}
