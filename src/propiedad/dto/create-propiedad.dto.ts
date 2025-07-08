import { IsArray, IsEnum, IsInt, IsNotEmpty, IsNumber, IsString, Max, Min } from "class-validator"
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
    
    @IsNumber({}, { message: 'La latitud debe ser un número válido.' })
    @Min(-90, { message: 'La latitud debe ser mayor o igual a -90.' })
    @Max(90, { message: 'La latitud debe ser menor o igual a 90.' })
    @Type(() => Number) 
    latitud: number;

    @IsNumber({}, { message: 'La longitud debe ser un número válido.' })
    @Min(-180, { message: 'La longitud debe ser mayor o igual a -180.' })
    @Max(180, { message: 'La longitud debe ser menor o igual a 180.' })
    @Type(() => Number) 
    longitud: number;
}
