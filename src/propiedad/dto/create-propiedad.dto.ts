import { IsEnum, IsNotEmpty, IsNumber, IsString } from "class-validator"
import { TipoVisualizacion } from "../entities/TipoVisualizacion.enum"
import { Type } from "class-transformer"

export class CreatePropiedadDto {

    @IsString()
    @IsNotEmpty()
    nombre: string

    @IsString()
    @IsNotEmpty()
    descripcion:string

    @IsString()
    @IsNotEmpty()
    direccion: string 
    
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    localidad:number // foranea
    
    @IsNumber()
    @IsNotEmpty()
    precio:number

    @IsNumber()
    @IsNotEmpty()
    superficie:number 

    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    tipoPropiedad:number // foranea

    @IsEnum(TipoVisualizacion)
    @IsNotEmpty()
    tipoVisualizacion:TipoVisualizacion

    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    estiloArquitectonico:number // foranea

    @IsNumber()
    @IsNotEmpty()
    cantidadBanios:number

    @IsNumber()
    @IsNotEmpty()
    cantidadDormitorios:number

    @IsNumber()
    @IsNotEmpty()
    cantidadAmbientes:number
}
