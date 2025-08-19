import { NotFoundException, ConflictException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Cuenta } from "src/auth/entities/cuenta.entity";
import { Repository } from "typeorm";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from 'bcrypt';
import { RegisterCuentaDto } from "src/auth/dto/register-cuenta.dto";
import { AuthService } from "src/auth/auth.service";
import { Cliente } from './entities/cliente.entity';
import { ClienteService } from './cliente.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Localidad } from 'src/localidad/entities/localidad.entity';
import { JwtService } from "@nestjs/jwt";
import { Inmobiliaria } from "src/inmobiliaria/entities/inmobiliaria.entity";

// Mock de la función de hash de bcrypt para evitar problemas de rendimiento
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

describe('Test de Integración', () => {
  let authService: AuthService;
  let clienteService: ClienteService;
  let cuentaRepository: Repository<Cuenta>;
  let clienteRepository: Repository<Cliente>;
  let localidadRepository: Repository<Localidad>;
  let inmobiliariaRepository: Repository<Inmobiliaria>;
  let jwtService: JwtService;

  // Mocks de datos y DTOs
  const mockRegisterCuentaDto: RegisterCuentaDto = {
    nombreUsuario: 'juanperez',
    email: 'juan@ejemplo.com',
    password: 'Password123!',
    rol: 'CLIENTE',
  };

  const mockCuenta = {
    id: 1,
    nombreUsuario: 'juanperez',
    email: 'juan@ejemplo.com',
    password: 'hashed_password',
    rol: 'CLIENTE',
    login: new Date(),
  };

  const mockLocalidad = { id: 1, nombre: 'Ciudad Ejemplo', codigoPostal: 12345, provincia: 1 };
  
  const mockCreateClienteDto: CreateClienteDto = {
    nombre: 'Juan',
    apellido: 'Perez',
    fechaNacimiento: new Date('1990-01-01'),
    direccion: 'Calle Falsa 123',
    localidad: 1,
    cuenta: 1,
  };
  
  // CORRECCIÓN: Agregamos la propiedad 'fechaNacimiento' al DTO de actualización
  const mockUpdateClienteDto: UpdateClienteDto = {
    nombre: 'Juan Carlos',
    fechaNacimiento: new Date('1990-01-01'),
  };

  const mockCliente = {
    id: 1,
    nombre: 'Juan',
    apellido: 'Perez',
    fechaNacimiento: new Date('1990-01-01'),
    direccion: 'Calle Falsa 123',
    localidad: mockLocalidad,
    cuenta: mockCuenta,
  };

  // Mocks de repositorios y servicios
  const mockCuentaRepository = {
    findOne: jest.fn(),
    create: jest.fn().mockReturnValue(mockCuenta),
    save: jest.fn().mockResolvedValue(mockCuenta),
  };

  const mockLocalidadRepository = {
    findOne: jest.fn(),
  };
  
  const mockClienteRepository = {
    manager: {
      transaction: jest.fn(async (cb) => {
        const transactionalEntityManager = {
          findOne: jest.fn(),
          create: jest.fn(),
          save: jest.fn(),
        };
        return await cb(transactionalEntityManager);
      }),
    },
    findOneBy: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
  
  const mockInmobiliariaRepository = {};
  const mockJwtService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        ClienteService,
        {
          provide: getRepositoryToken(Cuenta),
          useValue: mockCuentaRepository,
        },
        {
          provide: getRepositoryToken(Cliente),
          useValue: mockClienteRepository,
        },
        {
          provide: getRepositoryToken(Localidad),
          useValue: mockLocalidadRepository,
        },
        {
          provide: getRepositoryToken(Inmobiliaria),
          useValue: mockInmobiliariaRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    clienteService = module.get<ClienteService>(ClienteService);
    cuentaRepository = module.get<Repository<Cuenta>>(getRepositoryToken(Cuenta));
    clienteRepository = module.get<Repository<Cliente>>(getRepositoryToken(Cliente));
    localidadRepository = module.get<Repository<Localidad>>(getRepositoryToken(Localidad));
    inmobiliariaRepository = module.get<Repository<Inmobiliaria>>(getRepositoryToken(Inmobiliaria));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthService.register cliente', () => {
    it('✅ Debería registrar una nueva cuenta con éxito', async () => {
      mockCuentaRepository.findOne.mockResolvedValue(null);
      const result = await authService.register(mockRegisterCuentaDto);
      expect(mockCuentaRepository.findOne).toHaveBeenCalledWith({ where: { nombreUsuario: 'juanperez' } });
      expect(mockCuentaRepository.findOne).toHaveBeenCalledWith({ where: { email: 'juan@ejemplo.com' } });
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
      expect(mockCuentaRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        nombreUsuario: 'juanperez',
        email: 'juan@ejemplo.com',
        password: 'hashed_password',
      }));
      expect(mockCuentaRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockCuenta);
    });

    it('❌ Debería lanzar NotFoundException si el nombre de usuario ya existe', async () => {
      mockCuentaRepository.findOne.mockResolvedValueOnce(mockCuenta);
      await expect(authService.register(mockRegisterCuentaDto)).rejects.toThrow(
        new NotFoundException('El nombre de usuario ya está en uso')
      );
      expect(mockCuentaRepository.findOne).toHaveBeenCalledWith({ where: { nombreUsuario: 'juanperez' } });
      expect(mockCuentaRepository.findOne).not.toHaveBeenCalledWith({ where: { email: 'juan@ejemplo.com' } });
      expect(mockCuentaRepository.save).not.toHaveBeenCalled();
    });

    it('❌ Debería lanzar NotFoundException si el email ya existe', async () => {
      mockCuentaRepository.findOne.mockResolvedValueOnce(null);
      mockCuentaRepository.findOne.mockResolvedValueOnce(mockCuenta);
      await expect(authService.register(mockRegisterCuentaDto)).rejects.toThrow(
        new NotFoundException('El email ya está en uso')
      );
      expect(mockCuentaRepository.findOne).toHaveBeenCalledWith({ where: { nombreUsuario: 'juanperez' } });
      expect(mockCuentaRepository.findOne).toHaveBeenCalledWith({ where: { email: 'juan@ejemplo.com' } });
      expect(mockCuentaRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('ClienteService.create', () => {
    it('✅ Debería crear un nuevo cliente con éxito', async () => {
      const mockTransactionalEntityManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(mockLocalidad)
          .mockResolvedValueOnce(mockCuenta),
        create: jest.fn().mockReturnValue(mockCliente),
        save: jest.fn().mockResolvedValue(mockCliente),
      };
      mockClienteRepository.manager.transaction.mockImplementation(async (cb) => {
        return await cb(mockTransactionalEntityManager);
      });

      const result = await clienteService.create(mockCreateClienteDto);
      
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Cliente, expect.objectContaining({ where: {
        nombre: mockCreateClienteDto.nombre,
        apellido: mockCreateClienteDto.apellido,
        fechaNacimiento: mockCreateClienteDto.fechaNacimiento,
        direccion: mockCreateClienteDto.direccion,
        localidad: { id: mockCreateClienteDto.localidad },
        cuenta: { id: mockCreateClienteDto.cuenta },
      }}));
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Localidad, { where: { id: mockCreateClienteDto.localidad } });
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Cuenta, { where: { id: mockCreateClienteDto.cuenta } });
      expect(mockTransactionalEntityManager.create).toHaveBeenCalledWith(Cliente, expect.objectContaining({
        nombre: 'Juan',
        apellido: 'Perez',
        fechaNacimiento: new Date('1990-01-01'),
        direccion: 'Calle Falsa 123',
        localidad: mockLocalidad,
        cuenta: mockCuenta,
      }));
      expect(mockTransactionalEntityManager.save).toHaveBeenCalled();
      expect(result).toEqual(mockCliente);
    });

    it('❌ Debería lanzar NotFoundException si el cliente ya existe', async () => {
      const mockTransactionalEntityManager = {
        findOne: jest.fn().mockResolvedValue(mockCliente),
        create: jest.fn(),
        save: jest.fn(),
      };
      mockClienteRepository.manager.transaction.mockImplementation(async (cb) => {
        return await cb(mockTransactionalEntityManager);
      });

      await expect(clienteService.create(mockCreateClienteDto)).rejects.toThrow(
        new NotFoundException('El cliente ya existe')
      );
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(Cliente, expect.any(Object));
      expect(mockTransactionalEntityManager.create).not.toHaveBeenCalled();
      expect(mockTransactionalEntityManager.save).not.toHaveBeenCalled();
    });

    it('❌ Debería lanzar NotFoundException si la localidad no existe', async () => {
      const mockTransactionalEntityManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
        create: jest.fn(),
        save: jest.fn(),
      };
      mockClienteRepository.manager.transaction.mockImplementation(async (cb) => {
        return await cb(mockTransactionalEntityManager);
      });

      await expect(clienteService.create(mockCreateClienteDto)).rejects.toThrow(
        new NotFoundException(`Localidad con id ${mockCreateClienteDto.localidad} no existe`)
      );
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledTimes(2);
      expect(mockTransactionalEntityManager.create).not.toHaveBeenCalled();
      expect(mockTransactionalEntityManager.save).not.toHaveBeenCalled();
    });

    it('❌ Debería lanzar NotFoundException si la cuenta no existe', async () => {
      const mockTransactionalEntityManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(mockLocalidad)
          .mockResolvedValueOnce(null),
        create: jest.fn(),
        save: jest.fn(),
      };
      mockClienteRepository.manager.transaction.mockImplementation(async (cb) => {
        return await cb(mockTransactionalEntityManager);
      });

      await expect(clienteService.create(mockCreateClienteDto)).rejects.toThrow(
        new NotFoundException(`Cuenta con id ${mockCreateClienteDto.cuenta} no existe`)
      );
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledTimes(3);
      expect(mockTransactionalEntityManager.create).not.toHaveBeenCalled();
      expect(mockTransactionalEntityManager.save).not.toHaveBeenCalled();
    });

    it('❌ Debería lanzar NotFoundException si hay un error al crear el cliente', async () => {
      const mockTransactionalEntityManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(mockLocalidad)
          .mockResolvedValueOnce(mockCuenta),
        create: jest.fn().mockReturnValue(null),
        save: jest.fn(),
      };
      mockClienteRepository.manager.transaction.mockImplementation(async (cb) => {
        return await cb(mockTransactionalEntityManager);
      });

      await expect(clienteService.create(mockCreateClienteDto)).rejects.toThrow(
        new NotFoundException('Error al crear el cliente')
      );
      expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledTimes(3);
      expect(mockTransactionalEntityManager.create).toHaveBeenCalledWith(Cliente, expect.any(Object));
      expect(mockTransactionalEntityManager.save).not.toHaveBeenCalled();
    });
  });

  describe('ClienteService.findAll', () => {
    it('✅ Debería devolver un array de clientes', async () => {
      const mockClientes = [mockCliente];
      mockClienteRepository.find.mockResolvedValue(mockClientes);
      const result = await clienteService.findAll();
      expect(mockClienteRepository.find).toHaveBeenCalledWith({ relations: ['cuenta'] });
      expect(result).toEqual(mockClientes);
    });

    it('❌ Debería lanzar NotFoundException si no se encuentran clientes', async () => {
      mockClienteRepository.find.mockResolvedValue([]);
      await expect(clienteService.findAll()).rejects.toThrow(NotFoundException);
      expect(mockClienteRepository.find).toHaveBeenCalledWith({ relations: ['cuenta'] });
    });
  });

  describe('ClienteService.findOne', () => {
    it('✅ Debería devolver un cliente por su ID', async () => {
      mockClienteRepository.findOneBy.mockResolvedValue(mockCliente);
      const result = await clienteService.findOne(1);
      expect(mockClienteRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(mockCliente);
    });

    it('❌ Debería lanzar NotFoundException si el cliente no existe', async () => {
      mockClienteRepository.findOneBy.mockResolvedValue(null);
      await expect(clienteService.findOne(999)).rejects.toThrow(NotFoundException);
      expect(mockClienteRepository.findOneBy).toHaveBeenCalledWith({ id: 999 });
    });
  });

  describe('ClienteService.update', () => {
    it('✅ Debería actualizar un cliente por su ID', async () => {
      mockClienteRepository.findOneBy.mockResolvedValue(mockCliente);
      mockClienteRepository.save.mockResolvedValue({ ...mockCliente, nombre: 'Juan Carlos', fechaNacimiento: new Date() });
      const result = await clienteService.update(1, mockUpdateClienteDto);
      expect(clienteRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(clienteRepository.save).toHaveBeenCalledWith({ ...mockCliente, nombre: 'Juan Carlos', fechaNacimiento: mockUpdateClienteDto.fechaNacimiento });
      expect(result.nombre).toEqual('Juan Carlos');
    });

    it('❌ Debería lanzar NotFoundException si el cliente a actualizar no existe', async () => {
      mockClienteRepository.findOneBy.mockResolvedValue(null);
      await expect(clienteService.update(999, mockUpdateClienteDto)).rejects.toThrow(NotFoundException);
      expect(mockClienteRepository.findOneBy).toHaveBeenCalledWith({ id: 999 });
      expect(mockClienteRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('ClienteService.remove', () => {
    it('✅ Debería eliminar un cliente por su ID', async () => {
      mockClienteRepository.findOneBy.mockResolvedValue(mockCliente);
      mockClienteRepository.remove.mockResolvedValue(undefined);
      await clienteService.remove(1);
      expect(mockClienteRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockClienteRepository.remove).toHaveBeenCalledWith(mockCliente);
    });

    it('❌ Debería lanzar NotFoundException si el cliente a eliminar no existe', async () => {
      mockClienteRepository.findOneBy.mockResolvedValue(null);
      await expect(clienteService.remove(999)).rejects.toThrow(NotFoundException);
      expect(mockClienteRepository.findOneBy).toHaveBeenCalledWith({ id: 999 });
      expect(mockClienteRepository.remove).not.toHaveBeenCalled();
    });
  });
});
