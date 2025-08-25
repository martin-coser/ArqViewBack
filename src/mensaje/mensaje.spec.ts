import { Test, TestingModule } from '@nestjs/testing';
import { MensajeService } from './mensaje.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Mensaje } from './entities/mensaje.entity';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrearMensajeDto } from './dto/crear-mensaje.dto';
import { Repository } from 'typeorm';

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

  test('Debe enviar un mensaje y notificar con remitente y contenido', async () => {
    const dto: CrearMensajeDto = {
      idRemitente: 1,
      idReceptor: 2,
      contenido: 'Hola, ¿tienes propiedades?',
      tipoRemitente: 'CLIENTE',
      tipoReceptor: 'INMOBILIARIA',
    };

    clienteRepo.findOne.mockResolvedValue({ id: 1, cuenta: { email: 'cliente@ejemplo.com', nombreUsuario: 'cliente1' } } as Cliente);
    inmobiliariaRepo.findOne.mockResolvedValue({ id: 2, cuenta: { email: 'inmo@ejemplo.com' } } as Inmobiliaria);
    const mensajeCreado = {
      id: 1,
      contenido: dto.contenido,
      fechaCreacion: new Date('2025-08-22T11:37:00-03:00'),
    } as Mensaje;
    mensajeRepo.create.mockReturnValue(mensajeCreado);
    mensajeRepo.save.mockResolvedValue(mensajeCreado);

    // Mock para la llamada findOne que carga las relaciones después de guardar
    mensajeRepo.findOne.mockResolvedValue({
      ...mensajeCreado,
      remitenteCliente: { id: 1, cuenta: { nombreUsuario: 'cliente1' } } as Cliente,
      receptorInmobiliaria: { id: 2, cuenta: { email: 'inmo@ejemplo.com' } } as Inmobiliaria,
    } as Mensaje);

    const result = await service.enviarMensaje(dto);

    expect(result.contenido).toBe(dto.contenido);
    expect(mensajeRepo.save).toHaveBeenCalledWith(expect.objectContaining({ contenido: dto.contenido }));
    expect(eventEmitter.emit).toHaveBeenCalledWith('nuevo.mensaje', expect.objectContaining({
      contenido: dto.contenido, // Corrección: espera el contenido completo
      fechaCreacion: mensajeCreado.fechaCreacion,
      remitente: 'cliente1',
      receptor: 'inmo@ejemplo.com',
      mensajeId: 1,
    }));
  });

  
  test('Debe buscar mensajes con remitente y asunto', async () => {
    const messages = [{
      id: 1,
      contenido: 'Mensaje de prueba',
      remitenteCliente: { cuenta: { nombreUsuario: 'cliente1' } } as Cliente,
      fechaCreacion: new Date('2025-08-22T11:37:00-03:00'),
    } as Mensaje];

    // Crea un mock para el objeto QueryBuilder
    const queryBuilderMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(messages),
    };

    // Mockea createQueryBuilder para que devuelva el objeto mock
    (mensajeRepo.createQueryBuilder as jest.Mock).mockReturnValue(queryBuilderMock);

    const result = await service.findMessagesByTypeAndId('CLIENTE', 1);

    expect(result).toEqual(messages);
    expect(result[0].remitenteCliente.cuenta.nombreUsuario).toBe('cliente1');
    expect(result[0].contenido).toBe('Mensaje de prueba');
  });

  test('Debe manejar mensaje largo sin truncar', async () => {
    const longMessage = 'a'.repeat(200);
    const dto: CrearMensajeDto = {
      idRemitente: 1,
      idReceptor: 2,
      contenido: longMessage,
      tipoRemitente: 'CLIENTE',
      tipoReceptor: 'INMOBILIARIA',
    };

    clienteRepo.findOne.mockResolvedValue({ id: 1, cuenta: { email: 'cliente@ejemplo.com', nombreUsuario: 'cliente1' } } as Cliente);
    inmobiliariaRepo.findOne.mockResolvedValue({ id: 2, cuenta: { email: 'inmo@ejemplo.com' } } as Inmobiliaria);
    const mensajeCreado = {
      id: 1,
      contenido: longMessage,
      fechaCreacion: new Date('2025-08-22T11:37:00-03:00'),
    } as Mensaje;
    mensajeRepo.create.mockReturnValue(mensajeCreado);
    mensajeRepo.save.mockResolvedValue(mensajeCreado);
    
    // Mock para la llamada findOne que carga las relaciones después de guardar
    mensajeRepo.findOne.mockResolvedValue({
      ...mensajeCreado,
      remitenteCliente: { id: 1, cuenta: { nombreUsuario: 'cliente1' } } as Cliente,
      receptorInmobiliaria: { id: 2, cuenta: { email: 'inmo@ejemplo.com' } } as Inmobiliaria,
    } as Mensaje);

    const result = await service.enviarMensaje(dto);

    expect(result.contenido.length).toBe(200);
    expect(eventEmitter.emit).toHaveBeenCalledWith('nuevo.mensaje', expect.objectContaining({
      contenido: longMessage, 
      remitente: 'cliente1',
      mensajeId: 1,
    }));
  });
});