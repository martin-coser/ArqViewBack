import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, ParseIntPipe, UseGuards } from '@nestjs/common';
import { PropiedadService } from './propiedad.service';
import { CreatePropiedadDto } from './dto/create-propiedad.dto';
import { UpdatePropiedadDto } from './dto/update-propiedad.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/decoradores/roles.decorator';

@Controller('propiedad')
export class PropiedadController {
  constructor(private readonly propiedadService: PropiedadService) {}

  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('INMOBILIARIA')
  async create(@Body() createPropiedadDto: CreatePropiedadDto) {
    return await this.propiedadService.create(createPropiedadDto);
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
  async findByInmobiliaria(@Param('id') id: string) {
    return await this.propiedadService.findByInmobiliaria(+id);
  }

  @Patch('/update/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('INMOBILIARIA')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updatePropiedadDto: UpdatePropiedadDto) {
    return await this.propiedadService.update(id, updatePropiedadDto);
  }

  @Delete('/remove/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('INMOBILIARIA')
  remove(@Param('id') id: string) {
    return this.propiedadService.remove(+id);
  }
}
