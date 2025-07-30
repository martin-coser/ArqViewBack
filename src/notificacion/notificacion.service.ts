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
    private readonly mailerService: MailerService, 
  ) {}

  @OnEvent('propiedad.actualizada')
  async handlePropiedadUpdated(payload: { propiedadId: number; cambios: string; oldNombre?: string; newNombre?: string }) {
    const listas = await this.listaDeInteresRepository
      .createQueryBuilder('lista')
      .innerJoin('lista.propiedades', 'propiedad', 'propiedad.id = :propiedadId', { propiedadId: payload.propiedadId })
      .leftJoinAndSelect('lista.cliente', 'cliente')
      .leftJoinAndSelect('cliente.cuenta', 'cuenta') 
      .getMany()

      const listaNueva = await this.listaDeInteresRepository.find ({
        where: { propiedades: { id: payload.propiedadId } },
        relations: ['cliente', 'cliente.cuenta'],
      });
      console.log('Listas:', listas);
      console.log('Lista Nueva:', listaNueva);

    const propiedad = await this.propiedadRepository.findOne({ where: { id: payload.propiedadId } });
    if (!propiedad) {
      console.error(`Propiedad con ID ${payload.propiedadId} no encontrada`);
      return;
    }

    let emailSubject: string;
    let emailTitle: string;

    // Si el nombre antiguo y el nuevo existen y son diferentes, usamos el formato "viejo" a "nuevo"
    if (payload.oldNombre && payload.newNombre && payload.oldNombre !== payload.newNombre) {
      emailSubject = `Actualización De Propiedad"`;
    } else {
      // Si el nombre no cambió o no se proporcionó, usamos el formato general con el nombre actual de la propiedad
      emailSubject = `Actualización en la propiedad "${propiedad.nombre}" en tu lista de interés`;
      emailTitle = `Actualización en la propiedad "${propiedad.nombre}"`;
    }



    for (const lista of listas) {
      // Crear y guardar la notificación en la base de datos
      const notificacion = this.notificacionRepository.create({
        mensaje: `Cambios en la Propiedad "${propiedad.nombre}" en tu lista de interés`, 
        tipo: 'PROPIEDAD_ACTUALIZADA',
        cliente: lista.cliente,
        propiedad,
        fecha: new Date(),
        leida: false,
      });

      await this.notificacionRepository.save(notificacion);

      try {
        await this.mailerService.sendMail({
          to: lista.cliente.cuenta.email, 
          from: 'grupo8albasoft@gmail.com', 
          subject: emailSubject, 
          html: `
            <p>Hola ${lista.cliente.nombre || 'cliente'},</p>
            <p>Queremos informarte que ha habido cambios en una de las propiedades que tienes en tu lista de interés.</p>
            <p>Detalles de los cambios:</p>
            <p>${payload.cambios}</p> 
            <p>Puedes revisar los detalles de la propiedad en nuestra plataforma.</p>
            <p>¡Gracias por usar nuestros servicios!</p>
            <p>Atentamente,</p>
            <p>El equipo de Arqview </p>
          `,
        });
      } catch (error) {
        new NotFoundException(`No se pudo enviar el correo a ${lista.cliente.cuenta.email}`);
      }
    }
  }

  @OnEvent('nuevo.mensaje')
async nuevoMensaje(payload: { contenido: string; fechaCreacion: Date; remitente: string; receptor: string; mensajeId: number }) {
  const mensaje = await this.mensajeRepository.findOne({ where: { id: payload.mensajeId } });
  if (!mensaje) {

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
  } catch (error) {
    console.error(`Error al enviar correo a ${payload.receptor}:`, error);
    throw new Error('No se pudo enviar el correo');
  }
}

async findByCliente(id: number) : Promise<Notificacion[]> {
  const notificaciones = await this.notificacionRepository.find({
    where: { cliente: { id } },
  });
  if (!notificaciones || notificaciones.length === 0) {
    throw new NotFoundException(`No se encontraron notificaciones para el cliente con id ${id}`);
  }
  return notificaciones;
}

async marcarLeida(id: number) : Promise<Notificacion> {
  const notificacion = await this.notificacionRepository.findOne({ where: { id } });
  if (!notificacion) {
    throw new NotFoundException(`No se encontró la notificación con id ${id}`);
  }
  notificacion.leida = true;
  return await this.notificacionRepository.save(notificacion);
}

async getMensajesByEmail(email: string): Promise<NotificacionMensaje[]> {
  const notificaciones = await this.notificacionMensajeRepository.find({
    where: { receptor: email },
  });
  if (!notificaciones || notificaciones.length === 0) {
    throw new NotFoundException(`No se encontró una notificación para el email ${email}`);
  }
  return notificaciones;
}

async marcarMensajeLeido(id: number): Promise<NotificacionMensaje> {
  const notificacionMensaje = await this.notificacionMensajeRepository.findOne({ where: { id } });
  if (!notificacionMensaje) {
    throw new NotFoundException(`No se encontró la notificación de mensaje con id ${id}`);
  }
  notificacionMensaje.leida = true;
  return await this.notificacionMensajeRepository.save(notificacionMensaje);
}
}