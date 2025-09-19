import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, ParseIntPipe, UseGuards } from '@nestjs/common';
import { LocalidadService } from './localidad.service';
import { CreateLocalidadDto } from './dto/create-localidad.dto';
import { UpdateLocalidadDto } from './dto/update-localidad.dto';
import { Localidad } from './entities/localidad.entity';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/guards/decoradores/roles.decorator';

@Controller('localidad')
export class LocalidadController {
  constructor(private readonly localidadService: LocalidadService) {}

  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async create(@Body() createLocalidadDto: CreateLocalidadDto) : Promise<Localidad> {
    return await this.localidadService.create(createLocalidadDto);
  }

  @Get('/findAll')
  @HttpCode(HttpStatus.OK)
  async findAll() : Promise<Localidad[]> {
    return await this.localidadService.findAll();
  }

  @Get('/findOne/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN','INMOBILIARIA')
  async findOne(@Param('id',ParseIntPipe) id: number) : Promise<Localidad> {
    return await this.localidadService.findOne(id);
  }

  @Patch('/update/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateLocalidadDto: UpdateLocalidadDto) : Promise<Localidad> {
    return await this.localidadService.update(id, updateLocalidadDto);
  }

  @Delete('/remove/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id', ParseIntPipe) id: number) : Promise<void> {
    await this.localidadService.remove(id);
  }
}
