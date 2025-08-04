import { Type } from "class-transformer"
import { IsNotEmpty, IsNumber } from "class-validator"

export class CreateActividadClienteDto {

    tipoDeActividad: 'VISUALIZACION' | 'CONSULTA' | 'LISTADEINTERES'
    
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    propiedad: number
}
