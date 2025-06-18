import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTipoDePropiedadDto } from './dto/create-tipo-de-propiedad.dto';
import { UpdateTipoDePropiedadDto } from './dto/update-tipo-de-propiedad.dto'; 
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoDePropiedad } from './entities/tipo-de-propiedad.entity';


@Injectable()
export class TipoDePropiedadService {

  constructor(
    @InjectRepository(TipoDePropiedad)
    private tipoDePropiedadRepository: Repository<TipoDePropiedad>,
  ) {}

  async create(createTipoDePropiedadDto: CreateTipoDePropiedadDto) : Promise<TipoDePropiedad> {
    // Verifico que no exista un tipo de propiedad con el mismo nombre antes de crear.
    const { nombre } = createTipoDePropiedadDto;
    const tipoDePropiedadExistente = await this.tipoDePropiedadRepository.findOneBy({ nombre });
    if (tipoDePropiedadExistente) {
      throw new NotFoundException('El tipo de propiedad ya existe');
    } 
    // Creo y guardo el tipo de propiedad en la BD.
    const tipoDePropiedad = this.tipoDePropiedadRepository.create(createTipoDePropiedadDto);
    return await this.tipoDePropiedadRepository.save(tipoDePropiedad);

  }

  async findAll() : Promise<TipoDePropiedad[]> {
    return await this.tipoDePropiedadRepository.find();
  }

  async findOne(id: number) : Promise<TipoDePropiedad> {
    const tipoDePropiedad = await this.tipoDePropiedadRepository.findOneBy({ id });
    if(!tipoDePropiedad){
      throw new NotFoundException(`El tipo de propiedad con el id ${id} no existe`);
    }
    return tipoDePropiedad;
  }

  async update(id: number, updateTipoDePropiedadDto: UpdateTipoDePropiedadDto) : Promise<TipoDePropiedad> {
    const tipoDePropiedad = await this.findOne(id);
    // Comprueba si el DTO incluye un nuevo nombre y si es diferente al nombre actual del tipo de propiedad.
    if (updateTipoDePropiedadDto.nombre && updateTipoDePropiedadDto.nombre !== tipoDePropiedad.nombre) {
      const tipoDePropiedadExistente = await this.tipoDePropiedadRepository.findOneBy({
        nombre: updateTipoDePropiedadDto.nombre,
      });
      if (tipoDePropiedadExistente) {
        throw new ConflictException('El nombre del tipo de propiedad ya existe');
      }
    }
    Object.assign(tipoDePropiedad, updateTipoDePropiedadDto);
    return this.tipoDePropiedadRepository.save(tipoDePropiedad);
    
  }

  async remove(id: number) : Promise<void> {
    const tipoDePropiedad = await this.findOne(id);
    if (!tipoDePropiedad){
      throw new NotFoundException(`El tipo de propiedad con el id ${id} no existe`);
    }
    await this.tipoDePropiedadRepository.remove(tipoDePropiedad);
  }
}
