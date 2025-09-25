import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class UploadImagen360Dto {
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    propiedad: number;

    @IsString()
    descripcion: string;
}
