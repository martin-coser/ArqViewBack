import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Mensaje } from './entities/mensaje.entity';
import { Repository } from 'typeorm';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';
import { CrearMensajeDto } from './dto/crear-mensaje.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class MensajeService {
  constructor(
    @InjectRepository(Mensaje)
    private repositorioMensajes: Repository<Mensaje>,
    @InjectRepository(Cliente)
    private repositorioClientes: Repository<Cliente>,
    @InjectRepository(Inmobiliaria)
    private repositorioInmobiliarias: Repository<Inmobiliaria>,
    private eventEmitter: EventEmitter2,
  ) {}

  async enviarMensaje(crearMensajeDto: CrearMensajeDto): Promise<Mensaje> {
    const { idRemitente, idReceptor, contenido, tipoRemitente, tipoReceptor } = crearMensajeDto;

    let remitente, receptor;

    // Validar que el tipo de remitente y receptor sean correctos
    if (tipoRemitente === 'CLIENTE') {
      remitente = await this.repositorioClientes.findOne({
        where: { id: idRemitente },
        relations: ['cuenta'],
      });
    } else if (tipoRemitente === 'INMOBILIARIA') {
      remitente = await this.repositorioInmobiliarias.findOne({
        where: { id: idRemitente },
        relations: ['cuenta'],
      });
    }
    if (tipoReceptor === 'CLIENTE') {
      receptor = await this.repositorioClientes.findOne({
        where: { id: idReceptor },
        relations: ['cuenta'],
      });
    } else if (tipoReceptor === 'INMOBILIARIA') {
      receptor = await this.repositorioInmobiliarias.findOne({
        where: { id: idReceptor },
        relations: ['cuenta'],
      });
    }

    if (!remitente || !receptor) {
      throw new Error('Remitente o receptor no encontrado');
    }

    // Validar que el correo del receptor exista
    if (!receptor.cuenta?.email) {
      throw new Error('El receptor no tiene un correo electrónico válido');
    }

    const mensaje = this.repositorioMensajes.create({
      contenido,
      remitenteCliente: tipoRemitente === 'CLIENTE' ? remitente : null,
      remitenteInmobiliaria: tipoRemitente === 'INMOBILIARIA' ? remitente : null,
      receptorCliente: tipoReceptor === 'CLIENTE' ? receptor : null,
      receptorInmobiliaria: tipoReceptor === 'INMOBILIARIA' ? receptor : null,
    });

    const result = await this.repositorioMensajes.save(mensaje);

    if (result) {
      this.eventEmitter.emit('nuevo.mensaje', {
        contenido: mensaje.contenido,
        fechaCreacion: mensaje.fechaCreacion,
        remitente: remitente.cuenta.nombreUsuario,
        receptor: receptor.cuenta.email, // Cambiar a email en lugar de nombreUsuario
        mensajeId: mensaje.id,
      });
    }

    return result;
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