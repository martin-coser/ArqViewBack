import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ListaDeInteresService } from './lista-de-interes.service';
import { CreateListaDeIntereDto } from './dto/create-lista-de-intere.dto';
import { UpdateListaDeIntereDto } from './dto/update-lista-de-intere.dto';

@Controller('lista-de-interes')
export class ListaDeInteresController {
  constructor(private readonly listaDeInteresService: ListaDeInteresService) {}

  @Post()
  create(@Body() createListaDeIntereDto: CreateListaDeIntereDto) {
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
  update(@Param('id') id: string, @Body() updateListaDeIntereDto: UpdateListaDeIntereDto) {
    return this.listaDeInteresService.update(+id, updateListaDeIntereDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.listaDeInteresService.remove(+id);
  }
}
