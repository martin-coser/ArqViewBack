import { Controller, Get, UseGuards } from '@nestjs/common';
import { Planes } from 'src/guards/decoradores/planes.decorator';
import { Roles } from 'src/guards/decoradores/roles.decorator';
import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/decoradores/roles.decorator';
import { EstadisticaPropiedadService } from 'src/estadistica-propiedad/estadistica-propiedad.service';

@Controller('estadisticaPropiedad')
@Roles('INMOBILIARIA')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('INMOBILIARIA,ADMIN')
export class EstadisticaPropiedadController {
  constructor(private readonly estadisticaPropiedadService: EstadisticaPropiedadService) {}

  @Get('/vistas')
  @Planes('PREMIUM')
  async getVistas() {
    return this.estadisticaPropiedadService.obtenerVistasPorPropiedad();
  async getVistas(@Query('fechaInicio') fechaInicio: string, @Query('fechaFin') fechaFin: string) {
    if ((fechaInicio && !fechaFin) || (!fechaInicio && fechaFin)) {
      throw new BadRequestException('Debe proporcionar ambas fechas (fechaInicio y fechaFin) para filtrar por período.');
    }
    return this.estadisticaPropiedadService.obtenerVistasPorPropiedad(fechaInicio, fechaFin);
  }

  @Get('/interesados')
  @Planes('PREMIUM')
  async getInteresados() {
    return this.estadisticaPropiedadService.obtenerInteresadosPorPropiedad();
  async getInteresados(@Query('fechaInicio') fechaInicio: string, @Query('fechaFin') fechaFin: string) {
    if ((fechaInicio && !fechaFin) || (!fechaInicio && fechaFin)) {
      throw new BadRequestException('Debe proporcionar ambas fechas (fechaInicio y fechaFin) para filtrar por período.');
    }
    return this.estadisticaPropiedadService.obtenerInteresadosPorPropiedad(fechaInicio, fechaFin);
  }

  @Get('/consultas')
  @Planes('PREMIUM')
  async getConsultas() {
    return this.estadisticaPropiedadService.ObtenerConsultasPorPropiedad();
  async getConsultas(@Query('fechaInicio') fechaInicio: string, @Query('fechaFin') fechaFin: string) {
    return this.estadisticaPropiedadService.ObtenerConsultasPorPropiedad(fechaInicio, fechaFin);
  }
}