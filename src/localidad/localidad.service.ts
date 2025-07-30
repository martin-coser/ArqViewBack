import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateLocalidadDto } from './dto/create-localidad.dto';
import { UpdateLocalidadDto } from './dto/update-localidad.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Localidad } from './entities/localidad.entity';
import { Repository } from 'typeorm';
import { Provincia } from 'src/provincia/entities/provincia.entity';

@Injectable()
export class LocalidadService {

  constructor(
    @InjectRepository(Localidad)
    private localidadRepository: Repository<Localidad>,
    @InjectRepository(Provincia)
    private ProvinciaRepository: Repository<Provincia>,
  ) {}

  async create(createLocalidadDto: CreateLocalidadDto): Promise<Localidad> {
        const { nombre, codigoPostal, provincia: provinciaId} = createLocalidadDto;
        const localidadExistente = await this.localidadRepository.findOneBy({ nombre });
        if (localidadExistente) {
          throw new ConflictException('La localidad ya existe');
        } 
        // Verificar que la provincia exista

        const codigoPostalExistente = await this.localidadRepository.findOneBy({ codigoPostal });
        if (codigoPostalExistente) {
          throw new ConflictException('El código postal ya está en uso');
        }
        
        const provincia= await this.ProvinciaRepository.findOneBy({ id: provinciaId });
        if (!provincia) {
          throw new NotFoundException(`Provincia con id ${provinciaId} no existe`);
        }
        // Crear la entidad Localidad
        const localidad = this.localidadRepository.create(
          {
            nombre,
            codigoPostal,
            provincia
          }
        );
        return await this.localidadRepository.save(localidad);
  }

  async findAll() : Promise<Localidad[]> {
    const localidades = await this.localidadRepository.find();
    if (!localidades || localidades.length === 0) {
      throw new NotFoundException('No se encontraron localidades');
    } 
    return localidades;
  }

  async findOne(id: number) : Promise<Localidad> {
    const localidad = await this.localidadRepository.findOneBy({ id });
    if (!localidad){
      throw new NotFoundException(`La localidad con el id ${id} no existe`);
    }
    return localidad;
  }

  async update(id: number, updateLocalidadDto: UpdateLocalidadDto):Promise<Localidad> {
    const localidad = await this.findOne(id);
    if (!localidad) {
      throw new NotFoundException(`La localidad con el id ${id} no existe`);
    }
    
    // Actualizo los campos de la localidad.
    Object.assign(localidad, updateLocalidadDto);
    
    // Guardo los cambios en la BD.
    return await this.localidadRepository.save(localidad);
  }

  async remove(id: number) : Promise<void> {
    const localidad = await this.findOne(id);
    if (!localidad) {
      throw new NotFoundException(`La localidad con el id ${id} no existe`);
    }
    await this.localidadRepository.remove(localidad);
  }
}
