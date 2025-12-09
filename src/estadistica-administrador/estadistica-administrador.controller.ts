import { Controller, Get, HttpCode, HttpStatus} from '@nestjs/common';
import { EstadisticaAdministradorService } from './estadistica-administrador.service';
import { Roles } from 'src/guards/decoradores/roles.decorator';

@Controller('estadistica-administrador')
export class EstadisticaAdministradorController {
  constructor(private readonly estadisticaAdministradorService: EstadisticaAdministradorService) {}

  @Get('/totalInmobiliarias')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async obtenerTotalInmobiliarias(): Promise<number> {
    return this.estadisticaAdministradorService.obtenerTotalInmobiliarias();
  }

  @Get('/totalInmobiliariasPremium')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async obtenerTotalInmobiliariasPremium(): Promise<number> {
    return this.estadisticaAdministradorService.obtenerTotalInmobiliariasPremium();
  }

  @Get('/porcentajeInmobiliariasPremium')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async calcularPorcentajeInmobiliariasPremium(): Promise<number> {
    return this.estadisticaAdministradorService.calcularPorcentajeInmobiliariasPremium();
  }
}
