import { Type } from "class-transformer"
import { IsDate, IsNotEmpty, IsNumber } from "class-validator"

export class CreateActividadClienteDto {

    tipoDeActividad: 'VISUALIZACION' | 'CONSULTA' | 'LISTADEINTERES'
    
    @IsNotEmpty()
    @IsDate()
    fechaYHoraActividad: Date
    
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    propiedad: number
}
