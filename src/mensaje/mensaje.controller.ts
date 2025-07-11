import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { MensajeService } from './mensaje.service';
import { CrearMensajeDto } from './dto/crear-mensaje.dto';
import { Mensaje } from './entities/mensaje.entity';
import { MensajeResponseDto } from './dto/mensaje-response.dto';

@Controller('mensaje')
export class MensajeController {
  constructor(private readonly mensajeService: MensajeService) {}

  @Post()
  async enviarMensaje(@Body() crearMensajeDto: CrearMensajeDto): Promise<MensajeResponseDto> {
    const mensaje: Mensaje = await this.mensajeService.enviarMensaje(crearMensajeDto);

    // Transformar la respuesta al formato deseado
    const response: MensajeResponseDto = {
      id: mensaje.id,
      contenido: mensaje.contenido,
      fechaCreacion: mensaje.fechaCreacion,
      remitenteCliente: mensaje.remitenteCliente
        ? {
            id: mensaje.remitenteCliente.id,
            nombre: mensaje.remitenteCliente.nombre,
            apellido: mensaje.remitenteCliente.apellido,
          }
        : undefined,
      receptorInmobiliaria: mensaje.receptorInmobiliaria
        ? {
            id: mensaje.receptorInmobiliaria.id,
            nombre: mensaje.receptorInmobiliaria.nombre,
          }
        : undefined,
    };

    return response;
  }

  @Get(':idRemitente/:idReceptor/:tipoRemitente/:tipoReceptor')
  async obtenerConversacion(
    @Param('idRemitente', ParseIntPipe) idRemitente: number,
    @Param('idReceptor', ParseIntPipe) idReceptor: number,
    @Param('tipoRemitente') tipoRemitente: string,
    @Param('tipoReceptor') tipoReceptor: string,
  ): Promise<MensajeResponseDto[]> {
    const mensajes: Mensaje[] = await this.mensajeService.obtenerConversacion(
      idRemitente,
      idReceptor,
      tipoRemitente,
      tipoReceptor,
    );

    const response: MensajeResponseDto[] = mensajes.map((mensaje) => ({
      id: mensaje.id,
      contenido: mensaje.contenido,
      fechaCreacion: mensaje.fechaCreacion,
      remitenteCliente: mensaje.remitenteCliente
        ? {
            id: mensaje.remitenteCliente.id,
            nombre: mensaje.remitenteCliente.nombre,
            apellido: mensaje.remitenteCliente.apellido,
          }
        : undefined,
      receptorInmobiliaria: mensaje.receptorInmobiliaria
        ? {
            id: mensaje.receptorInmobiliaria.id,
            nombre: mensaje.receptorInmobiliaria.nombre,
          }
        : undefined,
    }));

    return response;
  }
}
