import { BadRequestException, NotFoundException, ConflictException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Cuenta } from "src/auth/entities/cuenta.entity";
import { Repository } from "typeorm";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from 'bcrypt';
import { RegisterCuentaDto } from "src/auth/dto/register-cuenta.dto";
import { AuthService } from "src/auth/auth.service";
import { Inmobiliaria } from "src/inmobiliaria/entities/inmobiliaria.entity";
import { InmobiliariaService } from "src/inmobiliaria/inmobiliaria.service";
import { CreateInmobiliariaDto } from "src/inmobiliaria/dto/create-inmobiliaria.dto";
import { JwtService } from "@nestjs/jwt";
import { Localidad } from "src/localidad/entities/localidad.entity";
import { Cliente } from "src/cliente/entities/cliente.entity";
import { ClienteService } from "src/cliente/cliente.service";
import { validate } from 'class-validator';

// Mock de la función de hash de bcrypt para evitar problemas de rendimiento
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

describe('test de integracion para Inmobiliaria', () => {
  let authService: AuthService;
  let inmobiliariaService: InmobiliariaService;
  let cuentaRepository: Repository<Cuenta>;
  let inmobiliariaRepository: Repository<Inmobiliaria>;
  let localidadRepository: Repository<Localidad>;
  let clienteRepository: Repository<Cliente>;
  let jwtService: JwtService;

  // ... (mocks de datos y DTOs)
  const mockRegisterCuentaDto: RegisterCuentaDto = {
    nombreUsuario: 'inmobiliaria',
    email: 'inmobiliaria@gmail.com',
    password: 'Password123!',
    rol: 'INMOBILIARIA',
  };

  const mockCuenta = {
    id: 1,
    nombreUsuario: 'inmobiliaria',
    email: 'inmobiliaria@gmail.com',
    password: 'hashed_password',
    rol: 'INMOBILIARIA',
    login: new Date(),
  };

  const mockLocalidad = { id: 1, nombre: 'Ciudad Ejemplo', codigoPostal: 12345, provincia: 1 };
  
  const mockCreateInmobiliariaDto: CreateInmobiliariaDto = {
    nombre: 'Inmobiliaria',
    direccion: 'Avenida Falsa 123',
    localidad: 1,
    cuenta: 1,
  };

  const mockInmobiliaria = {
    id: 1,
    nombre: 'Inmobiliaria',
    direccion: 'Avenida Falsa 123',
    localidad: mockLocalidad,
    cuenta: mockCuenta,
  };

  // Mocks de repositorios y servicios
  const mockCuentaRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn().mockReturnValue(mockCuenta),
    save: jest.fn().mockResolvedValue(mockCuenta),
  };

  const mockLocalidadRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  };

  const mockInmobiliariaRepository = {
    // Los mocks findOneBy y save de este repositorio ya no son necesarios
    // para el método create, pero se mantienen para otros métodos del servicio.
    findOneBy: jest.fn(),
    create: jest.fn().mockReturnValue(mockInmobiliaria),
    save: jest.fn().mockResolvedValue(mockInmobiliaria),
    // Esto es lo más importante: simular la transacción de TypeORM
    manager: {
      transaction: jest.fn(async (cb) => {
        // Simulamos el transactionalEntityManager que se pasa al callback
        const transactionalEntityManager = {
          findOne: jest.fn(),
          create: jest.fn().mockReturnValue(mockInmobiliaria),
          save: jest.fn().mockResolvedValue(mockInmobiliaria),
        };
        // Ejecutamos el callback de la transacción y devolvemos su resultado
        return await cb(transactionalEntityManager);
      }),
    },
  };

  const mockClienteRepository = {
    findOneBy: jest.fn(),
  };

  const mockJwtService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        InmobiliariaService,
        ClienteService,
        {
          provide: getRepositoryToken(Cuenta),
          useValue: mockCuentaRepository,
        },
        {
          provide: getRepositoryToken(Inmobiliaria),
          useValue: mockInmobiliariaRepository,
        },
        {
          provide: getRepositoryToken(Localidad),
          useValue: mockLocalidadRepository,
        },
        {
          provide: getRepositoryToken(Cliente),
          useValue: mockClienteRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    inmobiliariaService = module.get<InmobiliariaService>(InmobiliariaService);
    cuentaRepository = module.get<Repository<Cuenta>>(getRepositoryToken(Cuenta));
    inmobiliariaRepository = module.get<Repository<Inmobiliaria>>(getRepositoryToken(Inmobiliaria));
    localidadRepository = module.get<Repository<Localidad>>(getRepositoryToken(Localidad));
    clienteRepository = module.get<Repository<Cliente>>(getRepositoryToken(Cliente));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Los tests para AuthService permanecen sin cambios
  describe('Servicio de cuenta para inmobiliaria', () => {
    it('✅ Debería registrar una nueva cuenta con éxito', async () => {
      //busca una cuenta pero no la encuentra 
      mockCuentaRepository.findOne.mockResolvedValue(null);
      //busca y guarda la cuenta en result
      const result = await authService.register(mockRegisterCuentaDto);

      //verifica que se hayan llamado los metodos correctos con los parametros correctos
      expect(mockCuentaRepository.findOne).toHaveBeenCalledWith({ where: { nombreUsuario: 'inmobiliaria' } });
      expect(mockCuentaRepository.findOne).toHaveBeenCalledWith({ where: { email: 'inmobiliaria@gmail.com' } });
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
      expect(mockCuentaRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        nombreUsuario: 'inmobiliaria',
        email: 'inmobiliaria@gmail.com',
        password: 'hashed_password',
        rol: 'INMOBILIARIA',
      }));
      expect(mockCuentaRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockCuenta);
    });

    //se encarga de probar la reaccion del servicio cuando se le informa que un cliente ya existe
    it('❌ Debería lanzar NotFoundException si el nombre de usuario ya existe', async () => {
      mockCuentaRepository.findOne.mockResolvedValueOnce(mockCuenta);

      await expect(authService.register(mockRegisterCuentaDto)).rejects.toThrow(
        new NotFoundException('El nombre de usuario ya está en uso')
      );
    });
    //se encarga de probar la reaccion del servicio cuando se le informa que un email ya existe
    it('❌ Debería lanzar NotFoundException si el email ya existe', async () => {
      mockCuentaRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockCuenta);

      await expect(authService.register(mockRegisterCuentaDto)).rejects.toThrow(
        new NotFoundException('El email ya está en uso')
      );
    });
    
    it('❌ Debería devolver errores de validación para un DTO inválido', async () => {
      const invalidDto = new RegisterCuentaDto();
      invalidDto.nombreUsuario = '';
      invalidDto.email = 'invalid-email';
      invalidDto.password = 'short';
      invalidDto.rol = 'INVALID_ROL' as any;

      // Validar el DTO inválido con el validate
      const errores = await validate(invalidDto);
      //espera que haya errores de validación >0
      expect(errores.length).toBeGreaterThan(0);
    });
  });

  describe('InmobiliariaService.create', () => {
    it('✅ Debería crear un nuevo perfil de inmobiliaria con éxito', async () => {
      // Mock para simular un escenario exitoso dentro de la transacción
      const mockTransactionalEntityManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce(null) // Para la búsqueda de la inmobiliaria
          .mockResolvedValueOnce(mockLocalidad) // Para la búsqueda de la localidad
          .mockResolvedValueOnce(mockCuenta), // Para la búsqueda de la cuenta
        create: jest.fn().mockReturnValue(mockInmobiliaria),
        save: jest.fn().mockResolvedValue(mockInmobiliaria),
      };
      // Mockeamos la transacción completa para que ejecute nuestro mock
      mockInmobiliariaRepository.manager.transaction.mockImplementation(async (cb) => {
        return await cb(mockTransactionalEntityManager);
      });

      const result = await inmobiliariaService.create(mockCreateInmobiliariaDto);
      
      // Verificaciones actualizadas para el transactionalEntityManager
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Inmobiliaria, { where: { direccion: mockCreateInmobiliariaDto.direccion } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Localidad, { where: { id: mockCreateInmobiliariaDto.localidad } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Cuenta, { where: { id: mockCreateInmobiliariaDto.cuenta } });
      expect(mockTransactionalEntityManager.create).toHaveBeenCalledWith(Inmobiliaria, expect.objectContaining({
        nombre: 'Inmobiliaria',
        direccion: 'Avenida Falsa 123',
        localidad: mockLocalidad,
        cuenta: mockCuenta,
      }));
      expect(mockTransactionalEntityManager.save).toHaveBeenCalled();
      expect(result).toEqual(mockInmobiliaria);
    });

    it('❌ Debería lanzar ConflictException si ya existe una inmobiliaria con esa dirección', async () => {
      // Mock para simular que la inmobiliaria ya existe
      const mockTransactionalEntityManager = {
        findOne: jest.fn().mockResolvedValue(mockInmobiliaria),
        create: jest.fn(),
        save: jest.fn(),
      };
      mockInmobiliariaRepository.manager.transaction.mockImplementation(async (cb) => {
        return await cb(mockTransactionalEntityManager);
      });

      await expect(inmobiliariaService.create(mockCreateInmobiliariaDto)).rejects.toThrow(
        new ConflictException('La dirección ya existe')
      );
      // Verificaciones para el caso de fallo
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Inmobiliaria, { where: { direccion: mockCreateInmobiliariaDto.direccion } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledTimes(1);
      expect(mockTransactionalEntityManager.create).not.toHaveBeenCalled();
      expect(mockTransactionalEntityManager.save).not.toHaveBeenCalled();
    });

    it('❌ Debería lanzar NotFoundException si la localidad no existe', async () => {
      // Mock para simular que la localidad no existe
      const mockTransactionalEntityManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce(null) // Inmobiliaria no existe
          .mockResolvedValueOnce(null), // Localidad no existe
        create: jest.fn(),
        save: jest.fn(),
      };
      mockInmobiliariaRepository.manager.transaction.mockImplementation(async (cb) => {
        return await cb(mockTransactionalEntityManager);
      });

      await expect(inmobiliariaService.create(mockCreateInmobiliariaDto)).rejects.toThrow(
        new NotFoundException(`Localidad con id ${mockCreateInmobiliariaDto.localidad} no existe`)
      );
      // Verificaciones para el caso de fallo
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Inmobiliaria, { where: { direccion: mockCreateInmobiliariaDto.direccion } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Localidad, { where: { id: mockCreateInmobiliariaDto.localidad } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledTimes(2);
      expect(mockTransactionalEntityManager.create).not.toHaveBeenCalled();
      expect(mockTransactionalEntityManager.save).not.toHaveBeenCalled();
    });

    it('❌ Debería lanzar NotFoundException si la cuenta no existe', async () => {
      // Mock para simular que la cuenta no existe
      const mockTransactionalEntityManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce(null) // Inmobiliaria no existe
          .mockResolvedValueOnce(mockLocalidad) // Localidad existe
          .mockResolvedValueOnce(null), // Cuenta no existe
        create: jest.fn(),
        save: jest.fn(),
      };
      mockInmobiliariaRepository.manager.transaction.mockImplementation(async (cb) => {
        return await cb(mockTransactionalEntityManager);
      });
      
      await expect(inmobiliariaService.create(mockCreateInmobiliariaDto)).rejects.toThrow(
        new NotFoundException(`Cuenta con id ${mockCreateInmobiliariaDto.cuenta} no existe`)
      );
      // Verificaciones para el caso de fallo
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Inmobiliaria, { where: { direccion: mockCreateInmobiliariaDto.direccion } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Localidad, { where: { id: mockCreateInmobiliariaDto.localidad } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Cuenta, { where: { id: mockCreateInmobiliariaDto.cuenta } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledTimes(3);
      expect(mockTransactionalEntityManager.create).not.toHaveBeenCalled();
      expect(mockTransactionalEntityManager.save).not.toHaveBeenCalled();
    });
  });
});
