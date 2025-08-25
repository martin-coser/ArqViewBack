import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateInmobiliariaDto } from './dto/create-inmobiliaria.dto';
import { UpdateInmobiliariaDto } from './dto/update-inmobiliaria.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Inmobiliaria } from './entities/inmobiliaria.entity';
import { Repository } from 'typeorm';
import { Localidad } from 'src/localidad/entities/localidad.entity';
import { Cuenta } from 'src/auth/entities/cuenta.entity';

@Injectable()
export class InmobiliariaService {
  constructor(
    @InjectRepository(Inmobiliaria)
    private inmobiliariaRepository: Repository<Inmobiliaria>,
    @InjectRepository(Localidad)
    private localidadRepository: Repository<Localidad>,
    @InjectRepository(Cuenta)
    private cuentaRepository: Repository<Cuenta>,
  ){}

  async create(createInmobiliariaDto: CreateInmobiliariaDto): Promise<Inmobiliaria> {
  // Utilizar transacciones para asegurar la integridad de los datos
  return await this.inmobiliariaRepository.manager.transaction(async (transactionalEntityManager) => {
    // 1. Desestructurar el DTO para mayor claridad
    const {
      nombre,
      direccion,
      localidad: localidadId,
      cuenta: cuentaID
    } = createInmobiliariaDto;

    // 2. Usar el transactionalEntityManager para buscar si la dirección ya existe
    const inmobiliariaExistente = await transactionalEntityManager.findOne(Inmobiliaria, { where: { direccion } });
    if (inmobiliariaExistente) {
      // Lanzar una excepción detendrá la transacción y hará el rollback
      throw new ConflictException('La dirección ya existe');
    }

    // 3. Usar el transactionalEntityManager para buscar los objetos relacionados
    const localidad = await transactionalEntityManager.findOne(Localidad, { where: { id: localidadId } });
    if (!localidad) {
      throw new NotFoundException(`Localidad con id ${localidadId} no existe`);
    }

    const cuenta = await transactionalEntityManager.findOne(Cuenta, { where: { id: cuentaID } });
    if (!cuenta) {
      throw new NotFoundException(`Cuenta con id ${cuentaID} no existe`);
    }

    // 4. Crear la entidad usando el transactionalEntityManager
    const inmobiliaria = transactionalEntityManager.create(Inmobiliaria, {
      nombre,
      direccion,
      localidad,
      cuenta
    });

    // 5. Guardar la entidad usando el transactionalEntityManager. Esto completa la operación.
    return await transactionalEntityManager.save(inmobiliaria);
  });
} 

  async findAll(): Promise<Inmobiliaria[]> {
    return await this.inmobiliariaRepository.find()
  }

  async findOne(id: number): Promise<Inmobiliaria> {
    const inmobiliaria = await this.inmobiliariaRepository.findOneBy({ id })
    if (!inmobiliaria) {
      throw new NotFoundException(`La inmobiliaria con el id ${id} no existe`)
    }
    return inmobiliaria
  }

  async update(id: number, updateInmobiliariaDto: UpdateInmobiliariaDto): Promise<Inmobiliaria>{
    //Buscar entidad por id
    const  inmobiliariaToUpdate = await this.inmobiliariaRepository.findOne({
      where: {id},
      // Cargar las relaciones necesarias para evitar problemas de referencia
      relations: ['localidad']
    })

    if(!inmobiliariaToUpdate){
      throw new NotFoundException(`inmobiliaria con ID ${id} no encontrada`);
    }

    // verificar si la nueva direccion ya existe en otra inmobiliaria
    if(updateInmobiliariaDto.direccion && updateInmobiliariaDto.direccion !== inmobiliariaToUpdate.direccion){
      const inmobiliariaConMismaDireccion = await this.inmobiliariaRepository.findOneBy({direccion: updateInmobiliariaDto.direccion})

      // si existe una inmobiliaria con la misma direccion y no es la misma inmobiliaria que estamos actualizando, lanzaremos un error de conflico

      if(inmobiliariaConMismaDireccion && inmobiliariaConMismaDireccion.id !== id){
        throw new ConflictException('La nueva dirección ya está registrada en otra inmobiliaria')
      }
    }

    //Actualizamos los campos de la entidad
    Object.assign(inmobiliariaToUpdate, updateInmobiliariaDto)

    // Actualizar los campos que son relaciones (foráneas)
    if (updateInmobiliariaDto.localidad !== undefined) {
      const localidad = await this.localidadRepository.findOne({ where: { id: updateInmobiliariaDto.localidad } });
      if (!localidad) {
        throw new NotFoundException(`Localidad con id ${updateInmobiliariaDto.localidad} no existe`);
      }
      inmobiliariaToUpdate.localidad = localidad;
    }

    //  Guardar los cambios en la base de datos

    return await this.inmobiliariaRepository.save(inmobiliariaToUpdate)

  }

  async remove(id: number): Promise<void> {
    const inmobiliaria = await this.findOne(id)
    this.inmobiliariaRepository.remove(inmobiliaria)
  }
}
