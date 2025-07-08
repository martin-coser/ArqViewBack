import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ListaDeInteresService } from './lista-de-interes.service';
import { CreateListaDeInteresDto } from './dto/create-lista-de-intere.dto';
import { UpdateListaDeInteresDto } from './dto/update-lista-de-intere.dto';


@Controller('lista-de-interes')
export class ListaDeInteresController {
  constructor(private readonly listaDeInteresService: ListaDeInteresService) {}

  @Post()
  create(@Body() createListaDeIntereDto: CreateListaDeInteresDto) {
    return this.listaDeInteresService.create(createListaDeIntereDto);
  }

  @Get()
  findAll() {
    return this.listaDeInteresService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listaDeInteresService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateListaDeIntereDto: UpdateListaDeInteresDto) {
    return this.listaDeInteresService.update(+id, updateListaDeIntereDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.listaDeInteresService.remove(+id);
  }
}
