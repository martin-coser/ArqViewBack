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
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';
import { Imagen2dService } from 'src/imagen2d/imagen2d.service';

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
    private tipoDeVisualizacionRepository: Repository<TipoDeVisualizacion>,

    @InjectRepository(Inmobiliaria)
    private inmobiliariaRepository: Repository<Inmobiliaria>,

    private eventEmitter: EventEmitter2,

    private imagen2dService: Imagen2dService,
  ) {}


  async create(createPropiedadDto: CreatePropiedadDto): Promise<Propiedad> {
      const {
        direccion,
        localidad: localidadId,
        tipoPropiedad: tipoPropiedadId,
        estiloArquitectonico: estiloId,
        tipoVisualizaciones: tipoVisualizacionIds, 
        nombre,
        descripcion,
        precio,
        superficie,
        cantidadBanios,
        cantidadDormitorios,
        cantidadAmbientes,
        tipoOperacion,
        latitud,
        longitud,
        inmobiliaria_id, // foranea, id de la inmobiliaria que publica la propiedad
      } = createPropiedadDto;

      // Verifica si la dirección ya existe
      const propiedadExistente = await this.propiedadRepository.findOneBy({ direccion, localidad: { id: localidadId }  });
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
        latitud,
        longitud,
        inmobiliaria: { id: inmobiliaria_id }, // Asigna la inmobiliaria por su ID
      });

      // Guarda la propiedad
      const savedPropiedad = await this.propiedadRepository.save(propiedad);

      // Después de guardar, espera 10 segundos y analiza las imágenes asociadas
      setTimeout(async () => {
        try {
          const imagenes = await this.imagen2dService.findByPropiedad(savedPropiedad.id);
          for (const imagen of imagenes) {
            await this.imagen2dService.analyzeImage(imagen.id);
          }
        } catch (error) {
          console.error(`Error al analizar imágenes para propiedad ${savedPropiedad.id}:`, error);
          // Aquí podrías emitir un evento o loguear para monitoreo
        }
      }, 10000);

      return savedPropiedad;
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

  async findByInmobiliaria(id: number): Promise<Propiedad[]> {
    const propiedades = await this.propiedadRepository.find({
      where: { inmobiliaria: { id } },
    });
    if (!propiedades || propiedades.length === 0) {
      throw new NotFoundException(`No se encontraron propiedades para la inmobiliaria con id ${id}`);
    }
    return propiedades;
  }

  async update(id: number, updatePropiedadDto: UpdatePropiedadDto): Promise<Propiedad> {
    const oldPropiedad = await this.propiedadRepository.findOne({
      where: { id },
    });

    if (!oldPropiedad) {
      throw new NotFoundException(`Propiedad con ID ${id} no encontrada`);
    }

    const cambios: string[] = [];
    const oldNombre: string = oldPropiedad.nombre; // Guardamos el nombre antiguo

    // Nombre
    if (updatePropiedadDto.nombre !== undefined && updatePropiedadDto.nombre !== oldPropiedad.nombre) {
      cambios.push(`El nombre cambió de "${oldPropiedad.nombre}" a "${updatePropiedadDto.nombre}".`);
     
    }

    // Descripción
    if (updatePropiedadDto.descripcion !== undefined && updatePropiedadDto.descripcion !== oldPropiedad.descripcion) {
      cambios.push(`La descripción fue actualizada.`);
    }

    // Precio
    if (updatePropiedadDto.precio !== undefined && updatePropiedadDto.precio !== oldPropiedad.precio) {
      cambios.push(`El precio cambió de $${oldPropiedad.precio} a $${updatePropiedadDto.precio}.`);
    }

    // Tipo de Operación
    if (updatePropiedadDto.tipoOperacion !== undefined && updatePropiedadDto.tipoOperacion !== oldPropiedad.tipoOperacion) {
      cambios.push(`El tipo de operación cambió de "${oldPropiedad.tipoOperacion}" a "${updatePropiedadDto.tipoOperacion}".`);
    }

    // Manejo de la dirección si se actualiza (único campo con validación de conflicto)
    if (updatePropiedadDto.direccion !== undefined && updatePropiedadDto.direccion !== oldPropiedad.direccion) {
      const propiedadConMismaDireccion = await this.propiedadRepository.findOneBy({ direccion: updatePropiedadDto.direccion });
      if (propiedadConMismaDireccion && propiedadConMismaDireccion.id !== id) {
        throw new ConflictException('La nueva dirección ya está registrada en otra propiedad');
      }
    }

    // Actualizar los campos de la propiedad (incluyendo el nombre si cambió)
    Object.assign(oldPropiedad, updatePropiedadDto);

    // Actualizar las relaciones ManyToOne y ManyToMany (sin generar mensajes de cambio para el email)
    if (updatePropiedadDto.localidad !== undefined) {
      const localidad = await this.localidadRepository.findOne({ where: { id: updatePropiedadDto.localidad } });
      if (!localidad) throw new NotFoundException(`Localidad con id ${updatePropiedadDto.localidad} no existe`);
      oldPropiedad.localidad = localidad;
    }

    if (updatePropiedadDto.tipoPropiedad !== undefined) {
      const tipoPropiedad = await this.tipoPropiedadRepository.findOne({ where: { id: updatePropiedadDto.tipoPropiedad } });
      if (!tipoPropiedad) throw new NotFoundException(`Tipo de propiedad con id ${updatePropiedadDto.tipoPropiedad} no existe`);
      oldPropiedad.tipoPropiedad = tipoPropiedad;
    }

    if (updatePropiedadDto.estiloArquitectonico !== undefined) {
      const estiloArquitectonico = await this.estiloArquitectonicoRepository.findOne({ where: { id: updatePropiedadDto.estiloArquitectonico } });
      if (!estiloArquitectonico) throw new NotFoundException(`Estilo arquitectónico con id ${updatePropiedadDto.estiloArquitectonico} no existe`);
      oldPropiedad.estiloArquitectonico = estiloArquitectonico;
    }

    if (updatePropiedadDto.tipoVisualizaciones !== undefined) {
      if (updatePropiedadDto.tipoVisualizaciones === null || updatePropiedadDto.tipoVisualizaciones.length === 0) {
        oldPropiedad.tipoVisualizaciones = [];
      } else {
        const tipoVisualizaciones = await this.tipoDeVisualizacionRepository.findBy({ id: In(updatePropiedadDto.tipoVisualizaciones) });
        if (tipoVisualizaciones.length !== updatePropiedadDto.tipoVisualizaciones.length) {
          throw new NotFoundException(`Uno o más tipos de visualización proporcionados no existen`);
        }
        oldPropiedad.tipoVisualizaciones = tipoVisualizaciones;
      }
    }

    if ((updatePropiedadDto as any).inmobiliaria_id !== undefined) {
        const inmobiliaria = await this.inmobiliariaRepository.findOne({ where: { id: (updatePropiedadDto as any).inmobiliaria_id } });
        if (!inmobiliaria) throw new NotFoundException(`Inmobiliaria con id ${(updatePropiedadDto as any).inmobiliaria_id} no existe`);
        oldPropiedad.inmobiliaria = inmobiliaria;
    }

    const updatedPropiedad = await this.propiedadRepository.save(oldPropiedad);

    // Emitir evento si hubo cambios relevantes para la notificación
    if (cambios.length > 0) {
      this.eventEmitter.emit('propiedad.actualizada', {
        propiedadId: id,
        cambios: cambios.join('<br>'), // Unir los cambios con saltos de línea para HTML
        oldNombre: oldNombre, // Enviamos el nombre antiguo
        newNombre: updatedPropiedad.nombre // Enviamos el nuevo nombre
      });
    }

    return updatedPropiedad;
  }

  async remove(id: number):Promise<void> {
    const propiedad = await this.findOne(id);
    await this.propiedadRepository.remove(propiedad);
  }

  async buscarParaChatbot(criterios: any): Promise<Propiedad[]> {
    const query = this.propiedadRepository.createQueryBuilder('propiedad')
      .leftJoinAndSelect('propiedad.localidad', 'localidad')
      .leftJoinAndSelect('propiedad.tipoPropiedad', 'tipoPropiedad')
      .leftJoinAndSelect('propiedad.estiloArquitectonico', 'estiloArquitectonico');

    if (criterios.localidad) {
      query.andWhere('LOWER(localidad.nombre) LIKE :localidad', { localidad: `%${criterios.localidad.toLowerCase()}%` });
    }

    if (criterios.tipoPropiedad) {
      query.andWhere('LOWER(tipoPropiedad.nombre) LIKE :tipo', { tipo: `%${criterios.tipoPropiedad.toLowerCase()}%` });
    }
    
    if (criterios.tipoOperacion) {
        query.andWhere('propiedad.tipoOperacion = :tipoOperacion', { tipoOperacion: criterios.tipoOperacion });
    }

    if (criterios.cantidadDormitorios) {
      query.andWhere('propiedad.cantidadDormitorios >= :dormitorios', { dormitorios: criterios.cantidadDormitorios });
    }

    if (criterios.cantidadBanios) {
        query.andWhere('propiedad.cantidadBanios >= :banios', { banios: criterios.cantidadBanios });
    }

    if (criterios.precioMin) {
      query.andWhere('propiedad.precio >= :precioMin', { precioMin: criterios.precioMin });
    }

    if (criterios.precioMax) {
      query.andWhere('propiedad.precio <= :precioMax', { precioMax: criterios.precioMax });
    }
    
    if (criterios.estiloArquitectonico) {
        query.andWhere('LOWER(estiloArquitectonico.nombre) LIKE :estilo', { estilo: `%${criterios.estiloArquitectonico.toLowerCase()}%` });
    }

    // La parte clave: búsqueda por tags visuales y de descripción
    if (criterios.tags && criterios.tags.length > 0) {
      // Necesitamos unir con las imágenes 2D que contienen los tags
      query.innerJoin('imagen2d', 'imagen', 'imagen.propiedad_id = propiedad.id');
      
      criterios.tags.forEach((tag, index) => {
        // Busca tanto en los tags de la imagen como en la descripción de la propiedad
        const tagQuery = `(LOWER(imagen.tags_visuales) LIKE :tag_${index} OR LOWER(propiedad.descripcion) LIKE :tag_${index})`;
        query.andWhere(tagQuery, { [`tag_${index}`]: `%${tag.toLowerCase()}%` });
      });
    }

    // Para evitar duplicados si una propiedad tiene múltiples imágenes que coinciden
    query.distinct(true); 

    const propiedades = await query.getMany();

    if (!propiedades || propiedades.length === 0) {
      throw new NotFoundException('No se encontraron propiedades que coincidan con los criterios.');
    }

    return propiedades;
  }

}