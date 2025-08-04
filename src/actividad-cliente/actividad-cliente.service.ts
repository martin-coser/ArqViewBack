import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateActividadClienteDto } from './dto/create-actividad-cliente.dto';
import { ActividadCliente } from './entities/actividad-cliente.entity';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { ListaDeInteres } from 'src/lista-de-interes/entities/lista-de-interes.entity';

@Injectable()
export class ActividadClienteService {
  constructor(
    @InjectRepository(ActividadCliente)
    private readonly actividadClienteRepository: Repository<ActividadCliente>,
    @InjectRepository(Propiedad)
    private readonly propiedadRepository: Repository<Propiedad>,
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
    @InjectRepository(ListaDeInteres)
    private readonly listaDeInteresRepository: Repository<ListaDeInteres>,
  ) { }

  async create(createActividadClienteDto: CreateActividadClienteDto, cuentaId: number) {
    //Busco la propiedad asociada al ID proporcionado
    const propiedad = await this.propiedadRepository.findOne({
      where: { id: createActividadClienteDto.propiedad },
    });

    //Verifico si la propiedad existe
    if (!propiedad) {
      throw new NotFoundException(`No se encontró la propiedad con ID ${createActividadClienteDto.propiedad}`);
    }

    //Busco al cliente asociado a la cuenta
    const cliente = await this.clienteRepository.findOne({
      where: { cuenta: { id: cuentaId } },
    });

    //Verifico si el cliente existe
    if (!cliente) {
      throw new NotFoundException(`No se encontró un cliente asociado a la cuenta con ID ${cuentaId}`);
    }

    //Osea cuando se intente crear una actividad cliente de tipo consulta, debo verificar que no exista ningun mensaje anterior. De lo contrario, no se creara.
    if (createActividadClienteDto.tipoDeActividad === 'VISUALIZACION') {
      const actividadCliente = this.actividadClienteRepository.create({
        tipoDeActividad: createActividadClienteDto.tipoDeActividad,
        propiedad,
        cliente,
      });
      console.log('ActividadCliente a guardar:', actividadCliente);
      this.actividadClienteRepository.save(actividadCliente);
    } else if (createActividadClienteDto.tipoDeActividad === 'CONSULTA') {
      //Busco mensajes previos relacionados con la propiedad y el cliente
      //Si existe un mensaje previo, no se creará la actividad cliente
      //Esto es para evitar duplicados de consultas
      const mensajesPrevios = await this.actividadClienteRepository.find({
        where: {
          tipoDeActividad: 'CONSULTA',
          propiedad: { id: propiedad.id },
          cliente: { id: cliente.id },
        },
      });

      if (mensajesPrevios.length === 0) {
        const actividadCliente = this.actividadClienteRepository.create({
          tipoDeActividad: createActividadClienteDto.tipoDeActividad,
          propiedad,
          cliente,
        });
        console.log('ActividadCliente a guardar:', actividadCliente);
        this.actividadClienteRepository.save(actividadCliente);
      }
    } else if (createActividadClienteDto.tipoDeActividad === 'LISTADEINTERES') {
      const listaCliente = await this.listaDeInteresRepository.findOne({
        where: {
          cliente: { id: cliente.id },
        },
        relations: ['propiedades'], // Necesitamos las propiedades para verificar si ya existe
      });

      let debeCrearActividad = false; // Asumimos que no se debe crear hasta que se demuestre lo contrario

      if (!listaCliente) {
        // Escenario 1: La lista de interés NO existe para este cliente.
        // En este caso, siempre se debe crear la actividad.
        console.log('No se encontró lista de interés para el cliente. Se creará la actividad LISTADEINTERES.');
        debeCrearActividad = true;
      } else {
        // Escenario 2: La lista de interés SÍ existe para este cliente.
        // Ahora debemos verificar si la propiedad con la que interactuamos NO existe en esa lista.

        // Usamos 'some' para verificar eficientemente si la propiedad ya está en la lista.
        const propiedadYaEnLista = listaCliente.propiedades.some(
          (propiedadEnLista) => propiedadEnLista.id === propiedad.id,
        );

        if (!propiedadYaEnLista) {
          // Si la propiedad NO está en la lista existente, creamos la actividad.
          console.log('La propiedad no está en la lista de interés existente. Se creará la actividad LISTADEINTERES.');
          debeCrearActividad = true;
        } else {
          // Si la propiedad YA está en la lista existente, no hacemos nada (debeCrearActividad sigue siendo false).
          console.log('La propiedad ya se encuentra en la lista de interés del cliente. No se creará la actividad LISTADEINTERES.');
        }
      }

      // Si debeCrearActividad es true en cualquiera de los escenarios anteriores, creamos la actividad.
      if (debeCrearActividad) {
        const actividadCliente = this.actividadClienteRepository.create({
          tipoDeActividad: createActividadClienteDto.tipoDeActividad,
          propiedad,
          cliente,
        });
        console.log('ActividadCliente a guardar:', actividadCliente);
        await this.actividadClienteRepository.save(actividadCliente);
      }
    }

  }

}
