import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";


export class CreateLocalidadDto {

    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsInt()
    @IsNotEmpty()
    codigoPostal: number;

    @IsInt()
    @Type(() => Number)
    provincia: number; 
}
