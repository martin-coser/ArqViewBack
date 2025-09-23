import { Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { SuscripcionService } from './suscripcion.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/guards/decoradores/roles.decorator';

@Controller('suscripcion')
export class SuscripcionController {
  constructor(private readonly suscripcionService: SuscripcionService) {}

  @Post('abonar')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)  
  @Roles('INMOBILIARIA')
  async abonar(@Req() req) {
    const cuentaId = req.user.id; 
    return this.suscripcionService.abonar(cuentaId); // cuentaId de ejemplo
  }
}
