import { IsNotEmpty, IsNumber, IsString } from "class-validator";
import { Cuenta } from "src/auth/entities/cuenta.entity";
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
    cuenta : Cuenta;   // clave foranea a cuenta. 

    @IsNumber()
    @IsNotEmpty()
    localidad: Localidad; // clave foranea a localidad.

}
