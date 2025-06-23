import { IsDate, IsNotEmpty, IsNumber, IsString } from "class-validator";
import { Localidad } from "src/localidad/entities/localidad.entity";

export class CreateClienteDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;
    
    @IsString()
    @IsNotEmpty()   
    apellido: string;
    
    @IsNotEmpty()
    @IsDate()
    fechaNacimiento: Date;
    
    @IsString()
    @IsNotEmpty()
    direccion: string;

    @IsNumber()
    @IsNotEmpty()   
    //cuenta : Cuenta;

    @IsNumber()
    @IsNotEmpty()
    localidad?: Localidad; // clave foranea a localidad.

}
