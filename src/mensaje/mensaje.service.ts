import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Mensaje } from './entities/mensaje.entity';
import { Repository } from 'typeorm';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';
import { CrearMensajeDto } from './dto/crear-mensaje.dto';

@Injectable()
export class MensajeService {
constructor(
    @InjectRepository(Mensaje)
    private repositorioMensajes: Repository<Mensaje>,
    @InjectRepository(Cliente)
    private repositorioClientes: Repository<Cliente>,
    @InjectRepository(Inmobiliaria)
    private repositorioInmobiliarias: Repository<Inmobiliaria>,
  ) {}

  async enviarMensaje(crearMensajeDto: CrearMensajeDto): Promise<Mensaje> {
    const { idRemitente, idReceptor, contenido, tipoRemitente, tipoReceptor } = crearMensajeDto;

    let remitente, receptor;

    // Validar que el tipo de remitente y receptor sean correctos
    if (tipoRemitente === 'CLIENTE') {
      remitente = await this.repositorioClientes.findOneBy({ id: idRemitente });
    } else if (tipoRemitente === 'INMOBILIARIA') {
      remitente = await this.repositorioInmobiliarias.findOneBy({ id: idRemitente });
    }
    if (tipoReceptor === 'CLIENTE') {
      receptor = await this.repositorioClientes.findOneBy({ id: idReceptor });
    } else if (tipoReceptor === 'INMOBILIARIA') {
      receptor = await this.repositorioInmobiliarias.findOneBy({ id: idReceptor });
    }

    if (!remitente || !receptor) {
      throw new Error('Remitente o receptor no encontrado');
    }

    const mensaje = this.repositorioMensajes.create({
      contenido,
      remitenteCliente: tipoRemitente === 'CLIENTE' ? remitente : null,
      remitenteInmobiliaria: tipoRemitente === 'INMOBILIARIA' ? remitente : null,
      receptorCliente: tipoReceptor === 'CLIENTE' ? receptor : null,
      receptorInmobiliaria: tipoReceptor === 'INMOBILIARIA' ? receptor : null,
    });

    return this.repositorioMensajes.save(mensaje);
  }

  async obtenerConversacion(idRemitente: number, idReceptor: number, tipoRemitente: string, tipoReceptor: string): Promise<Mensaje[]> {
  return this.repositorioMensajes.find({
    where: [
      // Caso 1: Remitente → Receptor
      {
        remitenteCliente: tipoRemitente === 'CLIENTE' ? { id: idRemitente } : undefined,
        remitenteInmobiliaria: tipoRemitente === 'INMOBILIARIA' ? { id: idRemitente } : undefined,
        receptorCliente: tipoReceptor === 'CLIENTE' ? { id: idReceptor } : undefined,
        receptorInmobiliaria: tipoReceptor === 'INMOBILIARIA' ? { id: idReceptor } : undefined,
      },
      // Caso 2: Receptor → Remitente (conversación en la otra dirección)
      {
        remitenteCliente: tipoReceptor === 'CLIENTE' ? { id: idReceptor } : undefined,
        remitenteInmobiliaria: tipoReceptor === 'INMOBILIARIA' ? { id: idReceptor } : undefined,
        receptorCliente: tipoRemitente === 'CLIENTE' ? { id: idRemitente } : undefined,
        receptorInmobiliaria: tipoRemitente === 'INMOBILIARIA' ? { id: idRemitente } : undefined,
      },
    ],
    relations: [
      'remitenteCliente',
      'remitenteInmobiliaria',
      'receptorCliente',
      'receptorInmobiliaria',
    ],
    order: {
      fechaCreacion: 'ASC',
    },
  });
}
}
