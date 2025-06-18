import { IsNotEmpty, IsString } from "class-validator";

export class CreateProvinciaDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;
}
