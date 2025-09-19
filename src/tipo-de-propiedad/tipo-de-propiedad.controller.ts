import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, ParseIntPipe, UseGuards } from '@nestjs/common';
import { TipoDePropiedadService } from './tipo-de-propiedad.service';
import { CreateTipoDePropiedadDto } from './dto/create-tipo-de-propiedad.dto';
import { UpdateTipoDePropiedadDto } from './dto/update-tipo-de-propiedad.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/guards/decoradores/roles.decorator';
import { TipoDePropiedad } from './entities/tipo-de-propiedad.entity';

@Controller('tipoDePropiedad')
export class TipoDePropiedadController {
  constructor(private readonly tipoDePropiedadService: TipoDePropiedadService) {}

  @Post('/create')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTipoDePropiedadDto: CreateTipoDePropiedadDto) : Promise<TipoDePropiedad> {
    return await this.tipoDePropiedadService.create(createTipoDePropiedadDto);
  }

  @Get('/findAll')
  @HttpCode(HttpStatus.OK)
  async findAll() : Promise<TipoDePropiedad[]> {
    return await this.tipoDePropiedadService.findAll();
  }

  @Get('/findOne/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN','INMOBILIARIA')
  async findOne(@Param('id', ParseIntPipe) id: number) : Promise<TipoDePropiedad> {
    return await this.tipoDePropiedadService.findOne(id);
  }

  @Patch('/update/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async update(@Param('id',ParseIntPipe) id: number, @Body() updateTipoDePropiedadDto: UpdateTipoDePropiedadDto): Promise<TipoDePropiedad> {
    return await this.tipoDePropiedadService.update(id, updateTipoDePropiedadDto);
  }

  @Delete('/remove/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.tipoDePropiedadService.remove(id);
  }
}
