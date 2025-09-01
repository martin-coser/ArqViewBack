import { IsNotEmpty, IsIn, IsInt, IsNumber } from 'class-validator';

export class MarcarComoLeidoDto {
  @IsNotEmpty()
  @IsNumber()
  idReceptor: number;

  @IsNotEmpty()
  @IsIn(['CLIENTE', 'INMOBILIARIA'])
  tipoReceptor: 'CLIENTE' | 'INMOBILIARIA';
}
