import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePropiedadDto } from './dto/create-propiedad.dto';
import { UpdatePropiedadDto } from './dto/update-propiedad.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Propiedad } from './entities/propiedad.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PropiedadService {

  constructor(
    @InjectRepository(Propiedad)
    private propiedadRepository: Repository<Propiedad>,
  ){}

  async create(createPropiedadDto: CreatePropiedadDto): Promise<Propiedad> {

    //Verifico que no exista una direccion antes de crear la propiedad.
    const { direccion } = createPropiedadDto
    const propiedadExistente = await this.propiedadRepository.findOneBy({ direccion })
    if (propiedadExistente){
      throw new ConflictException('La direccion ya existe')
    }

    //Creo y guardo la propiedad en la BD.
    const propiedad = this.propiedadRepository.create(createPropiedadDto)
    return await this.propiedadRepository.save(propiedad)
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
