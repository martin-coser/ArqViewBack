import { IsDateString, IsOptional } from 'class-validator';

export class FiltrosFechaChatIaDto {
    @IsDateString()
    @IsOptional()
    fechaInicio?: string; 

    @IsDateString()
    @IsOptional()
    fechaFin?: string; 
}