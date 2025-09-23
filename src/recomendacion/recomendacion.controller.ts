import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { RecomendacionService } from './recomendacion.service';
import { CreateRecomendacionDto } from './dto/create-recomendacion.dto';
import { UpdateRecomendacionDto } from './dto/update-recomendacion.dto';
import { RolesGuard } from 'src/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/guards/decoradores/roles.decorator';

@Controller('recomendacion')
export class RecomendacionController {
  constructor(private readonly recomendacionService: RecomendacionService) {}

  @Get(':clienteId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENTE')
  async obtenerRecomendaciones(@Param('clienteId') clienteId: number) {
    return this.recomendacionService.generarRecomendaciones(clienteId);
  }
}
