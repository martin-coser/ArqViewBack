import { PartialType } from '@nestjs/mapped-types';
import { CreateLocalidadDto } from './create-localidad.dto';
import { IsInt, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLocalidadDto extends PartialType(CreateLocalidadDto) {

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    nombre?: string;

    @IsInt()
    @IsNotEmpty()
    @IsOptional()
    codigoPostal?: number; 
    
    @IsNotEmpty()
    @IsOptional()
    @Type(() => Number)
    provincia?: number; 

}
