import { PartialType } from '@nestjs/mapped-types';
import { CreatePropiedadDto } from './create-propiedad.dto';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { TipoVisualizacion } from '../entities/TipoVisualizacion.enum';
import { Type } from 'class-transformer';

export class UpdatePropiedadDto extends PartialType(CreatePropiedadDto) {
    
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    nombre?: string

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    descripcion?:string

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    direccion?: string 
    
    @IsNumber()
    @IsNotEmpty()
    @IsOptional()
    @Type(() => Number)
    localidad?:number // foranea
    
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    precio?:number

    @IsNumber()
    @IsNotEmpty()
    @IsOptional()
    superficie?:number 

    @IsNumber()
    @IsNotEmpty()
    @IsOptional()
    @Type(() => Number)
    tipoPropiedad?:number // foranea

    @IsEnum(TipoVisualizacion)
    @IsNotEmpty()
    @IsOptional()
    tipoVisualizacion?:TipoVisualizacion 

    @IsNumber()
    @IsNotEmpty()
    @IsOptional()
    @Type(() => Number)
    estiloArquitectonico?:number // foranea

    @IsNumber()
    @IsNotEmpty()
    @IsOptional()
    cantidadBanios?:number

    @IsNumber()
    @IsNotEmpty()
    @IsOptional()
    cantidadDormitorios?:number

    @IsNumber()
    @IsNotEmpty()
    @IsOptional()
    cantidadAmbientes?:number
}
