import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Cliente } from './entities/cliente.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Localidad } from 'src/localidad/entities/localidad.entity';
import { Cuenta } from 'src/auth/entities/cuenta.entity';

@Injectable()
export class ClienteService {

  constructor(
      @InjectRepository(Cliente)
      private clienteRepository: Repository<Cliente>,
      @InjectRepository(Localidad)
      private localidadRepository: Repository<Localidad>,
      @InjectRepository(Cuenta)
      private cuentaRepository: Repository<Cuenta>,
    ) {}
  
    async create(createClienteDto: CreateClienteDto): Promise<Cliente> {
  // 1. Desestructurar el DTO para mayor claridad
  const { nombre, apellido, fechaNacimiento, direccion, localidad: localidadId, cuenta: cuentaId } = createClienteDto;

  // 2. Verificar si el cliente ya existe
  const clienteExistente = await this.clienteRepository.findOneBy({
    nombre,
    apellido,
    fechaNacimiento,
    direccion,
    localidad: { id: localidadId },
    cuenta: { id: cuentaId }, 
  });
  
  if (clienteExistente) {
    throw new NotFoundException('El cliente ya existe');
  }

  // Verificar que la localidad y la cuenta existan
  const localidad = await this.localidadRepository.findOneBy({ id: localidadId });
  if (!localidad) {
    throw new NotFoundException(`Localidad con id ${localidadId} no existe`);
  }

  const cuenta = await this.cuentaRepository.findOneBy({ id: cuentaId });
  if (!cuenta) {
    throw new NotFoundException(`Cuenta con id ${cuentaId} no existe`);
  }

  const cliente = this.clienteRepository.create({
    nombre,
    apellido,
    fechaNacimiento,
    direccion,
    localidad,
    cuenta, 
  });

  // 6. Guardar la entidad en la base de datos
  return await this.clienteRepository.save(cliente);
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
