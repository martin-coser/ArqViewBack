import { PartialType } from '@nestjs/mapped-types';
import { CreateClienteDto } from './create-cliente.dto';
import { Localidad } from 'src/localidad/entities/localidad.entity';
import { IsDate, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Cuenta } from 'src/auth/entities/cuenta.entity';

export class UpdateClienteDto extends PartialType(CreateClienteDto) {
    @IsString()
    @IsNotEmpty()
    nombre?: string;

    @IsString()
    @IsNotEmpty()
    apellido?: string;
    
    @IsNotEmpty()
    @IsString()
    fechaNacimiento: Date;

    @IsString()
    @IsNotEmpty()
    direccion?: string;

    @IsNumber()
    @IsNotEmpty()
    cuenta?: number;
    
    @IsNumber()
    @IsNotEmpty()
    localidad?: number; // Clave foránea a localidad, se mantiene opcional para permitir
    

}
