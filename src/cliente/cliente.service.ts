import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Cliente } from './entities/cliente.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    return await this.clienteRepository.manager.transaction(async (transactionalEntityManager) => {
      // 1. Crear la cuenta dentro de la transacción
      const cuenta = await this.authService.register(registerCuentaDto, transactionalEntityManager);
      createClienteDto.cuenta = cuenta.id; // Asignar el ID de la cuenta creada

      // 2. Desestructurar el DTO para mayor claridad
      const { nombre, apellido, fechaNacimiento, direccion, localidad: localidadId, cuenta: cuentaId } = createClienteDto;

      // 3. Verificar si el cliente ya existe (basado en campos clave)
      const clienteExistente = await transactionalEntityManager.findOne(Cliente, {
        where: {
          nombre,
          apellido,
          fechaNacimiento,
          direccion,
          localidad: { id: localidadId },
        },
      });
      if (clienteExistente) {
        throw new ConflictException('El cliente ya existe con los datos proporcionados');
      }

      // 4. Verificar que la localidad exista
      const localidad = await transactionalEntityManager.findOne(Localidad, { where: { id: localidadId } });
      if (!localidad) {
        throw new NotFoundException(`Localidad con id ${localidadId} no existe`);
      }

      // 5. Verificar que la cuenta exista (por consistencia, aunque ya la creamos)
      const cuentaExistente = await transactionalEntityManager.findOne(Cuenta, { where: { id: cuentaId } });
      if (!cuentaExistente) {
        throw new NotFoundException(`Cuenta con id ${cuentaId} no existe`);
      }

      // 6. Crear el nuevo cliente
      const cliente = transactionalEntityManager.create(Cliente, {
        nombre,
        apellido,
        fechaNacimiento,
        direccion,
        localidad,
        cuenta: cuentaExistente,
      });

      if (!cliente) {
        throw new NotFoundException('Error al crear el cliente');
      }

      // 7. Guardar y devolver el cliente
      return await transactionalEntityManager.save(cliente);
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
