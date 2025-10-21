import { ConflictException, NotFoundException, BadRequestException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
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
import { Cuenta } from "src/auth/entities/cuenta.entity";
import { ClienteService } from "src/cliente/cliente.service";
import { Cliente } from "src/cliente/entities/cliente.entity";
import { validate } from 'class-validator';

// Mock de la función hash de bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

describe('Pruebas de integración para InmobiliariaService', () => {
  let authService: AuthService;
  let inmobiliariaService: InmobiliariaService;
  let cuentaRepository: Repository<Cuenta>;
  let inmobiliariaRepository: Repository<Inmobiliaria>;
  let localidadRepository: Repository<Localidad>;
  let clienteRepository: Repository<Cliente>;

  // DTOs y entidades simuladas
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
    caracteristica: '123',
    numeroTelefono: '1234567890',
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

  // Repositorios y servicios simulados
  const mockCuentaRepository = {
    manager: {
      findOne: jest.fn(),
      create: jest.fn().mockReturnValue(mockCuenta),
      save: jest.fn().mockResolvedValue(mockCuenta),
    },
  };

  const mockInmobiliariaRepository = {
    manager: {
      transaction: jest.fn(),
    },
  };

  const mockLocalidadRepository = {
    manager: {
      findOne: jest.fn(),
    },
  };

  const mockClienteRepository = {};
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthService.register', () => {
    it('✅ Debería registrar una nueva cuenta con éxito', async () => {
      mockCuentaRepository.manager.findOne
        .mockResolvedValueOnce(null) // Nombre de usuario no existe
        .mockResolvedValueOnce(null); // Email no existe

      const result = await authService.register(mockRegisterCuentaDto);

      expect(mockCuentaRepository.manager.findOne).toHaveBeenCalledWith(Cuenta, { where: { nombreUsuario: 'inmobiliaria' } });
      expect(mockCuentaRepository.manager.findOne).toHaveBeenCalledWith(Cuenta, { where: { email: 'inmobiliaria@gmail.com' } });
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
      expect(mockCuentaRepository.manager.create).toHaveBeenCalledWith(
        Cuenta,
        expect.objectContaining({
          nombreUsuario: 'inmobiliaria',
          email: 'inmobiliaria@gmail.com',
          password: 'hashed_password',
          rol: 'INMOBILIARIA',
          login: expect.any(Date),
        })
      );
      expect(mockCuentaRepository.manager.save).toHaveBeenCalledWith(mockCuenta);
      expect(result).toEqual(mockCuenta);
    });

    it('❌ Debería lanzar BadRequestException si el nombre de usuario ya existe', async () => {
      mockCuentaRepository.manager.findOne
        .mockResolvedValueOnce(mockCuenta); // Nombre de usuario existe

      await expect(authService.register(mockRegisterCuentaDto)).rejects.toThrow(
        new BadRequestException('El nombre de usuario ya está en uso')
      );
    });

    it('❌ Debería lanzar BadRequestException si el email ya existe', async () => {
      mockCuentaRepository.manager.findOne
        .mockResolvedValueOnce(null) // Nombre de usuario no existe
        .mockResolvedValueOnce(mockCuenta); // Email existe

      await expect(authService.register(mockRegisterCuentaDto)).rejects.toThrow(
        new BadRequestException('El email ya está en uso')
      );
    });

    it('❌ Debería devolver errores de validación para un DTO inválido', async () => {
      const invalidDto = new RegisterCuentaDto();
      invalidDto.nombreUsuario = '';
      invalidDto.email = 'invalid-email';
      invalidDto.password = 'short';
      invalidDto.rol = 'INVALID_ROL' as any;

      const errors = await validate(invalidDto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('InmobiliariaService.create', () => {
    it('✅ Debería crear una nueva inmobiliaria con éxito', async () => {
      const mockTransactionalEntityManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce(null) // Nombre de usuario no existe
          .mockResolvedValueOnce(null) // Email no existe
          .mockResolvedValueOnce(null) // Inmobiliaria no existe
          .mockResolvedValueOnce(mockLocalidad) // Localidad existe
          .mockResolvedValueOnce(mockCuenta), // Cuenta existe
        create: jest.fn()
          .mockReturnValueOnce(mockCuenta) // Para AuthService.register
          .mockReturnValueOnce(mockInmobiliaria), // Para InmobiliariaService.create
        save: jest.fn()
          .mockResolvedValueOnce(mockCuenta) // Para AuthService.register
          .mockResolvedValueOnce(mockInmobiliaria), // Para InmobiliariaService.create
      };

      mockInmobiliariaRepository.manager.transaction.mockImplementation(async (cb) => {
        return await cb(mockTransactionalEntityManager);
      });

      const result = await inmobiliariaService.create(mockCreateInmobiliariaDto, mockRegisterCuentaDto);

      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Cuenta, { where: { nombreUsuario: 'inmobiliaria' } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Cuenta, { where: { email: 'inmobiliaria@gmail.com' } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Inmobiliaria, { where: { direccion: mockCreateInmobiliariaDto.direccion } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Localidad, { where: { id: mockCreateInmobiliariaDto.localidad } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Cuenta, { where: { id: mockCreateInmobiliariaDto.cuenta } });
      expect(mockTransactionalEntityManager.create).toHaveBeenCalledWith(
        Inmobiliaria,
        expect.objectContaining({
          nombre: 'Inmobiliaria',
          direccion: 'Avenida Falsa 123',
          localidad: mockLocalidad,
          cuenta: mockCuenta,
        })
      );
      expect(mockTransactionalEntityManager.save).toHaveBeenCalledWith(mockInmobiliaria);
      expect(result).toEqual(mockInmobiliaria);
    });

    it('❌ Debería lanzar ConflictException si la inmobiliaria con la misma dirección ya existe', async () => {
      const mockTransactionalEntityManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce(null) // Nombre de usuario no existe
          .mockResolvedValueOnce(null) // Email no existe
          .mockResolvedValueOnce(mockInmobiliaria), // Inmobiliaria existe
        create: jest.fn().mockReturnValue(mockCuenta),
        save: jest.fn().mockResolvedValue(mockCuenta),
      };

      mockInmobiliariaRepository.manager.transaction.mockImplementation(async (cb) => {
        return await cb(mockTransactionalEntityManager);
      });

      await expect(inmobiliariaService.create(mockCreateInmobiliariaDto, mockRegisterCuentaDto)).rejects.toThrow(
        new ConflictException('La dirección ya existe')
      );
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Cuenta, { where: { nombreUsuario: 'inmobiliaria' } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Cuenta, { where: { email: 'inmobiliaria@gmail.com' } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Inmobiliaria, { where: { direccion: mockCreateInmobiliariaDto.direccion } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledTimes(3);
      expect(mockTransactionalEntityManager.create).not.toHaveBeenCalledWith(Inmobiliaria, expect.anything());
      expect(mockTransactionalEntityManager.save).not.toHaveBeenCalledWith(mockInmobiliaria);
    });

    it('❌ Debería lanzar NotFoundException si la localidad no existe', async () => {
      const mockTransactionalEntityManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce(null) // Nombre de usuario no existe
          .mockResolvedValueOnce(null) // Email no existe
          .mockResolvedValueOnce(null) // Inmobiliaria no existe
          .mockResolvedValueOnce(null), // Localidad no existe
        create: jest.fn().mockReturnValue(mockCuenta),
        save: jest.fn().mockResolvedValue(mockCuenta),
      };

      mockInmobiliariaRepository.manager.transaction.mockImplementation(async (cb) => {
        return await cb(mockTransactionalEntityManager);
      });

      await expect(inmobiliariaService.create(mockCreateInmobiliariaDto, mockRegisterCuentaDto)).rejects.toThrow(
        new NotFoundException(`Localidad con id ${mockCreateInmobiliariaDto.localidad} no existe`)
      );
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Cuenta, { where: { nombreUsuario: 'inmobiliaria' } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Cuenta, { where: { email: 'inmobiliaria@gmail.com' } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Inmobiliaria, { where: { direccion: mockCreateInmobiliariaDto.direccion } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Localidad, { where: { id: mockCreateInmobiliariaDto.localidad } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledTimes(4);
      expect(mockTransactionalEntityManager.create).not.toHaveBeenCalledWith(Inmobiliaria, expect.anything());
      expect(mockTransactionalEntityManager.save).not.toHaveBeenCalledWith(mockInmobiliaria);
    });

    it('❌ Debería lanzar NotFoundException si la cuenta no existe', async () => {
      const mockTransactionalEntityManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce(null) // Nombre de usuario no existe
          .mockResolvedValueOnce(null) // Email no existe
          .mockResolvedValueOnce(null) // Inmobiliaria no existe
          .mockResolvedValueOnce(mockLocalidad) // Localidad existe
          .mockResolvedValueOnce(null), // Cuenta no existe
        create: jest.fn().mockReturnValue(mockCuenta),
        save: jest.fn().mockResolvedValue(mockCuenta),
      };

      mockInmobiliariaRepository.manager.transaction.mockImplementation(async (cb) => {
        return await cb(mockTransactionalEntityManager);
      });

      await expect(inmobiliariaService.create(mockCreateInmobiliariaDto, mockRegisterCuentaDto)).rejects.toThrow(
        new NotFoundException(`Cuenta con id ${mockCreateInmobiliariaDto.cuenta} no existe`)
      );
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Cuenta, { where: { nombreUsuario: 'inmobiliaria' } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Cuenta, { where: { email: 'inmobiliaria@gmail.com' } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Inmobiliaria, { where: { direccion: mockCreateInmobiliariaDto.direccion } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Localidad, { where: { id: mockCreateInmobiliariaDto.localidad } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Cuenta, { where: { id: mockCreateInmobiliariaDto.cuenta } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledTimes(5);
      expect(mockTransactionalEntityManager.create).not.toHaveBeenCalledWith(Inmobiliaria, expect.anything());
      expect(mockTransactionalEntityManager.save).not.toHaveBeenCalledWith(mockInmobiliaria);
    });
  });
});