import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { TipoDePropiedadService } from './tipo-de-propiedad.service';
import { CreateTipoDePropiedadDto } from './dto/create-tipo-de-propiedad.dto';
import { UpdateTipoDePropiedadDto } from './dto/update-tipo-de-propiedad.dto';

@Controller('tipoDePropiedad')
export class TipoDePropiedadController {
  constructor(private readonly tipoDePropiedadService: TipoDePropiedadService) {}

  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTipoDePropiedadDto: CreateTipoDePropiedadDto) {
    return await this.tipoDePropiedadService.create(createTipoDePropiedadDto);
  }

  @Get('/findAll')
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return await this.tipoDePropiedadService.findAll();
  }

  @Get('/findOne/:id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.tipoDePropiedadService.findOne(id);
  }

  @Patch('/update/:id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id',ParseIntPipe) id: number, @Body() updateTipoDePropiedadDto: UpdateTipoDePropiedadDto) {
    return await this.tipoDePropiedadService.update(id, updateTipoDePropiedadDto);
  }

  @Delete('/remove/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.tipoDePropiedadService.remove(id);
  }
}
