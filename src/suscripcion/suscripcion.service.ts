import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Comprobante } from './entities/comprobante.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';
import { Repository, Not } from 'typeorm';
import { Cuenta } from 'src/auth/entities/cuenta.entity';
import { InmobiliariaService } from 'src/inmobiliaria/inmobiliaria.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SuscripcionService {
  constructor(
    @InjectRepository(Inmobiliaria)
    private inmobiliariaRepository: Repository<Inmobiliaria>,
    @InjectRepository(Cuenta)
    private cuentaRepository: Repository<Cuenta>,
    @InjectRepository(Comprobante)
    private comprobanteRepository: Repository<Comprobante>,
    private readonly inmobiliariaService: InmobiliariaService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async abonar(cuentaId: number): Promise<Comprobante> {
    const cuenta = await this.cuentaRepository.findOneBy({ id: cuentaId });
    if (!cuenta) {
      throw new Error('Cuenta no encontrada');
    }

    const inmobiliaria = await this.inmobiliariaRepository.findOneBy({
      cuenta: cuenta,
    });
    if (!inmobiliaria) {
      throw new Error('Inmobiliaria no encontrada');
    }

    let fechaVencimientoActual: Date | null;
    let fechaLimite: Date;
    const fechaActual = new Date();

    // Verifico si tiene fecha de suscripcion
    if (!inmobiliaria.fechaSuscripcion) {
      // Si no tiene, es la primera vez que se suscribe
      inmobiliaria.fechaSuscripcion = new Date();
      const nuevaFechaVencimiento = new Date(inmobiliaria.fechaSuscripcion);
      nuevaFechaVencimiento.setDate(nuevaFechaVencimiento.getDate() + 30);
      inmobiliaria.fechaVencimiento = nuevaFechaVencimiento;
      fechaVencimientoActual = nuevaFechaVencimiento; // Aseguramos que tenga un valor para el cálculo.
    } else {
      // Si ya tiene fecha de suscripcion, renueva fecha de vencimiento
      fechaVencimientoActual = inmobiliaria.fechaVencimiento;
      if (!fechaVencimientoActual) {
        throw new Error('La fecha de vencimiento es nula');
      }

      const nuevaFechaVencimiento = new Date(fechaVencimientoActual);
      nuevaFechaVencimiento.setDate(nuevaFechaVencimiento.getDate() + 30);
      inmobiliaria.fechaVencimiento = nuevaFechaVencimiento;
    }

    // Calcula la fecha límite aquí, después de que fechaVencimientoActual haya sido inicializada
    // en cualquiera de los bloques de arriba.
    fechaLimite = new Date(fechaVencimientoActual!);
    fechaLimite.setDate(fechaLimite.getDate() + 3);

    // Verifico si el pago se realiza dentro del plazo
    // Aquí es donde usas la fecha límite para comparar.
    if (fechaActual > fechaLimite) {

      const inmobiliariaActualizada = await this.inmobiliariaService.updatePlan(inmobiliaria.id, 'BASICO');
      inmobiliariaActualizada.fechaSuscripcion = null;
      inmobiliariaActualizada.fechaVencimiento = null;
      await this.inmobiliariaRepository.save(inmobiliariaActualizada);

      this.eventEmitter.emit('suscripcion.caducada', {
        cuentaId: cuenta.id,
        mensaje: 'La suscripción ha caducado y el plan ha sido cambiado a básico.',
      });

      throw new BadRequestException('El pago no se realizó porque la fecha esta fuera del plazo permitido. El plan ha sido cambiado a básico.');
    } else {
      // Asegurarse de guardar el plan solo si el pago va a ser exitoso.
      // La lógica de simulación de pago va aquí.
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Si la simulación de pago fue exitosa, entonces se guardan los cambios.
      await this.inmobiliariaRepository.save(inmobiliaria);

      // Actualizar plan
      await this.inmobiliariaService.updatePlan(inmobiliaria.id, 'PREMIUM');

      // Crear y guardar el comprobante
      const comprobante = new Comprobante();
      await this.comprobanteRepository.save(comprobante);

      // Enviar comprobante por email
      this.eventEmitter.emit('suscripcion.pagada', {
        cuentaId: cuenta.id,
        mensaje: 'El pago de la suscripción se ha realizado con éxito.',
        comprobante: comprobante,
      });

      return comprobante;
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async notificarClientes() {
    try {
      const inmobiliarias = await this.inmobiliariaRepository.find({
        where: { plan: 'PREMIUM' },
        relations: ['cuenta'],
      });

      const fechaActual = new Date();
      for (const inmobiliaria of inmobiliarias) {
        try {
          if (inmobiliaria.fechaVencimiento) {
            const fechaVencimiento = new Date(inmobiliaria.fechaVencimiento);
            const diferenciaEnDias = Math.ceil((fechaVencimiento.getTime() - fechaActual.getTime()) / (1000 * 60 * 60 * 24));
            if (diferenciaEnDias === 3) {
              this.eventEmitter.emit('suscripcion.proximaAVencer', {
                cuentaId: inmobiliaria.cuenta.id,
                mensaje: `Tu suscripción está por vencer, tienes 3 días para pagar, de lo contrario se cambiará al plan básico. El costo de renovación es de USD $25.`,
              });
            }
          }
        } catch (error) {
          console.error(`Error al procesar notificación para inmobiliaria ${inmobiliaria.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error en la tarea programada notificarClientes:', error);
    }
  }

  async probarPremium(cuentaId: number): Promise<void> {
    const cuenta = await this.cuentaRepository.findOneBy({ id: cuentaId });

    if (!cuenta) {
      throw new NotFoundException(`Cuenta con ID ${cuentaId} no encontrada`);
    }

    const inmobiliaria = await this.inmobiliariaRepository.findOneBy({ cuenta: cuenta });
    if (!inmobiliaria) {
      throw new NotFoundException(`Inmobiliaria para la cuenta ID ${cuentaId} no encontrada`);
    }

    if (inmobiliaria.usoFreemium === false && inmobiliaria.plan !== 'PREMIUM') {
      inmobiliaria.fechaComienzoFreemium = new Date();
      // Establecer la fecha de vencimiento a 30 dias desde la fecha de comienzo
      const fechaVencimientoFreemium = new Date(inmobiliaria.fechaComienzoFreemium);
      fechaVencimientoFreemium.setDate(fechaVencimientoFreemium.getDate() + 30);
      inmobiliaria.fechaFinFreemium = fechaVencimientoFreemium;
      await this.inmobiliariaRepository.save(inmobiliaria);
      await this.inmobiliariaService.updatePlan(inmobiliaria.id, 'PREMIUM');
      // Emitir evento de suscripción freemium iniciada
      this.eventEmitter.emit('suscripcion.freemiumIniciada', {
        cuentaId: cuenta.id,
        mensaje: 'Has iniciado tu período de prueba gratuita de 30 días en el plan PREMIUM. Esta prueba finalizará automáticamente al término de los 30 días, a menos que decidas suscribirte antes. Fecha de finalización: ' + fechaVencimientoFreemium.toDateString(),
      });
    } else {
      throw new BadRequestException('El período de prueba gratuita ya ha sido utilizado anteriormente.');
    }
  }

  //ejecutar todos los dias a las 00:00
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async verificarFreemium() {
    //traer todas las inmobiliarias que esten pasando por el periodo freemium
    const inmobiliarias = await this.inmobiliariaRepository.find({
      where: { plan: 'PREMIUM', usoFreemium: false, fechaComienzoFreemium: Not(require('typeorm').IsNull()) },
      relations: ['cuenta'],
    });

    const fechaActual = new Date();

    for (const inmobiliaria of inmobiliarias) {
      // si fechaActual es mayor o igual a fechaFinFreemium, cambiar plan a basico
      if (inmobiliaria.fechaFinFreemium && fechaActual > inmobiliaria.fechaFinFreemium) {

        inmobiliaria.usoFreemium = true;

        // notificar al cliente que su freemium ha finalizado y se cambio a basico
        this.eventEmitter.emit('suscripcion.freemiumFinalizado', {
          cuentaId: inmobiliaria.cuenta.id,
          mensaje: 'Tu período de prueba gratuita de 30 días en el plan PREMIUM ha finalizado. Tu plan ha sido cambiado automáticamente al plan BÁSICO. Si deseas continuar disfrutando de los beneficios del plan PREMIUM, te invitamos a suscribirte. El costo de renovación es de USD $25.',
        });
        await this.inmobiliariaRepository.save(inmobiliaria);
        await this.inmobiliariaService.updatePlan(inmobiliaria.id, 'BASICO');

      } else {
        if (inmobiliaria.fechaFinFreemium) {
          // si la fecha actual es 3 dias menor a la fecha de fin freemium, enviar notificacion
          const fechaNotificacion = new Date(inmobiliaria.fechaFinFreemium);
          fechaNotificacion.setDate(fechaNotificacion.getDate() - 3);
          if (fechaActual >= fechaNotificacion) { // Osea que faltan 3 dias o menos para que termine el freemium
            const cuenta = await this.cuentaRepository.findOneBy({ id: inmobiliaria.cuenta.id });
            if (cuenta) {
              this.eventEmitter.emit('suscripcion.proximaAVencer', {
                cuentaId: cuenta.id,
                mensaje: `Tu período de prueba gratuita de 30 días en el plan PREMIUM está por vencer. Para continuar disfrutando de los beneficios del plan PREMIUM, te invitamos a suscribirte antes de que finalice tu prueba gratuita. El costo de renovación es de USD $25.`,
              });
            }
          }
        }

      }
    }
  }
}