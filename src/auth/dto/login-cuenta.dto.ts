import { PartialType } from "@nestjs/mapped-types";
import { RegisterCuentaDto } from "./register-cuenta.dto";

export class LoginCuentaDto extends PartialType(RegisterCuentaDto){
    
    nombreUsuario:string

    password:string
}