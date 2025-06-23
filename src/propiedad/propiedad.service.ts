import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePropiedadDto } from './dto/create-propiedad.dto';
import { UpdatePropiedadDto } from './dto/update-propiedad.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Propiedad } from './entities/propiedad.entity';
import { In, Repository } from 'typeorm';
import { Localidad } from 'src/localidad/entities/localidad.entity';
import { TipoDePropiedad } from 'src/tipo-de-propiedad/entities/tipo-de-propiedad.entity';
import { EstiloArquitectonico } from 'src/estilo-arquitectonico/entities/estilo-arquitectonico.entity';
import { TipoDeVisualizacion } from 'src/tipo-de-visualizacion/entities/tipo-de-visualizacion.entity';

@Injectable()
export class PropiedadService {

constructor(
  @InjectRepository(Propiedad)
  private propiedadRepository: Repository<Propiedad>,

  @InjectRepository(Localidad)
  private localidadRepository: Repository<Localidad>,

  @InjectRepository(TipoDePropiedad)
  private tipoPropiedadRepository: Repository<TipoDePropiedad>,

  @InjectRepository(EstiloArquitectonico)
  private estiloArquitectonicoRepository: Repository<EstiloArquitectonico>,
  @InjectRepository(TipoDeVisualizacion)
  private tipoDeVisualizacionRepository: Repository<TipoDeVisualizacion>, // Agrega el repositorio
) {}


  async create(createPropiedadDto: CreatePropiedadDto): Promise<Propiedad> {
      const {
        direccion,
        localidad: localidadId,
        tipoPropiedad: tipoPropiedadId,
        estiloArquitectonico: estiloId,
        tipoVisualizaciones: tipoVisualizacionIds, // Nombre corregido
        nombre,
        descripcion,
        precio,
        superficie,
        cantidadBanios,
        cantidadDormitorios,
        cantidadAmbientes,
        tipoOperacion,
      } = createPropiedadDto;

      // Verifica si la dirección ya existe
      const propiedadExistente = await this.propiedadRepository.findOneBy({ direccion });
      if (propiedadExistente) {
        throw new ConflictException('La dirección ya existe');
      }

      // Busca los objetos relacionados
      const localidad = await this.localidadRepository.findOne({ where: { id: localidadId } });
      if (!localidad) throw new NotFoundException(`Localidad con id ${localidadId} no existe`);

      const tipoPropiedad = await this.tipoPropiedadRepository.findOne({ where: { id: tipoPropiedadId } });
      if (!tipoPropiedad) throw new NotFoundException(`Tipo de propiedad con id ${tipoPropiedadId} no existe`);

      const estiloArquitectonico = await this.estiloArquitectonicoRepository.findOne({ where: { id: estiloId } });
      if (!estiloArquitectonico) throw new NotFoundException(`Estilo arquitectónico con id ${estiloId} no existe`);

      // Busca los tipos de visualización
      const tipoVisualizaciones = await this.tipoDeVisualizacionRepository.findBy({
        id: In(tipoVisualizacionIds),
      });
      if (tipoVisualizaciones.length !== tipoVisualizacionIds.length) {
        throw new NotFoundException(`Uno o más tipos de visualización no existen`);
      }

      // Crea la entidad
      const propiedad = this.propiedadRepository.create({
        nombre,
        descripcion,
        direccion,
        localidad,
        precio,
        superficie,
        tipoPropiedad,
        tipoVisualizaciones, // Nombre corregido
        estiloArquitectonico,
        cantidadBanios,
        cantidadDormitorios,
        cantidadAmbientes,
        tipoOperacion,
      });

      // Guarda la propiedad
      return await this.propiedadRepository.save(propiedad);
    }


  async findAll(): Promise<Propiedad[]> {
    return await this.propiedadRepository.find()
  }

  async findOne(id: number): Promise<Propiedad> {
    const propiedad = await this.propiedadRepository.findOneBy({ id });
    if (!propiedad) {
      throw new NotFoundException(`La propiedad con el id ${id} no existe`);
    }
    return propiedad;
  }

  async update( id: number, updatePropiedadDto: UpdatePropiedadDto,): Promise<Propiedad> {
    
    // Buscar la propiedad existente por su ID
    const propiedadToUpdate = await this.propiedadRepository.findOne({where: { id },
    // Cargar las relaciones necesarias para evitar problemas de referencia
      relations: ['localidad', 'tipoPropiedad', 'estiloArquitectonico', 'tipoVisualizaciones'],
    });

    if (!propiedadToUpdate) {
      throw new NotFoundException(`Propiedad con ID ${id} no encontrada`);
    }

    // Verificar si la nueva dirección ya existe en otra propiedad
  
    if (updatePropiedadDto.direccion && updatePropiedadDto.direccion !== propiedadToUpdate.direccion) {
      const propiedadConMismaDireccion = await this.propiedadRepository.findOneBy({ direccion: updatePropiedadDto.direccion });
      //si existe una propiedad con la misma dirección y no es la misma propiedad que estamos actualizando, lanzamos un error de conflicto
      if (propiedadConMismaDireccion && propiedadConMismaDireccion.id !== id) {
        throw new ConflictException('La nueva dirección ya está registrada en otra propiedad');
      }
    }
    // Actualizar los campos de la propiedad
    Object.assign(propiedadToUpdate, updatePropiedadDto);

    // Actualizar los campos que son relaciones (foráneas)
    if (updatePropiedadDto.localidad !== undefined) {
      const localidad = await this.localidadRepository.findOne({ where: { id: updatePropiedadDto.localidad } });
      if (!localidad) {
        throw new NotFoundException(`Localidad con id ${updatePropiedadDto.localidad} no existe`);
      }
      propiedadToUpdate.localidad = localidad;
    }

    if (updatePropiedadDto.tipoPropiedad !== undefined) {
      const tipoPropiedad = await this.tipoPropiedadRepository.findOne({ where: { id: updatePropiedadDto.tipoPropiedad } });
      if (!tipoPropiedad) {
        throw new NotFoundException(`Tipo de propiedad con id ${updatePropiedadDto.tipoPropiedad} no existe`);
      }
      propiedadToUpdate.tipoPropiedad = tipoPropiedad;
    }

    if (updatePropiedadDto.estiloArquitectonico !== undefined) {
      const estiloArquitectonico = await this.estiloArquitectonicoRepository.findOne({ where: { id: updatePropiedadDto.estiloArquitectonico } });
      if (!estiloArquitectonico) {
        throw new NotFoundException(`Estilo arquitectónico con id ${updatePropiedadDto.estiloArquitectonico} no existe`);
      }
      propiedadToUpdate.estiloArquitectonico = estiloArquitectonico;
    }
    // Actualizar las relaciones de tipoVisualizaciones
    if (updatePropiedadDto.tipoVisualizaciones !== undefined) {
      if (updatePropiedadDto.tipoVisualizaciones === null || updatePropiedadDto.tipoVisualizaciones.length === 0) {
        propiedadToUpdate.tipoVisualizaciones = []; // Elimina todas las relaciones existentes
      } else {
        const tipoVisualizaciones = await this.tipoDeVisualizacionRepository.findBy({
          id: In(updatePropiedadDto.tipoVisualizaciones),
        });

        // Asegúrate de que todos los IDs proporcionados existan
        if (tipoVisualizaciones.length !== updatePropiedadDto.tipoVisualizaciones.length) {
          throw new NotFoundException(`Uno o más tipos de visualización proporcionados no existen.`);
        }
        propiedadToUpdate.tipoVisualizaciones = tipoVisualizaciones;
      }
    }

    // 5. Guardar los cambios en la base de datos
    return await this.propiedadRepository.save(propiedadToUpdate);
  }

  async remove(id: number):Promise<void> {
    const propiedad = await this.findOne(id);
    await this.propiedadRepository.remove(propiedad);
  }
}
