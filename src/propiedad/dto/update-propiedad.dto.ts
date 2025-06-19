import { PartialType } from '@nestjs/mapped-types';
import { CreatePropiedadDto } from './create-propiedad.dto';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { TipoOperacion } from '../entities/TipoOperacion.enum';
import { Type } from 'class-transformer';

export class UpdatePropiedadDto extends PartialType(CreatePropiedadDto) {
    
    @IsString()
    @IsNotEmpty()
    nombre?: string

    @IsString()
    @IsNotEmpty()
    descripcion?:string

    @IsString()
    @IsNotEmpty()
    direccion?: string 
    
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    localidad?:number // foranea
    
    @IsInt()
    @IsNotEmpty()
    precio?:number

    @IsNumber()
    @IsNotEmpty()
    superficie?:number 

    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    tipoPropiedad?:number // foranea

    @IsArray()
    @IsOptional()
    @IsInt({ each: true })
    tipoVisualizaciones: number[]

    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    estiloArquitectonico?:number // foranea

    @IsNumber()
    @IsNotEmpty()
    cantidadBanios?:number

    @IsNumber()
    @IsNotEmpty()
    cantidadDormitorios?:number

    @IsNumber()
    @IsNotEmpty()
    cantidadAmbientes?:number

    @IsEnum(TipoOperacion)
    @IsNotEmpty()
    tipoOperacion?:TipoOperacion
}
