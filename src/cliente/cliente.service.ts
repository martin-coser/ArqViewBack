import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Cliente } from './entities/cliente.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Localidad } from 'src/localidad/entities/localidad.entity';
import { Cuenta } from 'src/auth/entities/cuenta.entity';
import { AuthService } from 'src/auth/auth.service';
import { RegisterCuentaDto } from 'src/auth/dto/register-cuenta.dto';

@Injectable()
export class ClienteService {

  constructor(
      @InjectRepository(Cliente)
      private clienteRepository: Repository<Cliente>,
      @InjectRepository(Localidad)
      private localidadRepository: Repository<Localidad>,
      @InjectRepository(Cuenta)
      private cuentaRepository: Repository<Cuenta>,
      private readonly authService: AuthService,
    ) {}
  
  async create(createClienteDto: CreateClienteDto, registerCuentaDto: RegisterCuentaDto): Promise<Cliente> {
  return await this.clienteRepository.manager.transaction(async (transactionalEntityManager: EntityManager) => {
    // Crear la cuenta dentro de la transacción
    const cuenta = await this.authService.register(registerCuentaDto, transactionalEntityManager);

    // Asignar el ID de la cuenta creada, sobrescribiendo o estableciendo si no existe
    const localidad = await transactionalEntityManager.findOne(Localidad, {
      where: { id: createClienteDto.localidad },
    });
    
    if (!localidad) {
    //
      throw new NotFoundException(`La localidad con el Id ${createClienteDto.localidad} no existe.`);
    }
    // Crear y guardar la entidad Cliente
    const cliente = transactionalEntityManager.create(Cliente, {
      ...createClienteDto, 
      localidad: localidad, 
      cuenta: cuenta, 
    });
    
    //guarda el cliente
    const nuevoCliente = await transactionalEntityManager.save(cliente);

    if (!nuevoCliente) {
      throw new NotFoundException('Error al guardar el cliente en la bases de datos.');
    }

    return nuevoCliente;
  });
}


  async findAll() : Promise<Cliente[]> {
    const clientes = await this.clienteRepository.find({
      relations: ['cuenta'], // Cargar las relaciones
    })
    if (!clientes || clientes.length === 0) {
      throw new NotFoundException('No se encontraron clientes');
    }
    return clientes;
  }

  async findOne(id: number) : Promise<Cliente> {
    const cliente = await this.clienteRepository.findOneBy({ id });
    if (!cliente) {
      throw new NotFoundException(`El cliente con el id ${id} no existe`);
    }
    return cliente;
  }

  async update(id: number, updateClienteDto: UpdateClienteDto): Promise<Cliente> {
    const cliente = await this.findOne(id);
    if (!cliente) {
      throw new NotFoundException(`El cliente con el id ${id} no existe`);
    }
    
    // Actualizo los campos del cliente.
    Object.assign(cliente, updateClienteDto);
    
    return await this.clienteRepository.save(cliente);
  }

  async remove(id: number) : Promise<void> {
    const cliente = await this.findOne(id);
    if (!cliente) {
      throw new NotFoundException(`El cliente con el id ${id} no existe`);
    }
    await this.clienteRepository.remove(cliente);
  }
}
