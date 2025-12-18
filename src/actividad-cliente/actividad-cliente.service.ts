import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateActividadClienteDto } from './dto/create-actividad-cliente.dto';
import { ActividadCliente } from './entities/actividad-cliente.entity';
import { MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { ListaDeInteres } from 'src/lista-de-interes/entities/lista-de-interes.entity';
import { FiltrosFechaChatIaDto } from './dto/filtrosfechaChatIa.dto';

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
  ) {}

  async create(
    createActividadClienteDto: CreateActividadClienteDto,
    cuentaId: number,
  ) {
    //Busco la propiedad asociada al ID proporcionado
    const propiedad = await this.propiedadRepository.findOne({
      where: { id: createActividadClienteDto.propiedad },
    });

    //Verifico si la propiedad existe
    if (!propiedad) {
      throw new NotFoundException(
        `No se encontró la propiedad con ID ${createActividadClienteDto.propiedad}`,
      );
    }

    //Busco al cliente asociado a la cuenta
    const cliente = await this.clienteRepository.findOne({
      where: { cuenta: { id: cuentaId } },
    });

    //Verifico si el cliente existe
    if (!cliente) {
      throw new NotFoundException(
        `No se encontró un cliente asociado a la cuenta con ID ${cuentaId}`,
      );
    }

    //Osea cuando se intente crear una actividad cliente de tipo consulta, debo verificar que no exista ningun mensaje anterior. De lo contrario, no se creara.
    if (createActividadClienteDto.tipoDeActividad === 'VISUALIZACION') {
      const actividadCliente = this.actividadClienteRepository.create({
        tipoDeActividad: createActividadClienteDto.tipoDeActividad,
        propiedad,
        cliente,
      });
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
          debeCrearActividad = true;
        } else {
          // Si la propiedad YA está en la lista existente, no hacemos nada (debeCrearActividad sigue siendo false).
        }
      }

      // Si debeCrearActividad es true en cualquiera de los escenarios anteriores, creamos la actividad.
      if (debeCrearActividad) {
        const actividadCliente = this.actividadClienteRepository.create({
          tipoDeActividad: createActividadClienteDto.tipoDeActividad,
          propiedad,
          cliente,
        });
        await this.actividadClienteRepository.save(actividadCliente);
      }
    }
  }

  //Registra una actividad simple de uso de chat con IA (solo para conteo).

  async registerChatUsage(
    clienteCuentaId: number,
  ): Promise<ActividadCliente | null> {
    // 1. Buscar al cliente asociado a la cuenta
    const cliente = await this.clienteRepository.findOne({
      where: { cuenta: { id: clienteCuentaId } },
    });

    if (!cliente) {
      throw new NotFoundException(
        `Cliente con cuenta ID ${clienteCuentaId} no encontrado. No se pudo registrar uso del chat.`,
      );
    }

    // 2. Determinar la medianoche de hoy (00:00:00). Esta fecha cambia con el día.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 3. Buscar si ya existe una actividad de USO CHAT IA hoy para este cliente
    const usoExistenteHoy = await this.actividadClienteRepository.findOne({
      where: {
        tipoDeActividad: 'USOCHATIA',
        cliente: { id: cliente.id },
        // La actividad debe ser posterior a la medianoche de hoy
        fechaYHoraActividad: MoreThan(startOfToday),
      },
    });

    if (usoExistenteHoy) {
      // Si ya existe, NO contamos de nuevo. El día ha sido contado.
      console.log(
        `Uso de chat IA ya registrado hoy para el cliente ${cliente.id}. Saltando registro.`,
      );
      return null;
    }

    // 2. Crear y guardar el registro de actividad
    const actividadChat = this.actividadClienteRepository.create({
      tipoDeActividad: 'USOCHATIA',
      cliente: cliente,
    });

    return this.actividadClienteRepository.save(actividadChat);
  }

  // Obtiene el conteo de usos del chat IA y logins por día, con porcentajes de adopción
  async getcountChatIaUses(filtros: FiltrosFechaChatIaDto) {
    const queryBuilder = this.actividadClienteRepository
      .createQueryBuilder('actividad')
      .select('DATE(actividad.fechaYHoraActividad)', 'fecha')
      .addSelect(
        "COUNT(DISTINCT CASE WHEN actividad.tipoDeActividad = 'LOGIN' THEN actividad.clienteId END)",
        'totalLogueados',
      )
      .addSelect(
        "COUNT(DISTINCT CASE WHEN actividad.tipoDeActividad = 'USOCHATIA' THEN actividad.clienteId END)",
        'totalUsaronChat',
      );

    // 1. Aplicar filtro SOLO si las fechas están presentes
    if (filtros.fechaInicio && filtros.fechaFin) {
      const start = new Date(filtros.fechaInicio);
      const end = new Date(filtros.fechaFin);
      end.setHours(23, 59, 59, 999);
      
      queryBuilder.where(
        'actividad.fechaYHoraActividad BETWEEN :start AND :end',
        { start, end },
      );
    }

    // 2. Obtener los datos (agrupados por fecha siempre)
    const estadisticasRaw = await queryBuilder
      .groupBy('fecha')
      .orderBy('fecha', 'ASC')
      .getRawMany();

    // 3. Procesamiento de los totales y porcentajes
    //esto sirve para el resumen global de toda la data obtenida
    let globalLogins = 0;
    let globalChatUsers = 0;

    //esto sirve para el detalle por dia
    const datosPorDia = estadisticasRaw.map((dia) => {
      const logueados = parseInt(dia.totalLogueados) || 0;
      const usaronChat = parseInt(dia.totalUsaronChat) || 0;

      globalLogins += logueados;
      globalChatUsers += usaronChat;

      // Calculo el porcentaje de adopción para el día
      return {
        fecha: dia.fecha,
        personasLogueadas: logueados,
        personasUsaronChat: usaronChat,
        porcentajeAdopcion:
          logueados > 0
            ? `${((usaronChat / logueados) * 100).toFixed(2)}%`
            : '0%',
      };
    });
    
    return {
      resumenGlobal: {
        totalLogueadosHistorial: globalLogins,
        totalUsaronChatHistorial: globalChatUsers,
        tasaAdopcionMedia:
          globalLogins > 0
            ? `${((globalChatUsers / globalLogins) * 100).toFixed(2)}%`
            : '0%',
      },
      datosPorDia,
    };
  }

  // Registra que el cliente ingresó a la plataforma (una vez por día)
  async registerLoginUsage(
    clienteCuentaId: number,
  ): Promise<ActividadCliente | null> {
    // 1. Buscar al cliente asociado a la cuenta
    const cliente = await this.clienteRepository.findOne({
      where: { cuenta: { id: clienteCuentaId } },
    });

    if (!cliente) {
      throw new NotFoundException(
        `Cliente con cuenta ID ${clienteCuentaId} no encontrado.`,
      );
    }

    // 2. Determinar la medianoche de hoy (00:00:00)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 3. Verificar si ya existe un registro de 'LOGIN' para este cliente el día de hoy
    const loginExistenteHoy = await this.actividadClienteRepository.findOne({
      where: {
        tipoDeActividad: 'LOGIN', // Nuevo tipo para diferenciar del chat
        cliente: { id: cliente.id },
        fechaYHoraActividad: MoreThan(startOfToday),
      },
    });

    if (loginExistenteHoy) {
      // El usuario ya entró hoy, no duplicamos el registro
      return null;
    }

    // 4. Crear el registro de actividad de inicio de sesión
    const actividadLogin = this.actividadClienteRepository.create({
      tipoDeActividad: 'LOGIN',
      cliente: cliente,
    });

    return this.actividadClienteRepository.save(actividadLogin);
  }
}
