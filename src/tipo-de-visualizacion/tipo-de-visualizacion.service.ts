import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTipoDeVisualizacionDto } from './dto/create-tipo-de-visualizacion.dto';
import { UpdateTipoDeVisualizacionDto } from './dto/update-tipo-de-visualizacion.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TipoDeVisualizacion } from './entities/tipo-de-visualizacion.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TipoDeVisualizacionService {

  constructor(
    @InjectRepository(TipoDeVisualizacion)
    private tipoDeVisualizacionRepository: Repository<TipoDeVisualizacion>,
  ){}

  async create(createTipoDeVisualizacionDto: CreateTipoDeVisualizacionDto):Promise<TipoDeVisualizacion> {
    //Verifico no exista un tipo de visualizacion con el mismo nombre antes de crear.
    const { nombre } = createTipoDeVisualizacionDto
    const tipoDeVisualizacionExistente = await this.tipoDeVisualizacionRepository.findOneBy({ nombre })
    if(tipoDeVisualizacionExistente) {
      throw new NotFoundException('El tipo de visualizacion ya existe')
    }

    // Creo y guardo el tipo de visualizacion en la BD.
    const tipoDeVisualizacion = this.tipoDeVisualizacionRepository.create(createTipoDeVisualizacionDto)
    return await this.tipoDeVisualizacionRepository.save(tipoDeVisualizacion)
  }

  async findAll(): Promise<TipoDeVisualizacion[]> {
    return await this.tipoDeVisualizacionRepository.find()
  }

  async findOne(id: number):Promise<TipoDeVisualizacion> {
    const tipoDeVisualizacion = await this.tipoDeVisualizacionRepository.findOneBy({ id })
    if(!tipoDeVisualizacion){
      throw new NotFoundException(`El tipo de visualizacion con el id ${id} no existe`)
    }
    return tipoDeVisualizacion
  }

  async update(id: number, updateTipoDeVisualizacionDto: UpdateTipoDeVisualizacionDto) {
    const tipoDeVisualizacion = await this.findOne(id)
    // Comprueba si el DTO incluye un nuevo nombre y si es diferente al nombre actual del tipo de visualizacion
    if (updateTipoDeVisualizacionDto.nombre && updateTipoDeVisualizacionDto.nombre !== tipoDeVisualizacion.nombre) {
      const tipoDeVisualizacionExistente = await this.tipoDeVisualizacionRepository.findOneBy({
        nombre: updateTipoDeVisualizacionDto.nombre,
      });
      if (tipoDeVisualizacionExistente) {
        throw new ConflictException('El nombre del tipo de visualizacion ya existe')
      }
    }
    Object.assign(tipoDeVisualizacion, updateTipoDeVisualizacionDto)
    return this.tipoDeVisualizacionRepository.save(tipoDeVisualizacion)
  }

  async remove(id: number):Promise<void> {
    const tipoDeVisualizacion = await this.findOne(id)
    if (!tipoDeVisualizacion){
      throw new NotFoundException(`El tipo de visualizacion con el id ${id} no existe`)
    }
    await this.tipoDeVisualizacionRepository.remove(tipoDeVisualizacion)
  }
}
