import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { NotificacionService } from 'src/notificacion/notificacion.service';
import { Notificacion } from 'src/notificacion/entities/notificacion.entity';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { ListaDeInteres } from 'src/lista-de-interes/entities/lista-de-interes.entity';
import { NotificacionMensaje } from 'src/notificacion/entities/notificacionMensaje.entity';
import { Mensaje } from 'src/mensaje/entities/mensaje.entity';
import { Cuenta } from 'src/auth/entities/cuenta.entity';
import { MailerService } from '@nestjs-modules/mailer';

// Mock del MailerService
const mockMailerService = {
  sendMail: jest.fn(),
};

// Mocks de Repositorios
const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    innerJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  })),
};

describe('NotificacionService', () => {
  let service: NotificacionService;
  let notificacionRepository: jest.Mocked<Repository<Notificacion>>;
  let listaDeInteresRepository: jest.Mocked<Repository<ListaDeInteres>>;
  let propiedadRepository: jest.Mocked<Repository<Propiedad>>;
  let notificacionMensajeRepository: jest.Mocked<Repository<NotificacionMensaje>>;
  let mensajeRepository: jest.Mocked<Repository<Mensaje>>;
  let mailerService: jest.Mocked<MailerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacionService,
        {
          provide: getRepositoryToken(Notificacion),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Cliente),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ListaDeInteres),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Propiedad),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(NotificacionMensaje),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Mensaje),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Cuenta),
          useValue: mockRepository,
        },
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
      ],
    }).compile();

    service = module.get<NotificacionService>(NotificacionService);
    notificacionRepository = module.get(getRepositoryToken(Notificacion));
    listaDeInteresRepository = module.get(getRepositoryToken(ListaDeInteres));
    propiedadRepository = module.get(getRepositoryToken(Propiedad));
    notificacionMensajeRepository = module.get(
      getRepositoryToken(NotificacionMensaje),
    );
    mensajeRepository = module.get(getRepositoryToken(Mensaje));
    mailerService = module.get(MailerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('nuevoMensaje', () => {
    it('Debería guardar notificación de mensaje y enviar email', async () => {
      const mockPayload = {
        contenido: 'Hola, esta es una prueba',
        fechaCreacion: new Date(),
        remitente: 'Celia (Cliente)',
        receptor: 'inmobiliaria@test.com',
        mensajeId: 1,
      };
      
      const mockMensaje = { id: 1 } as Mensaje;
      
      // Mock de la búsqueda de mensaje
      mensajeRepository.findOne.mockResolvedValue(mockMensaje);

      // Mock de la creación de la notificación
      const mockNotifMensajeCreada = { ...mockPayload } as any;
      notificacionMensajeRepository.create.mockReturnValue(mockNotifMensajeCreada);
      notificacionMensajeRepository.save.mockResolvedValue(mockNotifMensajeCreada);

      // Mock del envío de email
      mailerService.sendMail.mockResolvedValue(true);

      // Ejecutar el handler
      await service.nuevoMensaje(mockPayload);

      // Verificaciones
      expect(mensajeRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(notificacionMensajeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contenido: 'Hola, esta es una prueba',
          remitente: 'Celia (Cliente)',
          receptor: 'inmobiliaria@test.com',
          mensaje: mockMensaje,
        }),
      );
      expect(notificacionMensajeRepository.save).toHaveBeenCalledWith(mockNotifMensajeCreada);
      expect(mailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'inmobiliaria@test.com',
          subject: 'Nuevo mensaje recibido',
          text: expect.stringContaining('Hola, esta es una prueba'),
        }),
      );
    });

    it('Debería lanzar NotFoundException si el mensajeId no existe', async () => {
      const mockPayload = {
        contenido: 'Test',
        fechaCreacion: new Date(),
        remitente: 'Celia',
        receptor: 'inmo@test.com',
        mensajeId: 999,
      };
      
      // Mock de la búsqueda de mensaje (falla)
      mensajeRepository.findOne.mockResolvedValue(null);

      // Verificaciones
      await expect(service.nuevoMensaje(mockPayload)).rejects.toThrow(
        new NotFoundException(`Mensaje con ID 999 no encontrado`),
      );
      expect(notificacionMensajeRepository.save).not.toHaveBeenCalled();
      expect(mailerService.sendMail).not.toHaveBeenCalled();
    });
  });

  // --- Pruebas para Métodos Públicos (GET, PATCH) ---
  describe('getMensajesByEmail', () => {
    it('Debería devolver notificaciones para un email', async () => {
      const mockNotificaciones = [{ id: 1, contenido: '...' }] as NotificacionMensaje[];
      notificacionMensajeRepository.find.mockResolvedValue(mockNotificaciones);
      
      const result = await service.getMensajesByEmail('test@test.com');
      
      expect(result).toEqual(mockNotificaciones);
      expect(notificacionMensajeRepository.find).toHaveBeenCalledWith({
        where: { receptor: 'test@test.com' },
      });
    });

    it('Debería lanzar NotFoundException si no hay notificaciones', async () => {
      notificacionMensajeRepository.find.mockResolvedValue([]); // Devuelve array vacío
      
      await expect(service.getMensajesByEmail('test@test.com')).rejects.toThrow(
        new NotFoundException(`No se encontró una notificación para el email test@test.com`),
      );
    });
  });

  describe('marcarMensajeLeido', () => {
    it('Debería marcar un mensaje como leído', async () => {
      const mockNotificacion = { id: 1, leida: false } as NotificacionMensaje;
      const mockNotificacionLeida = { id: 1, leida: true } as NotificacionMensaje;
      
      notificacionMensajeRepository.findOne.mockResolvedValue(mockNotificacion);
      notificacionMensajeRepository.save.mockResolvedValue(mockNotificacionLeida);

      const result = await service.marcarMensajeLeido(1);

      expect(notificacionMensajeRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(notificacionMensajeRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ leida: true }),
      );
      expect(result.leida).toBe(true);
    });
  });
});