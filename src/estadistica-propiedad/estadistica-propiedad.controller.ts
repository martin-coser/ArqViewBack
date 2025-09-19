import { Controller, Get, UseGuards } from '@nestjs/common';
import { Planes } from 'src/guards/decoradores/planes.decorator';
import { Roles } from 'src/guards/decoradores/roles.decorator';
import { EstadisticaPropiedadService } from 'src/estadistica-propiedad/estadistica-propiedad.service';

@Controller('estadisticaPropiedad')
@Roles('INMOBILIARIA')
export class EstadisticaPropiedadController {
  constructor(private readonly estadisticaPropiedadService: EstadisticaPropiedadService) {}

  @Get('/vistas')
  @Planes('PREMIUM')
  async getVistas() {
    return this.estadisticaPropiedadService.obtenerVistasPorPropiedad();
  }

  @Get('/interesados')
  @Planes('PREMIUM')
  async getInteresados() {
    return this.estadisticaPropiedadService.obtenerInteresadosPorPropiedad();
  }

  @Get('/consultas')
  @Planes('PREMIUM')
  async getConsultas() {
    return this.estadisticaPropiedadService.ObtenerConsultasPorPropiedad();
  }
}