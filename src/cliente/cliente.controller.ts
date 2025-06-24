import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { ClienteService } from './cliente.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Cliente } from './entities/cliente.entity';

@Controller('cliente')
export class ClienteController {
  constructor(private readonly clienteService: ClienteService) {}
  
  @HttpCode(HttpStatus.CREATED)
  @Post('/create')
  async create(@Body() createClienteDto: CreateClienteDto) : Promise<Cliente> {
    return await this.clienteService.create(createClienteDto);
  }
  
  @HttpCode(HttpStatus.OK)
  @Get('/findAll')
  async findAll() : Promise<Cliente[]> {
    return await this.clienteService.findAll();
  }

  @HttpCode(HttpStatus.OK)
  @Get('/findOne/:id')
  findOne(@Param('id', ParseIntPipe) id: number) : Promise<Cliente> {
    return this.clienteService.findOne(id);
  }

  @HttpCode(HttpStatus.OK)
  @Patch('/update/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateClienteDto: UpdateClienteDto) : Promise<Cliente> {
    return this.clienteService.update(id, updateClienteDto);
  }
  
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('/remove/:id')
  remove(@Param('id', ParseIntPipe) id: number) : Promise<void> {
    return this.clienteService.remove(id);
  }
}
