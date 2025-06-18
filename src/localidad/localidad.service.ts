import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLocalidadDto } from './dto/create-localidad.dto';
import { UpdateLocalidadDto } from './dto/update-localidad.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Localidad } from './entities/localidad.entity';
import { Repository } from 'typeorm';

@Injectable()
export class LocalidadService {

  constructor(
    @InjectRepository(Localidad)
    private localidadRepository: Repository<Localidad>,
  ) {}


  async create(createLocalidadDto: CreateLocalidadDto): Promise<Localidad> {
    // Verifico que no exista un tipo de propiedad con el mismo nombre antes de crear.
        const { nombre } = createLocalidadDto;
        const localidadExistente = await this.localidadRepository.findOneBy({ nombre });
        if (localidadExistente) {
          throw new NotFoundException('La localidad ya existe');
        } 
        // Creo y guardo el tipo de propiedad en la BD.
        const localidad = this.localidadRepository.create(createLocalidadDto);
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
