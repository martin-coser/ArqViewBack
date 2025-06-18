import { PartialType } from '@nestjs/mapped-types';
import { CreateProvinciaDto } from './create-provincia.dto';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateProvinciaDto extends PartialType(CreateProvinciaDto) {
    @IsOptional()
    @IsString()
    @IsNotEmpty()   
    nombre?: string; 

}
