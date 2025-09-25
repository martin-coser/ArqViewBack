import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { RecomendacionService } from './recomendacion.service';
import { Roles } from 'src/guards/decoradores/roles.decorator';

@Controller('recomendacion')
export class RecomendacionController {
  constructor(private readonly recomendacionService: RecomendacionService) { }

  @Get(':clienteId')
  @HttpCode(HttpStatus.OK)
  @Roles('CLIENTE')
  async obtenerRecomendaciones(@Param('clienteId') clienteId: number) {
    return await this.recomendacionService.generarRecomendaciones(clienteId);
  }
}
