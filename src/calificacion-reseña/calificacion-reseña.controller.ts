import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';

import { Roles } from 'src/decoradores/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CalificacionResena } from './entities/calificacion-reseña.entity';
import { CreateCalificacionResenaDto } from './dto/create-calificacion-reseña.dto';
import { UpdateCalificacionResenaDto } from './dto/update-calificacion-reseña.dto';
import { CalificacionResenaService } from './calificacion-reseña.service';

@Controller('calificacion-resena')
export class CalificacionResenaController {
  constructor(private readonly CalificacionResenaService: CalificacionResenaService){}

 @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENTE')
  async create(@Body() createCalificacionResenaDto: CreateCalificacionResenaDto,@Req() req): Promise<CalificacionResena> {
    const cuentaId = (req.user as any).id;
    return await this.CalificacionResenaService.create(createCalificacionResenaDto, cuentaId);
  }

  @Get('promedio/:inmobiliariaId')
  @HttpCode(HttpStatus.OK)
  getPromedioInmobiliaria(@Param('inmobiliariaId', ParseIntPipe) inmobiliariaId: number): Promise<number> {
    return this.CalificacionResenaService.getPromedioInmobiliaria(inmobiliariaId);
  }


  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id', ParseIntPipe) id: number) : Promise<CalificacionResena> {
    return this.CalificacionResenaService.findOne(id);
  }
  
 
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll() : Promise<CalificacionResena[]> {
    return this.CalificacionResenaService.findAll();
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENTE')
  update(@Param('id', ParseIntPipe) id: number,@Body() updateCalificacionResenaDto: UpdateCalificacionResenaDto,) : Promise<CalificacionResena> {
    return this.CalificacionResenaService.update(id, updateCalificacionResenaDto);
  }
  
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENTE')
  remove(@Param('id', ParseIntPipe) id: number) : Promise<void> {
    return this.CalificacionResenaService.remove(id);
  }
}