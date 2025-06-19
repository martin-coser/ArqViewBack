import { IsArray, IsEnum, IsInt, IsNotEmpty, IsNumber, IsString } from "class-validator"
import { TipoOperacion } from "../entities/TipoOperacion.enum"
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

    @IsArray()
    @IsInt({ each: true })
    tipoVisualizaciones: number[]
    
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

    @IsEnum(TipoOperacion)
    @IsNotEmpty()
    tipoOperacion:TipoOperacion
}
