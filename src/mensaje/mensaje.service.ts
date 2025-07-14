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

  async findMessagesByTypeAndId(type: string, id: number): Promise<Mensaje[]> {
    let query = this.repositorioMensajes.createQueryBuilder('mensaje');

    if (type === 'CLIENTE') {
      query = query
        .leftJoinAndSelect('mensaje.remitenteCliente', 'remitenteCliente')
        .leftJoinAndSelect('mensaje.receptorCliente', 'receptorCliente')
        .leftJoinAndSelect('mensaje.remitenteInmobiliaria', 'remitenteInmobiliaria')
        .leftJoinAndSelect('mensaje.receptorInmobiliaria', 'receptorInmobiliaria')
        .where('mensaje.remitenteClienteId = :id OR mensaje.receptorClienteId = :id', { id });
    } else if (type === 'INMOBILIARIA') {
      query = query
        .leftJoinAndSelect('mensaje.remitenteCliente', 'remitenteCliente')
        .leftJoinAndSelect('mensaje.receptorCliente', 'receptorCliente')
        .leftJoinAndSelect('mensaje.remitenteInmobiliaria', 'remitenteInmobiliaria')
        .leftJoinAndSelect('mensaje.receptorInmobiliaria', 'receptorInmobiliaria')
        .where('mensaje.remitenteInmobiliariaId = :id OR mensaje.receptorInmobiliariaId = :id', { id });
    } else {
      throw new Error('Tipo no válido. Use "cliente" o "inmobiliaria"');
    }

    return query.getMany();
  }
}
