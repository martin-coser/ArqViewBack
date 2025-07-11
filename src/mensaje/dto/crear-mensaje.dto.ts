export class CrearMensajeDto {
    idRemitente: number; // quien envía el mensaje
    idReceptor: number; // quien recibe el mensaje
    contenido: string; // contenido del mensaje
    tipoRemitente: 'CLIENTE' | 'INMOBILIARIA'; // tipo de remitente
    tipoReceptor: 'CLIENTE' | 'INMOBILIARIA'; // tipo de receptor
}
