import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ProvinciaService } from './provincia.service';
import { CreateProvinciaDto } from './dto/create-provincia.dto';
import { UpdateProvinciaDto } from './dto/update-provincia.dto';
import { Provincia } from './entities/provincia.entity';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/decoradores/roles.decorator';

@Controller('provincia')
export class ProvinciaController {
  constructor(private readonly provinciaService: ProvinciaService) {}

  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async create(@Body() createProvinciaDto: CreateProvinciaDto) : Promise<Provincia> {
    return await this.provinciaService.create(createProvinciaDto);
  }

  @Get('/findAll')
  @HttpCode(HttpStatus.OK)
  async findAll() : Promise<Provincia[]> {
    return await this.provinciaService.findAll();
  }

  @Get('/findOne/:id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) : Promise<Provincia> {
    return await this.provinciaService.findOne(id);
  }

  @Patch('/update/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateProvinciaDto: UpdateProvinciaDto) : Promise<Provincia> {
    return await this.provinciaService.update(id, updateProvinciaDto);
  }

  @Delete('/remove/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id') id: number) : Promise<void> {
    await this.provinciaService.remove(id);
  }
}
