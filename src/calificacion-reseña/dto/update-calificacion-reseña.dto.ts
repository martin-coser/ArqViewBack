import { PartialType } from '@nestjs/mapped-types';
import { CreateCalificacionResenaDto } from './create-calificacion-reseña.dto';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateCalificacionResenaDto extends PartialType(CreateCalificacionResenaDto) {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    reseña?: string;

    @IsOptional()
    @IsNumber()
    @IsNotEmpty()
    @Min(1)
    @Max(5)
    calificacion?: number;
}
