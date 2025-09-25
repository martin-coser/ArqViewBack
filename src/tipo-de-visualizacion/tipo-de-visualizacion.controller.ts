import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { TipoDeVisualizacionService } from './tipo-de-visualizacion.service';
import { CreateTipoDeVisualizacionDto } from './dto/create-tipo-de-visualizacion.dto';
import { UpdateTipoDeVisualizacionDto } from './dto/update-tipo-de-visualizacion.dto';
import { Roles } from 'src/guards/decoradores/roles.decorator';
import { TipoDeVisualizacion } from './entities/tipo-de-visualizacion.entity';

@Controller('tipoDeVisualizacion')
export class TipoDeVisualizacionController {
  constructor(private readonly tipoDeVisualizacionService: TipoDeVisualizacionService) { }

  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN')
  async create(@Body() createTipoDeVisualizacionDto: CreateTipoDeVisualizacionDto): Promise<TipoDeVisualizacion> {
    return await this.tipoDeVisualizacionService.create(createTipoDeVisualizacionDto);
  }

  @Get('/findAll')
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<TipoDeVisualizacion[]> {
    return await this.tipoDeVisualizacionService.findAll();
  }

  @Get('/findOne/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'INMOBILIARIA')
  async findOne(@Param('id') id: string): Promise<TipoDeVisualizacion> {
    return await this.tipoDeVisualizacionService.findOne(+id);
  }

  @Patch('/update/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() updateTipoDeVisualizacionDto: UpdateTipoDeVisualizacionDto): Promise<TipoDeVisualizacion> {
    return await this.tipoDeVisualizacionService.update(+id, updateTipoDeVisualizacionDto);
  }

  @Delete('/remove/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN')
  async remove(@Param('id') id: string): Promise<void> {
    return await this.tipoDeVisualizacionService.remove(+id);
  }
}
