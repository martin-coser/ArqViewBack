import { Controller, Get, Param, HttpCode, UseGuards, ParseIntPipe, HttpStatus, Patch } from '@nestjs/common';
import { NotificacionService } from './notificacion.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/decoradores/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Notificacion } from './entities/notificacion.entity';
import { NotificacionMensaje } from './entities/notificacionMensaje.entity';


@Controller('notificacion')
export class NotificacionController {
  constructor(private readonly notificacionService: NotificacionService) {}

  @Get('/findByCliente/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENTE','INMOBILIARIA')
  async findByCliente(@Param('id',ParseIntPipe) id: number) : Promise<Notificacion[]> {
    return await this.notificacionService.findByCliente(id);
  }

  @Patch('/marcarLeida/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENTE','INMOBILIARIA')
  async marcarLeida(@Param('id', ParseIntPipe) id: number) : Promise<Notificacion> {
    return await this.notificacionService.marcarLeida(id);
  }

  @Get('/getMensajesByEmail/:email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENTE','INMOBILIARIA')
  async getMensajesByEmail(@Param('email') email: string) : Promise<NotificacionMensaje[]> {
    return await this.notificacionService.getMensajesByEmail(email);
  }

  @Patch('/marcarMensajeLeido/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENTE','INMOBILIARIA')
  async marcarMensajeLeido(@Param('id', ParseIntPipe) id: number) : Promise<NotificacionMensaje> {
    return await this.notificacionService.marcarMensajeLeido(id);
  }


}
