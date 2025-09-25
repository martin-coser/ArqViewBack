import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, Req, ParseIntPipe, UnauthorizedException } from '@nestjs/common';
import { ListaDeInteresService } from './lista-de-interes.service';
import { CreateListaDeInteresDto } from './dto/create-lista-de-intere.dto';
import { UpdateListaDeInteresDto } from './dto/update-lista-de-intere.dto';
import { Roles } from 'src/guards/decoradores/roles.decorator';
import { ListaDeInteres } from './entities/lista-de-interes.entity';


@Controller('listaDeInteres')
export class ListaDeInteresController {
  constructor(private readonly listaDeInteresService: ListaDeInteresService) { }

  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  @Roles('CLIENTE')
  async create(@Body() createListaDeInteresDto: CreateListaDeInteresDto, @Req() req): Promise<ListaDeInteres> {
    const cuentaId = req.user.id;
    if (!cuentaId) {
      throw new UnauthorizedException('No se pudo obtener el ID de la cuenta del token');
    }
    return await this.listaDeInteresService.create(createListaDeInteresDto, cuentaId);
  }

  // borrar
  @Get('/findAll')
  @HttpCode(HttpStatus.OK)
  @Roles('CLIENTE')
  async findAll(): Promise<ListaDeInteres[]> {
    return await this.listaDeInteresService.findAll();
  }

  // corregir
  @Get('/findOne/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('CLIENTE')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ListaDeInteres> {
    return await this.listaDeInteresService.findOne(id);
  }

  @Patch('/update/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('CLIENTE')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateListaDeIntereDto: UpdateListaDeInteresDto): Promise<ListaDeInteres> {
    return await this.listaDeInteresService.update(id, updateListaDeIntereDto);
  }

  @Delete('/remove/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('CLIENTE')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.listaDeInteresService.remove(id);
  }
}
