import { Type } from "class-transformer"
import { IsEnum, IsNotEmpty, IsNumber } from "class-validator"

export class CreateActividadClienteDto {
    @IsNotEmpty()
    @IsEnum(['VISUALIZACION', 'CONSULTA', 'LISTADEINTERES', 'USOCHATIA', 'LOGIN'])
    tipoDeActividad: 'VISUALIZACION' | 'CONSULTA' | 'LISTADEINTERES' | 'USOCHATIA' | 'LOGIN'

    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    propiedad: number
}
