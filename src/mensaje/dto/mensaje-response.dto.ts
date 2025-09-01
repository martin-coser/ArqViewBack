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

  @IsOptional()
  remitenteInmobiliaria?: {
    id: number;
    nombre: string;
  };

  @IsOptional()
  receptorCliente?: {
    id: number;
    nombre: string;
    apellido: string;
  };

  @IsOptional()
  leido?: boolean;
}