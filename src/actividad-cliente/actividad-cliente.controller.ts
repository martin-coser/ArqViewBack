import { Controller, Post, Body, Req, UnauthorizedException, HttpCode, HttpStatus, Get, Query } from '@nestjs/common';
import { ActividadClienteService } from './actividad-cliente.service';
import { CreateActividadClienteDto } from './dto/create-actividad-cliente.dto';

import { Roles } from 'src/guards/decoradores/roles.decorator';
import { FiltrosFechaChatIaDto } from './dto/filtrosfechaChatIa.dto';

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

  @Get('/chat-ia-uses')
    @Roles('ADMINISTRADOR')
    async getCountChatIaUses(@Query() filterDto: FiltrosFechaChatIaDto) { // Usamos @Query para filtros de fecha
        // Llama al método del servicio que calcula el total y el desglose diario (cantidad de usos por día)
        return this.actividadClienteService.getcountChatIaUses(filterDto);
    }

}
