import { PartialType } from '@nestjs/mapped-types';
import { CreateEstiloArquitectonicoDto } from './create-estilo-arquitectonico.dto';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateEstiloArquitectonicoDto extends PartialType(CreateEstiloArquitectonicoDto) {
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    nombre?: string;

    @IsString()
    @IsOptional()
    descripcion?: string 
}
