import { IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Provincia } from "src/provincia/entities/provincia.entity";

export class CreateLocalidadDto {

    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsInt()
    @IsNotEmpty()
    codigoPostal: number;

    @IsInt()
    @IsOptional()
    provincia?: Provincia; // clave foranea a provincia.
}
