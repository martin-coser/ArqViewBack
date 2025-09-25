import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { ClienteService } from './cliente.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Cliente } from './entities/cliente.entity';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/guards/decoradores/roles.decorator';
import { RegisterCuentaDto } from 'src/auth/dto/register-cuenta.dto';

@Controller('cliente')
export class ClienteController {
  constructor(private readonly clienteService: ClienteService) {}
  
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body('cliente') createClienteDto: CreateClienteDto, @Body('cuenta') registerCuentaDto: RegisterCuentaDto,): Promise<Cliente> {
    return await this.clienteService.create(createClienteDto, registerCuentaDto);
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
  @Roles('CLIENTE')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateClienteDto: UpdateClienteDto) : Promise<Cliente> {
    return this.clienteService.update(id, updateClienteDto);
  }
  
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('/remove/:id')
  @Roles('ADMIN','CLIENTE')
  remove(@Param('id', ParseIntPipe) id: number) : Promise<void> {
    return this.clienteService.remove(id);
  }
}
