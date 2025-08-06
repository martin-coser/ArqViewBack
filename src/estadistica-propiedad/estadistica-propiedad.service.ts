import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActividadCliente } from '../actividad-cliente/entities/actividad-cliente.entity';

@Injectable()
export class EstadisticaPropiedadService {
  constructor(
    @InjectRepository(ActividadCliente)
    private readonly actividadClienteRepository: Repository<ActividadCliente>,
  ) {}

  async obtenerVistasPorPropiedad(){
    return this.actividadClienteRepository.createQueryBuilder('actividad').select('actividad.propiedad_id', 'propiedadId').addSelect('COUNT(actividad.id)', 'totalVistas').where('actividad.tipoDeActividad = :tipo', { tipo: 'VISUALIZACION' }).groupBy('actividad.propiedad_id').getRawMany();
  }

  async obtenerInteresadosPorPropiedad() {
    return this.actividadClienteRepository.createQueryBuilder('actividad').select('actividad.propiedad_id', 'propiedadId').addSelect('COUNT(actividad.id)', 'totalInteresados').where('actividad.tipoDeActividad = :tipo', { tipo: 'LISTADEINTERES' }).groupBy('actividad.propiedad_id').getRawMany();
  }

  async ObtenerConsultasPorPropiedad() {
    return this.actividadClienteRepository.createQueryBuilder('actividad').select('actividad.propiedad_id', 'propiedadId').addSelect('COUNT(actividad.id)', 'totalConsultas').where('actividad.tipoDeActividad = :tipo', { tipo: 'CONSULTA' }).groupBy('actividad.propiedad_id').getRawMany();
  }

}
