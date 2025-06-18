import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateTipoDeVisualizacionDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;
    
    @IsString()
    @IsOptional()
    descripcion?: string; 
}
