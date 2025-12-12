import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, ParseIntPipe, Req, Ip } from '@nestjs/common';
import { InmobiliariaService } from './inmobiliaria.service';
import { CreateInmobiliariaDto } from './dto/create-inmobiliaria.dto';
import { UpdateInmobiliariaDto } from './dto/update-inmobiliaria.dto';
import { Roles } from 'src/guards/decoradores/roles.decorator';
import { Inmobiliaria } from './entities/inmobiliaria.entity';
import { RegisterCuentaDto } from 'src/auth/dto/register-cuenta.dto';

@Controller('inmobiliaria')
export class InmobiliariaController {
  constructor(private readonly inmobiliariaService: InmobiliariaService) { }

  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body('inmobiliaria') createInmobiliariaDto: CreateInmobiliariaDto, @Body('cuenta') registerCuentaDto: RegisterCuentaDto): Promise<Inmobiliaria> {
    return await this.inmobiliariaService.create(createInmobiliariaDto, registerCuentaDto);
  }

  @Post('/create/v2')
  @HttpCode(HttpStatus.CREATED)
  async createV2(@Body('inmobiliaria') createInmobiliariaDto: CreateInmobiliariaDto, @Body('cuenta') registerCuentaDto: RegisterCuentaDto, @Ip() clienteIp: string): Promise<Inmobiliaria> {
    // Llama al método createAfterV2 del servicio Inmobiliaria
    return await this.inmobiliariaService.createAfterV2(createInmobiliariaDto, registerCuentaDto, clienteIp);
  }

  @Get('/findAll')
  @HttpCode(HttpStatus.OK)
  findAll(): Promise<Inmobiliaria[]> {
    return this.inmobiliariaService.findAll();
  }

  @Get('/findOne/:id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string): Promise<Inmobiliaria> {
    return this.inmobiliariaService.findOne(+id);
  }

  @Get('/findByCuenta')
  @HttpCode(HttpStatus.OK)
  @Roles('INMOBILIARIA')
  async findByCuenta(@Req() req): Promise<Inmobiliaria> {
    const cuentaId = req.user.id;
    return await this.inmobiliariaService.findByCuenta(cuentaId);
  }

  @Patch('/update/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('INMOBILIARIA')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateInmobiliariaDto: UpdateInmobiliariaDto): Promise<Inmobiliaria> {
    return this.inmobiliariaService.update(id, updateInmobiliariaDto);
  }

  @Delete('/remove/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN', 'INMOBILIARIA')
  remove(@Param('id') id: string): Promise<void> {
    return this.inmobiliariaService.remove(+id);
  }
}