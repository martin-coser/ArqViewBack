import { IsNotEmpty, IsNumber, IsString } from "class-validator";
import { Localidad } from "src/localidad/entities/localidad.entity";

export class CreateClienteDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;
    
    @IsString()
    @IsNotEmpty()   
    apellido: string;
    
    @IsNotEmpty()
    @IsString()
    fechaNacimiento: Date;
    
    @IsString()
    @IsNotEmpty()
    direccion: string;

    @IsNotEmpty()
    @IsNumber()
    cuenta : number;   // clave foranea a cuenta. 

    @IsNumber()
    @IsNotEmpty()
    localidad: Localidad; // clave foranea a localidad.

}
