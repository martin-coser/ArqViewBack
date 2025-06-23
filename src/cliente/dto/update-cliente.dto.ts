import { PartialType } from '@nestjs/mapped-types';
import { CreateClienteDto } from './create-cliente.dto';
import { Localidad } from 'src/localidad/entities/localidad.entity';
import { IsDate, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UpdateClienteDto extends PartialType(CreateClienteDto) {
    @IsString()
    @IsNotEmpty()
    nombre?: string;

    @IsString()
    @IsNotEmpty()
    apellido?: string;
    
    @IsDate()
    @IsNotEmpty()
    fechaNacimiento?: Date;

    @IsString()
    @IsNotEmpty()
    direccion?: string;

    //@IsNumber()
    //@IsNotEmpty()
    // cuenta?: Cuenta; // Clave foránea a cuenta, se mantiene opcional para permitir actualizaciones parciales.
    
    @IsNumber()
    @IsNotEmpty()
    localidad?: Localidad; // Clave foránea a localidad, se mantiene opcional para permitir
    

}
