import { Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { SuscripcionService } from './suscripcion.service';
import { Roles } from 'src/guards/decoradores/roles.decorator';

@Controller('suscripcion')
export class SuscripcionController {
  constructor(private readonly suscripcionService: SuscripcionService) {}

  @Post('abonar')
  @HttpCode(HttpStatus.OK)
  @Roles('INMOBILIARIA')
  async abonar(@Req() req) {
    const cuentaId = req.user.id; 
    return await this.suscripcionService.abonar(cuentaId); 
  }
}
