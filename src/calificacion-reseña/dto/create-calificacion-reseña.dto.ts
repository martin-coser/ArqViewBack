import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsNumber, IsString, Max, Min } from "class-validator";

export class CreateCalificacionResenaDto {
    @IsString()
    @IsNotEmpty()
    reseña?: string;

    @IsInt()
    @IsNotEmpty()
    @Min(1)
    @Max(5)
    calificacion: number;
    
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    inmobiliariaId: number;

}
