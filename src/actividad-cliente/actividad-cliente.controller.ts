import { Controller, Post, Body, Req, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { ActividadClienteService } from './actividad-cliente.service';
import { CreateActividadClienteDto } from './dto/create-actividad-cliente.dto';

import { Roles } from 'src/guards/decoradores/roles.decorator';

@Controller('actividadCliente')
export class ActividadClienteController {
  constructor(private readonly actividadClienteService: ActividadClienteService) { }

  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  @Roles('CLIENTE')
  create(@Body() createActividadClienteDto: CreateActividadClienteDto, @Req() req) {
    const cuentaId = req.user.id;
    if (!cuentaId) {
      throw new UnauthorizedException('No se pudo obtener el ID de la cuenta del token');
    }
    return this.actividadClienteService.create(createActividadClienteDto, cuentaId);
  }

}
