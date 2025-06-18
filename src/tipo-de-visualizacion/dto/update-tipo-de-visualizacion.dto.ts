import { PartialType } from '@nestjs/mapped-types';
import { CreateTipoDeVisualizacionDto } from './create-tipo-de-visualizacion.dto';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateTipoDeVisualizacionDto extends PartialType(CreateTipoDeVisualizacionDto) {
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    nombre?: string;

    @IsString()
    @IsOptional()
    descripcion?: string 
}
