import { Type } from "class-transformer"
import { IsDate, IsEnum, IsNotEmpty, IsNumber } from "class-validator"

export class CreateActividadClienteDto {
    @IsNotEmpty()
    @IsEnum(['VISUALIZACION', 'CONSULTA', 'LISTADEINTERES'])
    tipoDeActividad: 'VISUALIZACION' | 'CONSULTA' | 'LISTADEINTERES'
    
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    propiedad: number
}
