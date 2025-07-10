import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateListaDeInteresDto } from './dto/create-lista-de-intere.dto';
import { UpdateListaDeInteresDto } from './dto/update-lista-de-intere.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ListaDeInteres } from './entities/lista-de-interes.entity';
import { Repository, In } from 'typeorm';
import { Propiedad } from '../propiedad/entities/propiedad.entity';
import { Cliente } from '../cliente/entities/cliente.entity'; // Importa la entidad Cliente


@Injectable()
export class ListaDeInteresService {
  constructor(
        @InjectRepository(ListaDeInteres)
        private listaDeInteresRepository: Repository<ListaDeInteres>,
        @InjectRepository(Propiedad)
        private propiedadRepository: Repository<Propiedad>,
        @InjectRepository(Cliente)
        private clienteRepository: Repository<Cliente>,
      ) {}

  async create(createListaDeInteresDto: CreateListaDeInteresDto, clienteId: number) : Promise<ListaDeInteres> {
    const { nombre, propiedadIds } = createListaDeInteresDto;
    // Verifica si el cliente existe
    const cliente = await this.clienteRepository.findOne({ where: { id: clienteId } });
    if (!cliente) {
      throw new NotFoundException(`Cliente con id ${clienteId} no encontrado`);
    }
    // Crea una nueva lista de interés
    const listaDeInteres = this.listaDeInteresRepository.create({
      nombre: nombre || 'Mis Favoritas',
      cliente: cliente,
      propiedades: [],
    });
        const propiedades = await this.propiedadRepository.findBy({ id: In(propiedadIds ?? []) });
        if (propiedades.length !== (propiedadIds?.length ?? 0)) {
          throw new NotFoundException('Algunas propiedades no fueron encontradas');
        }
        listaDeInteres.propiedades = propiedades;
        return await this.listaDeInteresRepository.save(listaDeInteres);
    }


  async findAll() : Promise<ListaDeInteres[]> {
    const listasDeInteres = await this.listaDeInteresRepository.find({
      relations: ['cliente', 'propiedades'],
    });
    if (!listasDeInteres || listasDeInteres.length === 0) {
      throw new NotFoundException('No se encontraron listas de interés');
    }
    return listasDeInteres;
  }

  async findOne(id: number): Promise<ListaDeInteres> {
    const listaDeInteres = await this.listaDeInteresRepository.findOne({
      where: { id }, // Busca por el ID de la lista de interés
      relations: ['cliente', 'propiedades'], // Carga el cliente asociado y las propiedades de la lista
    });

    if (!listaDeInteres) {
      throw new NotFoundException(`Lista de interés con ID ${id} no encontrada.`);
    }

    return listaDeInteres;
  }
  

  async update(id: number, updateListaDeInteresDto: UpdateListaDeInteresDto, ClienteId?: number): Promise<ListaDeInteres> {

    const listaDeInteresToUpdate = await this.listaDeInteresRepository.findOne({
      where: { id },
      relations: ['cliente', 'propiedades'],
    });
    if (!listaDeInteresToUpdate) {
      throw new NotFoundException(`Lista de interés con ID ${id} no encontrada.`);
    }

    if (ClienteId && listaDeInteresToUpdate.cliente.id !== ClienteId) {
      throw new ForbiddenException('No tienes permiso para actualizar esta lista de interés.');
    }
    Object.assign(listaDeInteresToUpdate, updateListaDeInteresDto);

    // 4. Manejar la relación ManyToMany 'propiedades' explícitamente si se proporcionan nuevos IDs
    if (updateListaDeInteresDto.propiedadIds !== undefined) {
      // Buscar todas las propiedades con los IDs proporcionados
      const propiedades = await this.propiedadRepository.findBy({
        id: In(updateListaDeInteresDto.propiedadIds),
      });

      // Verificar que todas las propiedades con IDs proporcionados existan
      if (propiedades.length !== updateListaDeInteresDto.propiedadIds.length) {
        // Encontrar cuáles IDs no fueron encontrados para un mensaje más útil
        const foundIds = new Set(propiedades.map(p => p.id));
        const notFoundIds = updateListaDeInteresDto.propiedadIds.filter(id => !foundIds.has(id));
        throw new NotFoundException(`Algunas propiedades no fueron encontradas: ${notFoundIds.join(', ')}`);
      }

      // Reemplazar el array de propiedades existente con el nuevo conjunto.
      listaDeInteresToUpdate.propiedades = propiedades;
    }

    return await this.listaDeInteresRepository.save(listaDeInteresToUpdate);
  }


  async remove(id: number) : Promise<void> {
    const listaDeInteres = await this.listaDeInteresRepository.findOne({ where: { id } });
    if (!listaDeInteres) {
      throw new NotFoundException(`Lista de interés con ID ${id} no encontrada.`);
    }
    const result = await this.listaDeInteresRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`No se pudo eliminar la lista de interés con ID ${id}.`);
    }
  }
}
