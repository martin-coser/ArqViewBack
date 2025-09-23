import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UnauthorizedException, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ActividadClienteService } from './actividad-cliente.service';
import { CreateActividadClienteDto } from './dto/create-actividad-cliente.dto';
import { UpdateActividadClienteDto } from './dto/update-actividad-cliente.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/guards/decoradores/roles.decorator';

@Controller('actividadCliente')
export class ActividadClienteController {
  constructor(private readonly actividadClienteService: ActividadClienteService) {}

  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENTE')
  create(@Body() createActividadClienteDto: CreateActividadClienteDto, @Req() req) {
    const cuentaId = req.user.id; // ID de la Cuenta, no del Cliente
    if (!cuentaId) {
      throw new UnauthorizedException('No se pudo obtener el ID de la cuenta del token');
    }
    return this.actividadClienteService.create(createActividadClienteDto, cuentaId);
  }

}
