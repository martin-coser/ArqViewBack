import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateInmobiliariaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  direccion: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  localidad: number; // ID de la localidad

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  cuenta?: number; // ID de la cuenta
}