import { PartialType } from '@nestjs/mapped-types';
import { CreatePropiedadDto } from './create-propiedad.dto';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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
    tipoPropiedad?:number // foranea

    @IsNumber()
    @IsNotEmpty()
    @IsOptional()
    tipoVisualizacion?:number // foranea

    @IsNumber()
    @IsNotEmpty()
    @IsOptional()
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
