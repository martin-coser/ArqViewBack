import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateListaDeInteresDto {

    @IsOptional() // El nombre es opcional, se puede establecer un valor por defecto en la entidad
    @IsString({ message: 'El nombre debe ser una cadena de texto.' })
    nombre: string;

    @IsOptional() // La lista puede crearse vacía inicialmente
    @IsArray({ message: 'Las propiedades deben ser un array de IDs.' })
    @IsNumber({}, { each: true, message: 'Cada ID de propiedad debe ser un número.' })
    @IsInt({ each: true, message: 'Cada ID de propiedad debe ser un número entero.' })
    @Type(() => Number) 
    propiedadIds?: number[];


}
