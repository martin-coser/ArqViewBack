import { PartialType } from "@nestjs/mapped-types";
import { RegisterCuentaDto } from "./register-cuenta.dto";
import { IsNotEmpty, IsString, Matches, MinLength } from "class-validator";

export class LoginCuentaDto extends PartialType(RegisterCuentaDto){

    @IsString()
    @IsNotEmpty()
    nombreUsuario:string
    
    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
        message: 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&).'
    })
    password:string
}