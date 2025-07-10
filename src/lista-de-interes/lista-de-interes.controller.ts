import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { ListaDeInteresService } from './lista-de-interes.service';
import { CreateListaDeInteresDto } from './dto/create-lista-de-intere.dto';
import { UpdateListaDeInteresDto } from './dto/update-lista-de-intere.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/decoradores/roles.decorator';
import { ListaDeInteres } from './entities/lista-de-interes.entity';


@Controller('listaDeInteres')
export class ListaDeInteresController {
  constructor(private readonly listaDeInteresService: ListaDeInteresService) {}

  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENTE')
  async create(@Body() createListaDeIntereDto: CreateListaDeInteresDto, @Req() req) : Promise<ListaDeInteres> {
    const clienteId = req.user.id; // saco el id del cliente del token JWT
  return await this.listaDeInteresService.create(createListaDeIntereDto, clienteId);
  }

  @Get('/findAll')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)  
  @Roles('CLIENTE')
  async findAll() {
    return await this.listaDeInteresService.findAll();
  }

  @Get('/findOne/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard) 
  @Roles('CLIENTE')
  async findOne(@Param('id',ParseIntPipe) id: number) : Promise<ListaDeInteres> {
    return await this.listaDeInteresService.findOne(id);
  }

  @Patch('/update/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENTE')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateListaDeIntereDto: UpdateListaDeInteresDto) : Promise<ListaDeInteres> {
    return await this.listaDeInteresService.update(id, updateListaDeIntereDto);
  }

  @Delete('/remove/:id')
  @HttpCode(HttpStatus.NO_CONTENT)  
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENTE')
  remove(@Param('id', ParseIntPipe ) id: number) {
    return this.listaDeInteresService.remove(id);
  }
}
