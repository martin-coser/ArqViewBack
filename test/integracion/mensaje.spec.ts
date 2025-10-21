import { Test, TestingModule } from '@nestjs/testing';
import { MensajeService } from '../../src/mensaje/mensaje.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Mensaje } from '../../src/mensaje/entities/mensaje.entity';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrearMensajeDto } from '../../src/mensaje/dto/crear-mensaje.dto';
import { Repository } from 'typeorm';
import { MarcarComoLeidoDto } from '../../src/mensaje/dto/marcar-como-leido.dto';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';

describe('MensajeService', () => {
  let service: MensajeService;
  let mensajeRepo: jest.Mocked<Repository<Mensaje>>;
  let clienteRepo: jest.Mocked<Repository<Cliente>>;
  let inmobiliariaRepo: jest.Mocked<Repository<Inmobiliaria>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MensajeService,
        {
          provide: getRepositoryToken(Mensaje),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(Cliente),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Inmobiliaria),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MensajeService>(MensajeService);
    mensajeRepo = module.get(getRepositoryToken(Mensaje));
    clienteRepo = module.get(getRepositoryToken(Cliente));
    inmobiliariaRepo = module.get(getRepositoryToken(Inmobiliaria));
    eventEmitter = module.get(EventEmitter2);
  });

  it('Debe estar definido', () => {
    expect(service).toBeDefined();
  });

  // --- Pruebas para enviarMensaje (ya existentes, con pequeña corrección) ---
  it('Debe enviar un mensaje y notificar con remitente y contenido', async () => {
    const dto: CrearMensajeDto = {
      idRemitente: 1,
      idReceptor: 2,
      contenido: 'Hola, ¿tienes propiedades?',
      tipoRemitente: 'CLIENTE',
      tipoReceptor: 'INMOBILIARIA',
      leido: false,
    };

    clienteRepo.findOne.mockResolvedValue({ id: 1, cuenta: { email: 'cliente@ejemplo.com', nombreUsuario: 'cliente1' } } as Cliente);
    inmobiliariaRepo.findOne.mockResolvedValue({ id: 2, cuenta: { email: 'inmo@ejemplo.com' } } as Inmobiliaria);
    const mensajeCreado = {
      id: 1,
      contenido: dto.contenido,
      leido: false,
      fechaCreacion: new Date('2025-08-22T11:37:00-03:00'),
    } as Mensaje;
    mensajeRepo.create.mockReturnValue(mensajeCreado);
    mensajeRepo.save.mockResolvedValue(mensajeCreado);

    mensajeRepo.findOne.mockResolvedValue({
      ...mensajeCreado,
      remitenteCliente: { id: 1, cuenta: { nombreUsuario: 'cliente1' } } as Cliente,
      receptorInmobiliaria: { id: 2, cuenta: { email: 'inmo@ejemplo.com' } } as Inmobiliaria,
    } as Mensaje);

    const result = await service.enviarMensaje(dto);

    expect(result.contenido).toBe(dto.contenido);
    expect(mensajeRepo.save).toHaveBeenCalledWith(expect.objectContaining({ contenido: dto.contenido }));
    expect(eventEmitter.emit).toHaveBeenCalledWith('nuevo.mensaje', expect.objectContaining({
      contenido: dto.contenido,
      fechaCreacion: mensajeCreado.fechaCreacion,
      remitente: 'cliente1',
      receptor: 'inmo@ejemplo.com',
      mensajeId: 1,
    }));
  });

  // --- Pruebas para findMessagesByTypeAndId (ya existentes) ---
  it('Debe buscar mensajes con remitente y asunto', async () => {
    const messages = [{
      id: 1,
      contenido: 'Mensaje de prueba',
      remitenteCliente: { cuenta: { nombreUsuario: 'cliente1' } } as Cliente,
      fechaCreacion: new Date('2025-08-22T11:37:00-03:00'),
    } as Mensaje];

    const queryBuilderMock = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(messages),
    };

    (mensajeRepo.createQueryBuilder as jest.Mock).mockReturnValue(queryBuilderMock);

    const result = await service.findMessagesByTypeAndId('CLIENTE', 1);

    expect(result).toEqual(messages);
    expect(result[0].remitenteCliente.cuenta.nombreUsuario).toBe('cliente1');
    expect(result[0].contenido).toBe('Mensaje de prueba');
  });

  // --- Pruebas para marcarComoLeido (Nuevas pruebas) ---
  
  it('Debe marcar un mensaje como leído si el receptor es el correcto', async () => {
    // Datos del mensaje que se va a encontrar
    const mensajeNoLeido = {
      id: 1,
      leido: false,
      receptorCliente: { id: 10, cuenta: { email: 'receptor@ejemplo.com' } } as Cliente,
    } as Mensaje;
    
    // Datos de la solicitud para marcar como leído
    const marcarDto: MarcarComoLeidoDto = {
      idReceptor: 10,
      tipoReceptor: 'CLIENTE',
    };
    
    // Mockea la respuesta del repositorio
    mensajeRepo.findOne.mockResolvedValue(mensajeNoLeido);
    mensajeRepo.save.mockResolvedValue({ ...mensajeNoLeido, leido: true } as Mensaje);
    
    const result = await service.marcarComoLeido(1, marcarDto);
    
    // Verifica que el método save fue llamado con el mensaje actualizado
    expect(mensajeRepo.save).toHaveBeenCalledWith(expect.objectContaining({ leido: true }));
    expect(result.leido).toBe(true);
  });
  
  it('Debe lanzar NotFoundException si el mensaje no existe', async () => {
    // Mockea la respuesta para que findOne devuelva null
    mensajeRepo.findOne.mockResolvedValue(null);
    
    const marcarDto: MarcarComoLeidoDto = {
      idReceptor: 10,
      tipoReceptor: 'CLIENTE',
    };
    
    // Espera que la llamada al servicio lance una excepción
    await expect(service.marcarComoLeido(99, marcarDto)).rejects.toThrow(NotFoundException);
  });

  it('Debe lanzar UnauthorizedException si el receptor no coincide', async () => {
    // Datos del mensaje que se va a encontrar
    const mensajeNoLeido = {
      id: 1,
      leido: false,
      receptorCliente: { id: 10, cuenta: { email: 'receptor@ejemplo.com' } } as Cliente,
    } as Mensaje;
    
    // Datos de la solicitud con un ID de receptor incorrecto
    const marcarDto: MarcarComoLeidoDto = {
      idReceptor: 20, // ID de receptor incorrecto
      tipoReceptor: 'CLIENTE',
    };
    
    // Mockea la respuesta del repositorio
    mensajeRepo.findOne.mockResolvedValue(mensajeNoLeido);
    
    // Espera que la llamada al servicio lance una excepción de no autorizado
    await expect(service.marcarComoLeido(1, marcarDto)).rejects.toThrow(UnauthorizedException);
  });

  it('No debe guardar si el mensaje ya está leído', async () => {
    // Datos del mensaje que ya está leído
    const mensajeLeido = {
      id: 1,
      leido: true,
      receptorCliente: { id: 10, cuenta: { email: 'receptor@ejemplo.com' } } as Cliente,
    } as Mensaje;
    
    // Datos de la solicitud
    const marcarDto: MarcarComoLeidoDto = {
      idReceptor: 10,
      tipoReceptor: 'CLIENTE',
    };
    
    // Mockea la respuesta
    mensajeRepo.findOne.mockResolvedValue(mensajeLeido);
    
    const result = await service.marcarComoLeido(1, marcarDto);
    
    // Verifica que el método save NO fue llamado
    expect(mensajeRepo.save).not.toHaveBeenCalled();
    expect(result.leido).toBe(true);
  });
});