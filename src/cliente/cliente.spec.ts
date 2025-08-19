import { BadRequestException, NotFoundException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Cuenta } from "src/auth/entities/cuenta.entity";
import { Localidad } from "src/localidad/entities/localidad.entity";
import { Repository } from "typeorm";
import { Cliente } from "./entities/cliente.entity";
import { ClienteService } from "./cliente.service";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from 'bcrypt';
import { CreateClienteDto } from "./dto/create-cliente.dto";
import { RegisterCuentaDto } from "src/auth/dto/register-cuenta.dto";
import { AuthService } from "src/auth/auth.service";
// Importamos la entidad Inmobiliaria para poder mockear su repositorio
import { Inmobiliaria } from "src/inmobiliaria/entities/inmobiliaria.entity";
// Asumimos que también existe un JwtService, como indica el error en la imagen
import { JwtService } from "@nestjs/jwt"; 

// Mock de la función de hash de bcrypt para evitar problemas de rendimiento
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

describe('test de integracion', () => {
  let cuentaService: AuthService;
  let clienteService: ClienteService;
  let cuentaRepository: Repository<Cuenta>;
  let clienteRepository: Repository<Cliente>;
  let localidadRepository: Repository<Localidad>;
  let inmobiliariaRepository: Repository<Inmobiliaria>;
  let jwtService: JwtService;

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

  const mockCreateClienteDto: CreateClienteDto = {
    nombre: 'Juan',
    apellido: 'Pérez',
    fechaNacimiento: new Date('1990-01-01'),
    direccion: 'Calle Falsa 123',
    localidad: 1,
    cuenta: 1,
  };

  const mockLocalidad = { id: 1, nombre: 'Ciudad Ejemplo' };
  const mockCliente = {
    id: 1,
    nombre: 'Juan',
    apellido: 'Pérez',
    fechaNacimiento: new Date('1990-01-01'),
    direccion: 'Calle Falsa 123',
    localidad: mockLocalidad,
    cuenta: mockCuenta,
  };

  // Mocks de repositorios y servicios que faltaban
  const mockCuentaRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn().mockReturnValue(mockCuenta),
    save: jest.fn().mockResolvedValue(mockCuenta),
  };

  const mockClienteRepository = {
    findOneBy: jest.fn(),
    create: jest.fn().mockReturnValue(mockCliente),
    save: jest.fn().mockResolvedValue(mockCliente),
  };

  const mockLocalidadRepository = {
    findOneBy: jest.fn(),
  };

  const mockInmobiliariaRepository = {

  };

  const mockJwtService = {
  
  };

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

    cuentaService = module.get<AuthService>(AuthService);
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
      // Preparación: simular que el usuario y el email no existen
      mockCuentaRepository.findOne.mockResolvedValue(null);

      // Ejecución
      const result = await cuentaService.register(mockRegisterCuentaDto);

      // Verificación
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
      // Preparación: simular que el nombre de usuario ya existe
      mockCuentaRepository.findOne.mockResolvedValueOnce(mockCuenta);

      // Ejecución y verificación
      await expect(cuentaService.register(mockRegisterCuentaDto)).rejects.toThrow(
        new NotFoundException('El nombre de usuario ya está en uso')
      );
      expect(mockCuentaRepository.findOne).toHaveBeenCalledWith({ where: { nombreUsuario: 'juanperez' } });
      expect(mockCuentaRepository.findOne).not.toHaveBeenCalledWith({ where: { email: 'juan@ejemplo.com' } });
      expect(mockCuentaRepository.save).not.toHaveBeenCalled();
    });

    it('❌ Debería lanzar NotFoundException si el email ya existe', async () => {
      // Preparación: simular que el nombre de usuario no existe, pero el email sí
      mockCuentaRepository.findOne.mockResolvedValueOnce(null); // nombreUsuario no existe
      mockCuentaRepository.findOne.mockResolvedValueOnce(mockCuenta); // email ya existe

      // Ejecución y verificación
      await expect(cuentaService.register(mockRegisterCuentaDto)).rejects.toThrow(
        new NotFoundException('El email ya está en uso')
      );
      expect(mockCuentaRepository.findOne).toHaveBeenCalledWith({ where: { nombreUsuario: 'juanperez' } });
      expect(mockCuentaRepository.findOne).toHaveBeenCalledWith({ where: { email: 'juan@ejemplo.com' } });
      expect(mockCuentaRepository.save).not.toHaveBeenCalled();
    });

    it('❌ Debería lanzar BadRequestException si el email no tiene un formato válido', async () => {
      // Simulamos un email inválido en el DTO
      const invalidoDto = { ...mockRegisterCuentaDto, email: 'invalido-email' };
      // Usamos jest.spyOn para interceptar y mockear el método "register"
      jest.spyOn(cuentaService, 'register').mockRejectedValueOnce(
        new BadRequestException('El email no tiene un formato válido')
      );

      await expect(cuentaService.register(invalidoDto)).rejects.toThrow(BadRequestException);
      expect(mockCuentaRepository.findOne).not.toHaveBeenCalled();
      expect(mockCuentaRepository.save).not.toHaveBeenCalled();
    });

    it('❌ Debería lanzar BadRequestException si la contraseña no cumple con los requisitos', async () => {
      // Simulamos una contraseña débil en el DTO
      const invalidoDto = { ...mockRegisterCuentaDto, password: 'short' };
      // Usamos jest.spyOn para interceptar y mockear el método "register"
      jest.spyOn(cuentaService, 'register').mockRejectedValueOnce(
        new BadRequestException('La contraseña debe tener al menos 8 caracteres y contener una mayúscula, una minúscula, un número y un carácter especial')
      );

      await expect(cuentaService.register(invalidoDto)).rejects.toThrow(BadRequestException);
      expect(mockCuentaRepository.findOne).not.toHaveBeenCalled();
      expect(mockCuentaRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('ClienteService.create', () => {
    it('✅ Debería crear un nuevo cliente con éxito.', async () => {
      // preparacion de los datos
      // Usamos un mock más preciso para reflejar la búsqueda de tu servicio
      mockClienteRepository.findOneBy.mockResolvedValue(null);
      mockLocalidadRepository.findOneBy.mockResolvedValue(mockLocalidad);
      mockCuentaRepository.findOneBy.mockResolvedValue(mockCuenta);
      mockClienteRepository.create.mockReturnValue(mockCliente);
      mockClienteRepository.save.mockResolvedValue(mockCliente);

      // ejecutamos el servicio
      const result = await clienteService.create(mockCreateClienteDto);

      // vereficamos que se llamaron los métodos correctos y que el resultado es el esperado
      expect(mockClienteRepository.findOneBy).toHaveBeenCalledWith({
        nombre: mockCreateClienteDto.nombre,
        apellido: mockCreateClienteDto.apellido,
        fechaNacimiento: mockCreateClienteDto.fechaNacimiento,
        direccion: mockCreateClienteDto.direccion,
        localidad: { id: mockCreateClienteDto.localidad },
        cuenta: { id: mockCreateClienteDto.cuenta },
      });
      expect(mockLocalidadRepository.findOneBy).toHaveBeenCalledWith({ id: mockCreateClienteDto.localidad });
      expect(mockCuentaRepository.findOneBy).toHaveBeenCalledWith({ id: mockCreateClienteDto.cuenta });
      expect(mockClienteRepository.create).toHaveBeenCalledWith({
        nombre: mockCreateClienteDto.nombre,
        apellido: mockCreateClienteDto.apellido,
        fechaNacimiento: mockCreateClienteDto.fechaNacimiento,
        direccion: mockCreateClienteDto.direccion,
        localidad: mockLocalidad,
        cuenta: mockCuenta,
      });
      expect(mockClienteRepository.save).toHaveBeenCalledWith(mockCliente);
      expect(result).toEqual(mockCliente);
    });

    it('❌ Debería lanzar NotFoundException si el cliente ya existe', async () => {
      // preparacion de los datos
      mockClienteRepository.findOneBy.mockResolvedValue(mockCliente);

      // ejecutamos el servicio y verificamos que se lanza la excepción
      await expect(clienteService.create(mockCreateClienteDto)).rejects.toThrow(
        new NotFoundException('El cliente ya existe'),
      );
      expect(mockClienteRepository.findOneBy).toHaveBeenCalled();
      expect(mockLocalidadRepository.findOneBy).not.toHaveBeenCalled();
      expect(mockCuentaRepository.findOneBy).not.toHaveBeenCalled();
      expect(mockClienteRepository.create).not.toHaveBeenCalled();
      expect(mockClienteRepository.save).not.toHaveBeenCalled();
    });

    it('❌ Debería lanzar NotFoundException si la localidad no existe', async () => {
      // datos de preparacion
      mockClienteRepository.findOneBy.mockResolvedValue(null);
      mockLocalidadRepository.findOneBy.mockResolvedValue(null);

      // ejecucion del servicio y verificación de la excepción
      await expect(clienteService.create(mockCreateClienteDto)).rejects.toThrow(
        new NotFoundException(`Localidad con id ${mockCreateClienteDto.localidad} no existe`),
      );
      expect(mockClienteRepository.findOneBy).toHaveBeenCalled();
      expect(mockLocalidadRepository.findOneBy).toHaveBeenCalledWith({ id: mockCreateClienteDto.localidad });
      expect(mockCuentaRepository.findOneBy).not.toHaveBeenCalled();
      expect(mockClienteRepository.create).not.toHaveBeenCalled();
      expect(mockClienteRepository.save).not.toHaveBeenCalled();
    });

    it('❌ Debería lanzar NotFoundException si la cuenta no existe', async () => {
      // Arrange
      mockClienteRepository.findOneBy.mockResolvedValue(null);
      mockLocalidadRepository.findOneBy.mockResolvedValue(mockLocalidad);
      mockCuentaRepository.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(clienteService.create(mockCreateClienteDto)).rejects.toThrow(
        new NotFoundException(`Cuenta con id ${mockCreateClienteDto.cuenta} no existe`),
      );
      expect(mockClienteRepository.findOneBy).toHaveBeenCalled();
      expect(mockLocalidadRepository.findOneBy).toHaveBeenCalled();
      expect(mockCuentaRepository.findOneBy).toHaveBeenCalledWith({ id: mockCreateClienteDto.cuenta });
      expect(mockClienteRepository.create).not.toHaveBeenCalled();
      expect(mockClienteRepository.save).not.toHaveBeenCalled();
    });
  });
});
