import { IsNotEmpty, IsNumber, IsString } from "class-validator"

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
    localidad:number // foranea
    
    @IsString()
    @IsNotEmpty()
    precio:number

    @IsNumber()
    @IsNotEmpty()
    superficie:number 

    @IsNumber()
    @IsNotEmpty()
    tipoPropiedad:number // foranea

    @IsNumber()
    @IsNotEmpty()
    tipoVisualizacion:number // foranea

    @IsNumber()
    @IsNotEmpty()
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
