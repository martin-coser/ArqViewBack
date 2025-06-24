import { Type } from "class-transformer"
import { IsNotEmpty, IsNumber, IsString } from "class-validator"

export class CreateInmobiliariaDto {
    
    @IsString()
    @IsNotEmpty()
    nombre: string

    @IsString()
    @IsNotEmpty()
    direccion: string 

    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    localidad:number // foranea

    cuenta:number
}