import { PartialType } from '@nestjs/mapped-types';
import { CreateListaDeInteresDto } from './create-lista-de-intere.dto';
import { IsArray, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateListaDeInteresDto extends PartialType(CreateListaDeInteresDto) {

        @IsOptional() // La lista puede crearse vacía inicialmente
        @IsArray({ message: 'Las propiedades deben ser un array de IDs.' })
        @IsNumber({}, { each: true, message: 'Cada ID de propiedad debe ser un número.' })
        @IsInt({ each: true, message: 'Cada ID de propiedad debe ser un número entero.' })
        @Type(() => Number) 
        propiedadIds?: number[];
}
