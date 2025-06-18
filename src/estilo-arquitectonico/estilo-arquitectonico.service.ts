import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateEstiloArquitectonicoDto } from './dto/create-estilo-arquitectonico.dto';
import { UpdateEstiloArquitectonicoDto } from './dto/update-estilo-arquitectonico.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { EstiloArquitectonico } from './entities/estilo-arquitectonico.entity';
import { Repository } from 'typeorm';

@Injectable()
export class EstiloArquitectonicoService {

  constructor(
    @InjectRepository(EstiloArquitectonico)
    private estiloArquitectonicoRepository: Repository<EstiloArquitectonico>,
  ){}

  async create(createEstiloArquitectonicoDto: CreateEstiloArquitectonicoDto):Promise<EstiloArquitectonico> {
    //Verifico no exista un estilo arquitectonico con el mismo nombre antes de crear.
    const { nombre } = createEstiloArquitectonicoDto
    const estiloArquitectonicoExistente = await this.estiloArquitectonicoRepository.findOneBy({ nombre })
    if(estiloArquitectonicoExistente) {
      throw new NotFoundException('El estilo arquitectonico ya existe')
    }

    // Creo y guardo el estilo arquitectonico en la BD.
    const estiloArquitectonico = this.estiloArquitectonicoRepository.create(createEstiloArquitectonicoDto)
    return await this.estiloArquitectonicoRepository.save(estiloArquitectonico)
  }

  async findAll(): Promise<EstiloArquitectonico[]> {
    return await this.estiloArquitectonicoRepository.find()
  }

  async findOne(id: number) {
    const estiloArquitectonico = await this.estiloArquitectonicoRepository.findOneBy({ id })
    if(!estiloArquitectonico){
      throw new NotFoundException(`El estilo arquitectonico con el id ${id} no existe`)
    }
    return estiloArquitectonico
  }

  async update(id: number, updateEstiloArquitectonicoDto: UpdateEstiloArquitectonicoDto) {
    const estiloArquitectonico = await this.findOne(id)
    // Comprueba si el DTO incluye un nuevo nombre y si es diferente al nombre actual del estilo arquitectonico
    if (updateEstiloArquitectonicoDto.nombre && updateEstiloArquitectonicoDto.nombre !== estiloArquitectonico.nombre) {
      const estiloArquitectonicoExistente = await this.estiloArquitectonicoRepository.findOneBy({
        nombre: updateEstiloArquitectonicoDto.nombre,
      });
      if (estiloArquitectonicoExistente) {
        throw new ConflictException('El nombre del estilo arquitectonico ya existe')
      }
    }
    Object.assign(estiloArquitectonico, updateEstiloArquitectonicoDto)
    return this.estiloArquitectonicoRepository.save(estiloArquitectonico)
  }

  async remove(id: number):Promise<void> {
    const estiloArquitectonico = await this.findOne(id)
    if (!estiloArquitectonico){
      throw new NotFoundException(`El estilo arquitectonico con el id ${id} no existe`)
    }
    await this.estiloArquitectonicoRepository.remove(estiloArquitectonico)
  }
}
