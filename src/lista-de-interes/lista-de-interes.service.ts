import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListaDeInteres } from './entities/lista-de-interes.entity';
import { Cliente } from '../cliente/entities/cliente.entity';
import { Propiedad } from '../propiedad/entities/propiedad.entity';
import { CreateListaDeInteresDto } from './dto/create-lista-de-intere.dto';
import { UpdateListaDeInteresDto } from './dto/update-lista-de-intere.dto';


@Injectable()
export class ListaDeInteresService {
  constructor(
    @InjectRepository(ListaDeInteres)
    private listaDeInteresRepository: Repository<ListaDeInteres>,
    @InjectRepository(Cliente)
    private clienteRepository: Repository<Cliente>,
    @InjectRepository(Propiedad)
    private propiedadRepository: Repository<Propiedad>,
  ) {}

  async create(createListaDeInteresDto: CreateListaDeInteresDto, cuentaId: number): Promise<ListaDeInteres> {
  // Buscar el cliente asociado a la cuenta
  const cliente = await this.clienteRepository.findOne({
    where: { cuenta: { id: cuentaId } },
    relations: ['cuenta', 'listaDeInteres'],
  });

  if (!cliente) {
    throw new NotFoundException(`No se encontró un cliente asociado a la cuenta con ID ${cuentaId}`);
  }

  if (!cliente.cuenta) {
    throw new BadRequestException(`El cliente no tiene una cuenta asociada`);
  }

  // Verificar si el cliente ya tiene una lista de interés
  if (cliente.listaDeInteres) {
    throw new BadRequestException(`El cliente con ID ${cliente.id} ya tiene una lista de interés`);
  }

  // Crear la lista de interés
  const listaDeInteres = this.listaDeInteresRepository.create({
    cliente,
    propiedades: [],
  });

  if (createListaDeInteresDto.propiedadIds && createListaDeInteresDto.propiedadIds.length > 0) {
    const propiedades = await this.propiedadRepository.find({
      where: createListaDeInteresDto.propiedadIds.map(id => ({ id })),
    });
    if (propiedades.length !== createListaDeInteresDto.propiedadIds.length) {
      throw new NotFoundException('Una o más propiedades no encontradas');
    }
    listaDeInteres.propiedades = propiedades;
  }

  // Guardar la lista de interés
  const savedLista = await this.listaDeInteresRepository.save(listaDeInteres);

  // Actualizar el cliente para reflejar la relación inversa
  cliente.listaDeInteres = savedLista;
  await this.clienteRepository.save(cliente);

  // Recargar la lista con todas las relaciones para la respuesta
  const listaConRelaciones = await this.listaDeInteresRepository.findOne({
    where: { id: savedLista.id },
    relations: ['cliente', 'cliente.cuenta', 'cliente.localidad', 'propiedades'],
  });

  if (!listaConRelaciones) {
    throw new NotFoundException(`Lista de interés con ID ${savedLista.id} no encontrada después de guardar.`);
  }

  return listaConRelaciones;
}

  async findByClient(cuentaId: number): Promise<ListaDeInteres> {
    const cliente = await this.clienteRepository.findOne({
      where: { cuenta: { id: cuentaId } },
      relations: ['listaDeInteres'],
    });

    if (!cliente || !cliente.listaDeInteres) {
      throw new NotFoundException(`Lista de interés no encontrada para la cuenta con ID ${cuentaId}`);
    }

    const lista = await this.listaDeInteresRepository.findOne({
      where: { id: cliente.listaDeInteres.id },
      relations: ['cliente', 'propiedades'],
    });

    if (!lista) {
      throw new NotFoundException(`Lista de interés no encontrada para la cuenta con ID ${cuentaId}`);
    }

    return lista;
  }

  async findAll(): Promise<ListaDeInteres[]> {
    return await this.listaDeInteresRepository.find({
      relations: ['cliente', 'propiedades'],
    });
  }

  async findOne(id: number): Promise<ListaDeInteres> {
    const lista = await this.listaDeInteresRepository.findOne({
      where: { id },
      relations: ['cliente', 'propiedades'],
    });

    if (!lista) {
      throw new NotFoundException(`Lista de interés con ID ${id} no encontrada`);
    }

    return lista;
  }

  async update(id: number, updateListaDeInteresDto: UpdateListaDeInteresDto): Promise<ListaDeInteres> {
    const lista = await this.findOne(id);

    // Actualizar propiedades si se proporcionan
    if (updateListaDeInteresDto.propiedadIds) {
      const propiedades = await this.propiedadRepository.find({
        where: updateListaDeInteresDto.propiedadIds.map(id => ({ id })),
      });
      if (propiedades.length !== updateListaDeInteresDto.propiedadIds.length) {
        throw new NotFoundException('Una o más propiedades no encontr “‘Una o más propiedades no encontradas’');
      }
      lista.propiedades = propiedades;
    }

    return await this.listaDeInteresRepository.save(lista);
  }

  async remove(id: number): Promise<void> {
    const lista = await this.findOne(id);
    await this.listaDeInteresRepository.remove(lista);
  }
}