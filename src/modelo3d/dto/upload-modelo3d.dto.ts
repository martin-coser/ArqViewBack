import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class UploadModelo3DDto {

  @IsString()
  descripcion: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  propiedad: number;
}