import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecomendacionService } from 'src/recomendacion/recomendacion.service';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { ListaDeInteres } from 'src/lista-de-interes/entities/lista-de-interes.entity';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { Notificacion } from 'src/notificacion/entities/notificacion.entity';
import { MailerService } from '@nestjs-modules/mailer';

// --- MOCKS DE SERVICIOS Y REPOSITORIOS ---
const mockClienteRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
};
const mockListaDeInteresRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
};
const mockPropiedadRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
};
const mockNotificacionRepo = {
  create: jest.fn(),
  save: jest.fn(),
};
const mockMailerService = {
  sendMail: jest.fn(),
};

// --- MOCKS DE DATOS ---
const mockTipoPropCasa = { id: 1, nombre: 'Casa' };
const mockLocalidad = { id: 4, nombre: 'Villa Maria' };
const mockInmobiliariaPremium = { id: 1, plan: 'PREMIUM' } as any;
const mockInmobiliariaNoPremium = { id: 2, plan: 'BASICO' } as any;

// Propiedades de la lista de interés del cliente
const mockInteres1 = {
  id: 10,
  precio: 150000,
  superficie: 100,
  cantidadBanios: 2,
  cantidadDormitorios: 3,
  cantidadAmbientes: 4,
  tipoPropiedad: mockTipoPropCasa,
  localidad: mockLocalidad,
} as Propiedad;

const mockInteres2 = {
  id: 11,
  precio: 160000,
  superficie: 110,
  cantidadBanios: 2,
  cantidadDormitorios: 3,
  cantidadAmbientes: 4,
  tipoPropiedad: mockTipoPropCasa,
  localidad: mockLocalidad,
} as Propiedad;

// Propiedad "Nueva" que SÍ es similar
const mockPropiedadRecomendable = {
  id: 20,
  precio: 155000,
  superficie: 105,
  cantidadBanios: 2,
  cantidadDormitorios: 3,
  cantidadAmbientes: 4,
  tipoPropiedad: mockTipoPropCasa,
  localidad: mockLocalidad,
  inmobiliaria: mockInmobiliariaPremium,
} as Propiedad;

// Propiedad "Nueva" que NO es similar
const mockPropiedadNoRecomendable = {
  id: 21,
  precio: 800000,
  superficie: 500,
  cantidadBanios: 1,
  cantidadDormitorios: 1,
  cantidadAmbientes: 2,
  tipoPropiedad: { id: 2, nombre: 'Departamento' },
  localidad: mockLocalidad,
  inmobiliaria: mockInmobiliariaPremium,
} as Propiedad;

// Propiedad "Nueva" que es similar pero NO es PREMIUM
const mockPropiedadNoPremium = {
  id: 22,
  precio: 155000,
  superficie: 105,
  cantidadBanios: 2,
  cantidadDormitorios: 3,
  cantidadAmbientes: 4,
  tipoPropiedad: mockTipoPropCasa,
  localidad: mockLocalidad,
  inmobiliaria: mockInmobiliariaNoPremium,
} as Propiedad;

const mockCliente = {
  id: 7,
  nombre: 'Celia',
  cuenta: { email: 'cliente@test.com' },
  localidad: mockLocalidad,
} as Cliente;

const mockListaDeInteres = {
  id: 44,
  cliente: mockCliente,
  propiedades: [mockInteres1, mockInteres2],
} as ListaDeInteres;

describe('RecomendacionService', () => {
  let service: RecomendacionService;
  let clienteRepository: jest.Mocked<Repository<Cliente>>;
  let listaDeInteresRepository: jest.Mocked<Repository<ListaDeInteres>>;
  let propiedadRepository: jest.Mocked<Repository<Propiedad>>;
  let notificacionRepository: jest.Mocked<Repository<Notificacion>>;
  let mailerService: jest.Mocked<MailerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecomendacionService,
        { provide: getRepositoryToken(Cliente), useValue: mockClienteRepo },
        { provide: getRepositoryToken(ListaDeInteres), useValue: mockListaDeInteresRepo },
        { provide: getRepositoryToken(Propiedad), useValue: mockPropiedadRepo },
        { provide: getRepositoryToken(Notificacion), useValue: mockNotificacionRepo },
        { provide: MailerService, useValue: mockMailerService },
      ],
    }).compile();

    service = module.get<RecomendacionService>(RecomendacionService);
    clienteRepository = module.get(getRepositoryToken(Cliente));
    listaDeInteresRepository = module.get(getRepositoryToken(ListaDeInteres));
    propiedadRepository = module.get(getRepositoryToken(Propiedad));
    notificacionRepository = module.get(getRepositoryToken(Notificacion));
    mailerService = module.get(MailerService);

    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  // --- Pruebas para US #12 - Objetivo 1 (Generar Recomendaciones) ---
  describe('generarRecomendaciones', () => {
    it('Debería devolver propiedades similares (recomendables)', async () => {
      // Arrange
      clienteRepository.findOne.mockResolvedValue(mockCliente);
      listaDeInteresRepository.findOne.mockResolvedValue(mockListaDeInteres);
      // Simulamos que  solo tiene 2 propiedades disponibles
      propiedadRepository.find.mockResolvedValue([
        mockPropiedadRecomendable,
        mockPropiedadNoRecomendable,
      ]);

      // Act
      const result = await service.generarRecomendaciones(7);

      // Assert
      expect(clienteRepository.findOne).toHaveBeenCalledWith({
        where: { id: 7 },
        relations: ['localidad'],
      });
      expect(listaDeInteresRepository.findOne).toHaveBeenCalled();
      expect(propiedadRepository.find).toHaveBeenCalled();
      // El resultado debe ser 1 (la recomendable)
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(mockPropiedadRecomendable.id);
      // El resultado NO debe incluir la no recomendable
      expect(result.some(p => p.id === mockPropiedadNoRecomendable.id)).toBe(false);
    });

    it('Debería devolver un array vacío si el cliente no tiene lista de interés', async () => {
      // Arrange
      clienteRepository.findOne.mockResolvedValue(mockCliente);
      listaDeInteresRepository.findOne.mockResolvedValue(null); // No tiene lista

      // Act
      const result = await service.generarRecomendaciones(7);

      // Assert
      expect(result).toEqual([]);
      expect(propiedadRepository.find).not.toHaveBeenCalled();
    });
  });

  // --- Pruebas para US #12 - Objetivo 2 (Notificar Propiedad Nueva) ---
  describe('notificarNuevaPropiedad', () => {
    it('Debería guardar y enviar notificación si la propiedad nueva es similar y premium', async () => {
      // Arrange
      // La nueva propiedad creada es la "recomendable" (que es premium)
      propiedadRepository.findOne.mockResolvedValue(mockPropiedadRecomendable);
      // Solo existe 1 cliente ("Celia")
      clienteRepository.find.mockResolvedValue([mockCliente]);
      // "Celia" tiene una lista de interés
      listaDeInteresRepository.find.mockResolvedValue([mockListaDeInteres]);

      notificacionRepository.create.mockReturnValue({} as Notificacion);
      notificacionRepository.save.mockResolvedValue({} as Notificacion);
      mailerService.sendMail.mockResolvedValue(true);

      // Act
      await service.notificarNuevaPropiedad(mockPropiedadRecomendable.id);

      // Assert
      expect(propiedadRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockPropiedadRecomendable.id },
        relations: ['localidad', 'tipoPropiedad', 'inmobiliaria'],
      });
      expect(clienteRepository.find).toHaveBeenCalled();
      // El score fue > 0.6, por lo tanto SÍ notifica
      expect(notificacionRepository.create).toHaveBeenCalled();
      expect(notificacionRepository.save).toHaveBeenCalled();
      expect(mailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'cliente@test.com' }),
      );
    });

    it('No debería notificar si la propiedad nueva no es similar', async () => {
      // Arrange
      // La nueva propiedad creada NO es similar
      propiedadRepository.findOne.mockResolvedValue(mockPropiedadNoRecomendable);
      clienteRepository.find.mockResolvedValue([mockCliente]);
      listaDeInteresRepository.find.mockResolvedValue([mockListaDeInteres]);

      // Act
      await service.notificarNuevaPropiedad(mockPropiedadNoRecomendable.id);

      // Assert
      // El score fue < 0.6, por lo tanto NO notifica
      expect(notificacionRepository.create).not.toHaveBeenCalled();
      expect(notificacionRepository.save).not.toHaveBeenCalled();
      expect(mailerService.sendMail).not.toHaveBeenCalled();
    });

    it('No debería notificar si la propiedad nueva no es de inmmobiliaria PREMIUM', async () => {
      // Arrange
      // La nueva propiedad es similar, pero NO es premium
      propiedadRepository.findOne.mockResolvedValue(mockPropiedadNoPremium);

      // Act
      await service.notificarNuevaPropiedad(mockPropiedadNoPremium.id);

      // Assert
      // El servicio debe retornar al inicio
      expect(propiedadRepository.findOne).toHaveBeenCalled();
      // No debe continuar buscando clientes
      expect(clienteRepository.find).not.toHaveBeenCalled();
      expect(notificacionRepository.create).not.toHaveBeenCalled();
      expect(mailerService.sendMail).not.toHaveBeenCalled();
    });
  });
});