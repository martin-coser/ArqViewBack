import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
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

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    cuenta? : number;   // clave foranea a cuenta. 

    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    localidad: number; // clave foranea a localidad.

}
