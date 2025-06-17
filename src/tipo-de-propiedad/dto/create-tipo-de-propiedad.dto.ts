import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTipoDePropiedadDto {
    
    @IsString()
    @IsNotEmpty()
    nombre: string;
    
    @IsString()
    @IsOptional()
    descripcion?: string; 
}
