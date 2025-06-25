import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { EstiloArquitectonicoService } from './estilo-arquitectonico.service';
import { CreateEstiloArquitectonicoDto } from './dto/create-estilo-arquitectonico.dto';
import { UpdateEstiloArquitectonicoDto } from './dto/update-estilo-arquitectonico.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/decoradores/roles.decorator';

@Controller('estiloArquitectonico')
export class EstiloArquitectonicoController {
  constructor(private readonly estiloArquitectonicoService: EstiloArquitectonicoService) {}

  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async create(@Body() createEstiloArquitectonicoDto: CreateEstiloArquitectonicoDto) {
    return await this.estiloArquitectonicoService.create(createEstiloArquitectonicoDto);
  }

  @Get('/findAll')
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return await this.estiloArquitectonicoService.findAll();
  }

  @Get('/findOne/:id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return await this.estiloArquitectonicoService.findOne(+id);
  }

  @Patch('/update/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() updateEstiloArquitectonicoDto: UpdateEstiloArquitectonicoDto) {
    return await this.estiloArquitectonicoService.update(+id, updateEstiloArquitectonicoDto);
  }

  @Delete('/remove/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    return await this.estiloArquitectonicoService.remove(+id);
  }
}
