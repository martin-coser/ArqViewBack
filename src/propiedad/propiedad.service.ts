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

  async update(id: number, updatePropiedadDto: UpdatePropiedadDto): Promise<Propiedad> {

    //Validacion de Direccion
    const propiedad = await this.findOne(id);

    //Comprueba si el DTO incluye una nueva direccion y si es diferente a la direccion actual de la propiedad.
    if (updatePropiedadDto.direccion && updatePropiedadDto.direccion !== propiedad.direccion) {
      const propiedadExistente = await this.propiedadRepository.findOneBy({
        direccion: updatePropiedadDto.direccion,
      });
      if (propiedadExistente) {
        throw new ConflictException('La direccion ya existe');
      }
    }
    Object.assign(propiedad, updatePropiedadDto);
    return this.propiedadRepository.save(propiedad);
  }

  async remove(id: number):Promise<void> {
    const propiedad = await this.findOne(id);
    await this.propiedadRepository.remove(propiedad);
  }
}
