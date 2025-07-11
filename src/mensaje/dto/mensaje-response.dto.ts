import { IsInt, IsString, IsDate, IsOptional } from 'class-validator';

export class MensajeResponseDto {
  @IsInt()
  id: number;

  @IsString()
  contenido: string;

  @IsDate()
  fechaCreacion: Date;

  @IsOptional()
  remitenteCliente?: {
    id: number;
    nombre: string;
    apellido: string;
  };

  @IsOptional()
  receptorInmobiliaria?: {
    id: number;
    nombre: string;
  };
}