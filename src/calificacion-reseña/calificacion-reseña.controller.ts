import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { CalificacionResena } from './entities/calificacion-reseña.entity';
import { CreateCalificacionResenaDto } from './dto/create-calificacion-reseña.dto';
import { UpdateCalificacionResenaDto } from './dto/update-calificacion-reseña.dto';
import { CalificacionResenaService } from './calificacion-reseña.service';
import { Roles } from 'src/guards/decoradores/roles.decorator';

@Controller('calificacion-resena')
export class CalificacionResenaController {
  constructor(private readonly CalificacionResenaService: CalificacionResenaService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('CLIENTE')
  async create(@Body() createCalificacionResenaDto: CreateCalificacionResenaDto, @Req() req): Promise<CalificacionResena> {
    const cuentaId = req.user.id;
    return await this.CalificacionResenaService.create(createCalificacionResenaDto, cuentaId);
  }

  @Get('promedio/:inmobiliariaId')
  @HttpCode(HttpStatus.OK)
  getPromedioInmobiliaria(@Param('inmobiliariaId', ParseIntPipe) inmobiliariaId: number): Promise<number> {
    return this.CalificacionResenaService.getPromedioInmobiliaria(inmobiliariaId);
  }

  // Obtener todas las calificaciones y reseñas por ID COREGGIR
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(): Promise<CalificacionResena[]> {
    return this.CalificacionResenaService.findAll();
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('CLIENTE')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCalificacionResenaDto: UpdateCalificacionResenaDto,): Promise<CalificacionResena> {
    return this.CalificacionResenaService.update(id, updateCalificacionResenaDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('CLIENTE')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.CalificacionResenaService.remove(id);
  }
}