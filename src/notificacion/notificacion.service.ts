import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Notificacion } from './entities/notificacion.entity';
import { Cliente } from '../cliente/entities/cliente.entity';
import { Propiedad } from '../propiedad/entities/propiedad.entity';
import { ListaDeInteres } from '../lista-de-interes/entities/lista-de-interes.entity';

@Injectable()
export class NotificacionService {
  constructor(
    @InjectRepository(Notificacion)
    private notificacionRepository: Repository<Notificacion>,
    @InjectRepository(Cliente)
    private clienteRepository: Repository<Cliente>,
    @InjectRepository(ListaDeInteres)
    private listaDeInteresRepository: Repository<ListaDeInteres>,
    @InjectRepository(Propiedad)
    private propiedadRepository: Repository<Propiedad>,
  ) {}

  @OnEvent('propiedad.actualizada')
  async handlePropiedadUpdated(payload: { propiedadId: number; cambios: string }) {
    console.log(`Notificación de propiedad actualizada: ${payload.propiedadId}, Cambios: ${payload.cambios}`);
    // Buscar listas de interés que contengan la propiedad actualizada
    const listas = await this.listaDeInteresRepository
      .createQueryBuilder('lista')
      .innerJoin('lista.propiedades', 'propiedad', 'propiedad.id = :propiedadId', { propiedadId: payload.propiedadId })
      .leftJoinAndSelect('lista.cliente', 'cliente')
      .getMany();

    // Buscar la propiedad para obtener su nombre
    const propiedad = await this.propiedadRepository.findOne({ where: { id: payload.propiedadId } });
    if (!propiedad) {
      console.error(`Propiedad con ID ${payload.propiedadId} no encontrada`);
      return;
    }

    // Crear notificaciones para cada cliente
    for (const lista of listas) {
      if (!lista.cliente) continue;

      const notificacion = this.notificacionRepository.create({
        mensaje: `Cambios en la Propiedad "${propiedad.nombre}" en tu lista de interés`,
        tipo: 'PROPIEDAD_ACTUALIZADA',
        cliente: lista.cliente,
        propiedad,
        fecha: new Date(),
        leida: false,
      });

      await this.notificacionRepository.save(notificacion);
    }
  }

  
}