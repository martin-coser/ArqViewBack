import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, ParseIntPipe, Query } from '@nestjs/common';
import { PropiedadService } from './propiedad.service';
import { CreatePropiedadDto } from './dto/create-propiedad.dto';
import { UpdatePropiedadDto } from './dto/update-propiedad.dto';
import { Roles } from 'src/guards/decoradores/roles.decorator';
import { RecomendacionService } from 'src/recomendacion/recomendacion.service';

@Controller('propiedad')
export class PropiedadController {
  constructor(
    private readonly propiedadService: PropiedadService,
    private readonly recomendacionService: RecomendacionService,
  ) { }

  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  @Roles('INMOBILIARIA')
  async create(@Body() createPropiedadDto: CreatePropiedadDto) {
    const propiedad = await this.propiedadService.create(createPropiedadDto);
    await this.recomendacionService.notificarNuevaPropiedad(propiedad.id);
    return propiedad;
  }

  @Get('/findAll')
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return await this.propiedadService.findAll();
  }

  @Get('/findOne/:id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return await this.propiedadService.findOne(+id);
  }

  @Get('/findByInmobiliaria/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('INMOBILIARIA')
  async findByInmobiliaria(@Param('id') id: string) {
    return await this.propiedadService.findByInmobiliaria(+id);
  }

  @Patch('/update/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('INMOBILIARIA')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updatePropiedadDto: UpdatePropiedadDto) {
    return await this.propiedadService.update(id, updatePropiedadDto);
  }

  @Delete('/remove/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('INMOBILIARIA')
  async remove(@Param('id') id: string) {
    return await this.propiedadService.remove(+id);
  }

  @Post('/search-chatbot')
  @HttpCode(HttpStatus.OK)
  async searchForChatbot(@Body() searchCriteria: any) {
    return await this.propiedadService.buscarParaChatbot(searchCriteria);
  }
}
