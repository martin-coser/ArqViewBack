import { PartialType } from '@nestjs/mapped-types';
import { CreatePropiedadDto } from './create-propiedad.dto';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { TipoOperacion } from '../entities/TipoOperacion.enum';
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

    @IsArray()
    @IsInt({ each: true })
    @IsOptional()
    tipoVisualizaciones: number[]

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

    @IsEnum(TipoOperacion)
    @IsNotEmpty()
    @IsOptional()
    tipoOperacion?:TipoOperacion
}
