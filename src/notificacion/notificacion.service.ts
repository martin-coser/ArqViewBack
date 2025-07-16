import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Notificacion } from './entities/notificacion.entity';
import { Cliente } from '../cliente/entities/cliente.entity';
import { Propiedad } from '../propiedad/entities/propiedad.entity';
import { ListaDeInteres } from '../lista-de-interes/entities/lista-de-interes.entity';
import { NotificacionMensaje } from './entities/notificacionMensaje.entity';
import { Mensaje } from 'src/mensaje/entities/mensaje.entity';
import { MailerService } from '@nestjs-modules/mailer';

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
    @InjectRepository(NotificacionMensaje)
    private notificacionMensajeRepository: Repository<NotificacionMensaje>,
    @InjectRepository(Mensaje)
    private mensajeRepository: Repository<Mensaje>,
    private readonly mailerService: MailerService, // Inyectar MailerService
  ) {}

  @OnEvent('propiedad.actualizada')
  async handlePropiedadUpdated(payload: { propiedadId: number; cambios: string }) {
    console.log(`Notificación de propiedad actualizada: ${payload.propiedadId}, Cambios: ${payload.cambios}`);
    const listas = await this.listaDeInteresRepository
      .createQueryBuilder('lista')
      .innerJoin('lista.propiedades', 'propiedad', 'propiedad.id = :propiedadId', { propiedadId: payload.propiedadId })
      .leftJoinAndSelect('lista.cliente', 'cliente')
      .getMany();

    const propiedad = await this.propiedadRepository.findOne({ where: { id: payload.propiedadId } });
    if (!propiedad) {
      console.error(`Propiedad con ID ${payload.propiedadId} no encontrada`);
      return;
    }

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

  @OnEvent('nuevo.mensaje')
async nuevoMensaje(payload: { contenido: string; fechaCreacion: Date; remitente: string; receptor: string; mensajeId: number }) {
  const mensaje = await this.mensajeRepository.findOne({ where: { id: payload.mensajeId } });
  if (!mensaje) {
    console.error(`Mensaje con ID ${payload.mensajeId} no encontrado`);
    throw new NotFoundException(`Mensaje con ID ${payload.mensajeId} no encontrado`);
  }

  const notificacionMensaje = this.notificacionMensajeRepository.create({
    contenido: payload.contenido,
    remitente: payload.remitente,
    receptor: payload.receptor,
    fechaCreacion: payload.fechaCreacion,
    mensaje,
  });

  await this.notificacionMensajeRepository.save(notificacionMensaje);

  // Validar que el receptor sea un correo válido
  if (!payload.receptor || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.receptor)) {
    console.error(`Correo inválido para el receptor: ${payload.receptor}`);
    throw new Error('Correo del receptor no válido');
  }

  try {
    await this.mailerService.sendMail({
      to: payload.receptor,
      from: 'grupo8albasoft@gmail.com',
      subject: 'Nuevo mensaje recibido',
      text: `Has recibido un nuevo mensaje de ${payload.remitente}:\n\n${payload.contenido}`,
    });
    console.log(`Correo enviado a ${payload.receptor}`);
  } catch (error) {
    console.error(`Error al enviar correo a ${payload.receptor}:`, error);
    throw new Error('No se pudo enviar el correo');
  }
}
}