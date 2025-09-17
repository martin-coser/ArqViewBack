import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/decoradores/roles.decorator';
import { EstadisticaPropiedadService } from 'src/estadistica-propiedad/estadistica-propiedad.service';

@Controller('estadisticaPropiedad')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('INMOBILIARIA,ADMIN')
export class EstadisticaPropiedadController {
  constructor(private readonly estadisticaPropiedadService: EstadisticaPropiedadService) {}

  @Get('/vistas')
  async getVistas(@Query('fechaInicio') fechaInicio: string, @Query('fechaFin') fechaFin: string) {
    if ((fechaInicio && !fechaFin) || (!fechaInicio && fechaFin)) {
      throw new BadRequestException('Debe proporcionar ambas fechas (fechaInicio y fechaFin) para filtrar por período.');
    }
    return this.estadisticaPropiedadService.obtenerVistasPorPropiedad(fechaInicio, fechaFin);
  }

  @Get('/interesados')
  async getInteresados(@Query('fechaInicio') fechaInicio: string, @Query('fechaFin') fechaFin: string) {
    if ((fechaInicio && !fechaFin) || (!fechaInicio && fechaFin)) {
      throw new BadRequestException('Debe proporcionar ambas fechas (fechaInicio y fechaFin) para filtrar por período.');
    }
    return this.estadisticaPropiedadService.obtenerInteresadosPorPropiedad(fechaInicio, fechaFin);
  }

  @Get('/consultas')
  async getConsultas(@Query('fechaInicio') fechaInicio: string, @Query('fechaFin') fechaFin: string) {
    return this.estadisticaPropiedadService.ObtenerConsultasPorPropiedad(fechaInicio, fechaFin);
  }
}