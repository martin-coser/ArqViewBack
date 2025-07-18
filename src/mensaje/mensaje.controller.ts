import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { MensajeService } from './mensaje.service';
import { CrearMensajeDto } from './dto/crear-mensaje.dto';
import { Mensaje } from './entities/mensaje.entity';
import { MensajeResponseDto } from './dto/mensaje-response.dto';

@Controller('mensaje')
export class MensajeController {
  constructor(private readonly mensajeService: MensajeService) {}

@Post()
  async enviarMensaje(@Body() crearMensajeDto: CrearMensajeDto): Promise<MensajeResponseDto> {
    const mensaje = await this.mensajeService.enviarMensaje(crearMensajeDto);

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
      remitenteInmobiliaria: mensaje.remitenteInmobiliaria
        ? {
            id: mensaje.remitenteInmobiliaria.id,
            nombre: mensaje.remitenteInmobiliaria.nombre,
          }
        : undefined,
      receptorCliente: mensaje.receptorCliente
        ? {
            id: mensaje.receptorCliente.id,
            nombre: mensaje.receptorCliente.nombre,
            apellido: mensaje.receptorCliente.apellido,
          }
        : undefined,
    };

    return response;
  }

  @Get(':type/:id')
  async getMessagesByTypeAndId(
    @Param('type') type: string,
    @Param('id', ParseIntPipe) id: number
  ): Promise<Mensaje[]> {  
    return this.mensajeService.findMessagesByTypeAndId(type, id);
  }
}
