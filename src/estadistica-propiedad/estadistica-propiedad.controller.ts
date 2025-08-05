import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/decoradores/roles.decorator';
import { EstadisticaPropiedadService } from 'src/estadistica-propiedad/estadistica-propiedad.service';

@Controller('estadisticaPropiedad')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('INMOBILIARIA')
export class EstadisticaPropiedadController {
  constructor(private readonly estadisticaPropiedadService: EstadisticaPropiedadService) {}

  @Get('/vistas')
  async getVistas() {
    return this.estadisticaPropiedadService.obtenerVistasPorPropiedad();
  }

  @Get('/interesados')
  async getInteresados() {
    return this.estadisticaPropiedadService.obtenerInteresadosPorPropiedad();
  }

  @Get('/consultas')
  async getConsultas() {
    return this.estadisticaPropiedadService.ObtenerConsultasPorPropiedad();
  }
}