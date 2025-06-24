export class RegisterCuentaDto {

    nombreUsuario:string

    email:string

    password:string

    rol: 'ADMIN' | 'CLIENTE' | 'INMOBILIARIA'

}