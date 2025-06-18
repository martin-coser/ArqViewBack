import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { TipoDeVisualizacionService } from './tipo-de-visualizacion.service';
import { CreateTipoDeVisualizacionDto } from './dto/create-tipo-de-visualizacion.dto';
import { UpdateTipoDeVisualizacionDto } from './dto/update-tipo-de-visualizacion.dto';

@Controller('tipoDeVisualizacion')
export class TipoDeVisualizacionController {
  constructor(private readonly tipoDeVisualizacionService: TipoDeVisualizacionService) {}

  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTipoDeVisualizacionDto: CreateTipoDeVisualizacionDto) {
    return await this.tipoDeVisualizacionService.create(createTipoDeVisualizacionDto);
  }

  @Get('/findAll')
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return await this.tipoDeVisualizacionService.findAll();
  }

  @Get('/findOne/:id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return await this.tipoDeVisualizacionService.findOne(+id);
  }

  @Patch('/update/:id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() updateTipoDeVisualizacionDto: UpdateTipoDeVisualizacionDto) {
    return await this.tipoDeVisualizacionService.update(+id, updateTipoDeVisualizacionDto);
  }

  @Delete('/remove/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return await this.tipoDeVisualizacionService.remove(+id);
  }
}
