import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ActividadCliente } from '../actividad-cliente/entities/actividad-cliente.entity';

@Injectable()
export class EstadisticaPropiedadService {
  constructor(
    @InjectRepository(ActividadCliente)
    private readonly actividadClienteRepository: Repository<ActividadCliente>,
  ) {}

  //metodo privado para crear la query base , recibe el tipo de actividad
  //permite que los otros metodos no repitan codigo
  private crearQueryBase(tipoDeActividad: string): SelectQueryBuilder<ActividadCliente> {
    return this.actividadClienteRepository.createQueryBuilder('actividad')
      .where('actividad.tipoDeActividad = :tipo', { tipo: tipoDeActividad })
      .groupBy('actividad.propiedad_id');
  }

  async obtenerVistasPorPropiedad(fechaInicio: string, fechaFin: string) {
    const query = this.crearQueryBase('VISUALIZACION')
      .select('actividad.propiedad_id', 'propiedadId')
      .addSelect('COUNT(actividad.id)', 'totalVistas');
    
    if (fechaInicio && fechaFin) {
      query.andWhere('actividad.fechaYHoraActividad BETWEEN :fechaInicio AND :fechaFin', { fechaInicio, fechaFin });
    }
    
    return query.getRawMany();
  }

  async obtenerInteresadosPorPropiedad(fechaInicio: string, fechaFin: string) {
    const query = this.crearQueryBase('LISTADEINTERES')
      .select('actividad.propiedad_id', 'propiedadId')
      .addSelect('COUNT(actividad.id)', 'totalInteresados');

    if (fechaInicio && fechaFin) {
      query.andWhere('actividad.fechaYHoraActividad BETWEEN :fechaInicio AND :fechaFin', { fechaInicio, fechaFin });
    }

    return query.getRawMany();
  }

  async ObtenerConsultasPorPropiedad(fechaInicio: string, fechaFin: string) {
    const query = this.crearQueryBase('CONSULTA')
      .select('actividad.propiedad_id', 'propiedadId')
      .addSelect('COUNT(actividad.id)', 'totalConsultas');

    if (fechaInicio && fechaFin) {
      query.andWhere('actividad.fechaYHoraActividad BETWEEN :fechaInicio AND :fechaFin', { fechaInicio, fechaFin });
    }
    
    return query.getRawMany();
  }
}