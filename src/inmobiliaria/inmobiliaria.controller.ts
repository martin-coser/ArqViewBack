import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, ParseIntPipe, UseGuards } from '@nestjs/common';
import { InmobiliariaService } from './inmobiliaria.service';
import { CreateInmobiliariaDto } from './dto/create-inmobiliaria.dto';
import { UpdateInmobiliariaDto } from './dto/update-inmobiliaria.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/guards/decoradores/roles.decorator';
import { Inmobiliaria } from './entities/inmobiliaria.entity';
import { RegisterCuentaDto } from 'src/auth/dto/register-cuenta.dto';

@Controller('inmobiliaria')
export class InmobiliariaController {
  constructor(private readonly inmobiliariaService: InmobiliariaService) {}

  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  async create( @Body('inmobiliaria') createInmobiliariaDto: CreateInmobiliariaDto, @Body('cuenta') registerCuentaDto: RegisterCuentaDto,): Promise<Inmobiliaria> {
    return await this.inmobiliariaService.create(createInmobiliariaDto, registerCuentaDto);
  }

  @Get('/findAll')
  @HttpCode(HttpStatus.OK)
  findAll() : Promise<Inmobiliaria[]> {
    return this.inmobiliariaService.findAll();
  }

  @Get('/findOne/:id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string): Promise<Inmobiliaria> {
    return this.inmobiliariaService.findOne(+id);
  }

  @Patch('/update/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('INMOBILIARIA')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateInmobiliariaDto: UpdateInmobiliariaDto) : Promise<Inmobiliaria> {
    return this.inmobiliariaService.update(id, updateInmobiliariaDto);
  }

  @Delete('/remove/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN','INMOBILIARIA')
  remove(@Param('id') id: string) : Promise<void> {
    return this.inmobiliariaService.remove(+id);
  }
}
