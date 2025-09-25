import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mensaje } from '../mensaje/entities/mensaje.entity'; 
import { Cliente } from '../cliente/entities/cliente.entity'; // Importar la entidad Cliente
import { Inmobiliaria } from '../inmobiliaria/entities/inmobiliaria.entity'; // Asegúrate de importar la entidad Inmobiliaria
import { UpdateCalificacionResenaDto } from './dto/update-calificacion-reseña.dto';
import { CalificacionResena } from './entities/calificacion-reseña.entity';
import { CreateCalificacionResenaDto } from './dto/create-calificacion-reseña.dto';

@Injectable()
export class CalificacionResenaService {
  constructor(
    @InjectRepository(CalificacionResena)
    private readonly calificacionResenaRepository: Repository<CalificacionResena>,
    @InjectRepository(Mensaje)
    private readonly mensajeRepository: Repository<Mensaje>,
    @InjectRepository(Cliente) // Inyectar el repositorio de Cliente
    private readonly clienteRepository: Repository<Cliente>,
    @InjectRepository(Inmobiliaria) // Inyectar el repositorio de Inmobiliaria
    private readonly inmobiliariaRepository: Repository<Inmobiliaria>,
  ) {}

  async create(createDto: CreateCalificacionResenaDto, cuentaId: number): Promise<CalificacionResena> {
    // 1. Buscar el cliente asociado a la cuenta
    const cliente = await this.clienteRepository.findOne({
      where: { cuenta: { id: cuentaId } },
      relations: ['cuenta'],
    });

    if (!cliente) {
      throw new NotFoundException(`No se encontró un cliente asociado a la cuenta con ID ${cuentaId}`);
    }

    // 2. Verificar la interacción de mensajes usando el ID del cliente encontrado
    const clienteEnvioMensaje = await this.mensajeRepository.findOne({
      where: {
        remitenteCliente: { id: cliente.id },
        receptorInmobiliaria: { id: createDto.inmobiliariaId },
      },
    });

    const inmobiliariaEnvioMensaje = await this.mensajeRepository.findOne({
      where: {
        remitenteInmobiliaria: { id: createDto.inmobiliariaId },
        receptorCliente: { id: cliente.id },
      },
    });

    if (!clienteEnvioMensaje || !inmobiliariaEnvioMensaje) {
      throw new BadRequestException('Para calificar, debe haber una interacción de mensajes con la inmobiliaria.');
    }

    // 3. Obtener la inmobiliaria para la relación
    const inmobiliaria = await this.inmobiliariaRepository.findOne({
        where: { id: createDto.inmobiliariaId },
    });

    if (!inmobiliaria) {
        throw new NotFoundException(`Inmobiliaria con ID ${createDto.inmobiliariaId} no encontrada.`);
    }

    // 4. Crear la reseña con los objetos de las entidades
    const nuevaReseña = this.calificacionResenaRepository.create({ 
      ...createDto, 
      cliente: cliente, 
      inmobiliaria: inmobiliaria
    });

    return this.calificacionResenaRepository.save(nuevaReseña);
  }

  async getPromedioInmobiliaria(inmobiliariaId: number): Promise<number> {
    const promedio = await this.calificacionResenaRepository
      .createQueryBuilder('calificacion')
      .where('calificacion.inmobiliariaId = :id', { id: inmobiliariaId })
      .select('AVG(calificacion.calificacion)', 'promedio')
      .getRawOne();

    if (!promedio.promedio) {
      return 0;
    }

    return parseFloat(promedio.promedio);
  }

  async findAll(): Promise<CalificacionResena[]> {
    const calificacionesYReseñas = await this.calificacionResenaRepository.find();
    // No lanzar una excepción si la lista está vacía, simplemente devolver una lista vacía
    if (!calificacionesYReseñas || calificacionesYReseñas.length === 0) {
      return []; 
    }
    return calificacionesYReseñas;
  }

  async update(id: number, updateDto: UpdateCalificacionResenaDto): Promise<CalificacionResena> {
    const calificacionYReseña = await this.calificacionResenaRepository.findOne({where: {id}});
    if (!calificacionYReseña) {
      throw new NotFoundException(`Calificación con ID ${id} no encontrada.`);
    }
    Object.assign(calificacionYReseña, updateDto);
    return this.calificacionResenaRepository.save(calificacionYReseña);
  }

  async remove(id: number): Promise<void> {
    const calificacionYReseña = await this.calificacionResenaRepository.findOneBy({ id });
    if (!calificacionYReseña) {
      throw new NotFoundException(`No se encontró la calificación o reseña con ID ${id}.`);
    }
    await this.calificacionResenaRepository.remove(calificacionYReseña);
  }
}