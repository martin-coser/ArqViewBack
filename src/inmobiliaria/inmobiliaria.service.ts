import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateInmobiliariaDto } from './dto/create-inmobiliaria.dto';
import { UpdateInmobiliariaDto } from './dto/update-inmobiliaria.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Inmobiliaria } from './entities/inmobiliaria.entity';
import { Repository } from 'typeorm';
import { Localidad } from 'src/localidad/entities/localidad.entity';
import { Cuenta } from 'src/auth/entities/cuenta.entity';
import { AuthService } from '../auth/auth.service';
import { RegisterCuentaDto } from 'src/auth/dto/register-cuenta.dto';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';

@Injectable()
export class InmobiliariaService {
  constructor(
    @InjectRepository(Inmobiliaria)
    private inmobiliariaRepository: Repository<Inmobiliaria>,
    @InjectRepository(Localidad)
    private localidadRepository: Repository<Localidad>,
    @InjectRepository(Cuenta)
    private cuentaRepository: Repository<Cuenta>,
    @InjectRepository(Propiedad)
    private propiedadRepository: Repository<Propiedad>,
    private readonly authService: AuthService,
  ){}

  async create(createInmobiliariaDto: CreateInmobiliariaDto, registerCuentaDto: RegisterCuentaDto): Promise<Inmobiliaria> {
    return await this.inmobiliariaRepository.manager.transaction(async (transactionalEntityManager) => {
      // Crear la cuenta dentro de la transacción
      const cuenta = await this.authService.register(registerCuentaDto, transactionalEntityManager);
      // Asignar el ID de la cuenta creada, sobrescribiendo o estableciendo si no existe
      createInmobiliariaDto.cuenta = cuenta.id;

      const { nombre, direccion,codigoPais,numeroTelefono, localidad: localityId, cuenta: cuentaId } = createInmobiliariaDto;

      // Verificar si la dirección ya existe
      const inmobiliariaExistente = await transactionalEntityManager.findOne(Inmobiliaria, {
        where: { direccion },
      });
      if (inmobiliariaExistente) {
        throw new ConflictException('La dirección ya existe');
      }

      // Buscar la localidad
      const localidad = await transactionalEntityManager.findOne(Localidad, {
        where: { id: localityId },
      });
      if (!localidad) {
        throw new NotFoundException(`Localidad con id ${localityId} no existe`);
      }

      // Verificar que la cuenta existe (por consistencia)
      const cuentaExistente = await transactionalEntityManager.findOne(Cuenta, {
        where: { id: cuentaId },
      });
      if (!cuentaExistente) {
        throw new NotFoundException(`Cuenta con id ${cuentaId} no existe`);
      }

      // Crear y guardar la entidad Inmobiliaria
      const inmobiliaria = transactionalEntityManager.create(Inmobiliaria, {
        nombre,
        direccion,
        localidad,
        codigoPais,
        numeroTelefono,
        cuenta: cuentaExistente,
      });

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

  async updatePlan(idInmobiliaria: number, plan: 'BASICO' | 'PREMIUM'): Promise<Inmobiliaria> {
    const inmobiliaria = await this.findOne(idInmobiliaria);

    if (!inmobiliaria) {
      throw new NotFoundException(`Inmobiliaria con ID ${idInmobiliaria} no encontrada`);
    }

    inmobiliaria.plan = plan;
    const result = await this.inmobiliariaRepository.save(inmobiliaria);
    return result;
  }

  async esPremium(propiedadID: number): Promise<boolean> {
    const propiedad = await this.propiedadRepository.findOne({
      where: { id : propiedadID },
      relations: ['inmobiliaria'],
    });
    if (!propiedad) {
      throw new NotFoundException(`Propiedad con ID ${propiedadID} no encontrada.`);
    }

    if (!propiedad) {
      throw new NotFoundException(`Propiedad con ID ${propiedadID} no encontrada.`);
    }

    return propiedad.inmobiliaria.plan === 'PREMIUM';
  }
}
