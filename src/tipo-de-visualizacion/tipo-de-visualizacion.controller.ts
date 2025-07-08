import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { TipoDeVisualizacionService } from './tipo-de-visualizacion.service';
import { CreateTipoDeVisualizacionDto } from './dto/create-tipo-de-visualizacion.dto';
import { UpdateTipoDeVisualizacionDto } from './dto/update-tipo-de-visualizacion.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/decoradores/roles.decorator';

@Controller('tipoDeVisualizacion')
export class TipoDeVisualizacionController {
  constructor(private readonly tipoDeVisualizacionService: TipoDeVisualizacionService) {}

  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async create(@Body() createTipoDeVisualizacionDto: CreateTipoDeVisualizacionDto) {
    return await this.tipoDeVisualizacionService.create(createTipoDeVisualizacionDto);
  }

  @Get('/findAll')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN','INMOBILIARIA')
  async findAll() {
    return await this.tipoDeVisualizacionService.findAll();
  }

  @Get('/findOne/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN','INMOBILIARIA')
  async findOne(@Param('id') id: string) {
    return await this.tipoDeVisualizacionService.findOne(+id);
  }

  @Patch('/update/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() updateTipoDeVisualizacionDto: UpdateTipoDeVisualizacionDto) {
    return await this.tipoDeVisualizacionService.update(+id, updateTipoDeVisualizacionDto);
  }

  @Delete('/remove/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    return await this.tipoDeVisualizacionService.remove(+id);
  }
}
