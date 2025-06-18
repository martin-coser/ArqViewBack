import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateEstiloArquitectonicoDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;
    
    @IsString()
    @IsOptional()
    descripcion?: string; 
}
