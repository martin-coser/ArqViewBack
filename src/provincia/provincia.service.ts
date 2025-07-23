import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProvinciaDto } from './dto/create-provincia.dto';
import { UpdateProvinciaDto } from './dto/update-provincia.dto';
import { In, Repository } from 'typeorm';
import { Provincia } from './entities/provincia.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ProvinciaService {

  constructor(
      @InjectRepository(Provincia)
      private provinciaRepository: Repository<Provincia>,
    ) {}

  async create(createProvinciaDto: CreateProvinciaDto) : Promise<Provincia> {
    const { nombre } = createProvinciaDto;
    // Verifico que no exista una provincia con el mismo nombre antes de crear. 
    const provinciaExistente = await this.provinciaRepository.findOneBy({ nombre });
    if (provinciaExistente) {
      throw new NotFoundException('La provincia ya existe');
    }
    const provincia = this.provinciaRepository.create(createProvinciaDto);
    return await this.provinciaRepository.save(provincia);
  }

  async findAll(): Promise<Provincia[]> {
  const provincias = await this.provinciaRepository.find();
  if (!provincias || provincias.length === 0) {
    throw new NotFoundException('No se encontraron provincias');
  }
  return provincias;
  }

  async findOne(id: number) : Promise<Provincia> {
    const provincia =await this.provinciaRepository.findOneBy({ id });
    if(!provincia){
      throw new NotFoundException(`No se encontró la provincia con id ${id}`);
    }
    return provincia;
  }

  async update(id: number, updateProvinciaDto: UpdateProvinciaDto) : Promise<Provincia> {
    const provincia =await this.findOne(id);
    if (!provincia) {
      throw new NotFoundException(`No se encontró la provincia con id ${id}`);
    }
    // Actualizo los campos de la provincia
    Object.assign(provincia, updateProvinciaDto);
    return await this.provinciaRepository.save(provincia);
    
  }

  async remove(id: number) : Promise<void> {
  const provincia = await this.findOne(id);
    if (!provincia) {
      throw new NotFoundException(`No se encontró la provincia con id ${id}`);
    }
    // Elimino la provincia de la BD.
    await this.provinciaRepository.delete(id);
  }
}
