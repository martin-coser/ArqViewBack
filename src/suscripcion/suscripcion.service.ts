import { BadRequestException, Injectable } from '@nestjs/common';
import { Comprobante } from './entities/comprobante.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';
import { Repository } from 'typeorm';
import { Cuenta } from 'src/auth/entities/cuenta.entity';
import { InmobiliariaService } from 'src/inmobiliaria/inmobiliaria.service';

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
  ) {}

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
      throw new BadRequestException('El pago no se realizó porque la fecha esta fuera del plazo permitido. El plan ha sido cambiado a básico.');
    }else{
      // Asegurarse de guardar el plan solo si el pago va a ser exitoso.
      // La lógica de simulación de pago va aquí.
      await new Promise((resolve) => setTimeout(resolve, 20000));

      // Si la simulación de pago fue exitosa, entonces se guardan los cambios.
      await this.inmobiliariaRepository.save(inmobiliaria);

      // Actualizar plan
      await this.inmobiliariaService.updatePlan(inmobiliaria.id, 'PREMIUM');

      // Crear y guardar el comprobante
      const comprobante = new Comprobante();
      await this.comprobanteRepository.save(comprobante);

      // Enviar comprobante por email

      return comprobante;
    }

    
  }
}