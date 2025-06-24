import { PartialType } from '@nestjs/mapped-types';
import { CreateLocalidadDto } from './create-localidad.dto';
import { IsInt, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { Provider } from '@nestjs/common';
import { Provincia } from 'src/provincia/entities/provincia.entity';
import { Type } from 'class-transformer';

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
    @Type(() => Number)
    provincia?: Provincia; // Clave foránea a provincia, se mantiene opcional para permitir actualizaciones parciales.

}
