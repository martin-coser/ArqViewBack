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

  const mockInmobiliariaRepository = {
    findOneBy: jest.fn(),
    create: jest.fn().mockReturnValue(mockInmobiliaria),
    save: jest.fn().mockResolvedValue(mockInmobiliaria),
  };

  const mockClienteRepository = {
    findOneBy: jest.fn(),
  };
  
  const mockLocalidadRepository = {
    findOne: jest.fn(),
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
    // Obtener instancias de los servicios y repositorios
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
      mockInmobiliariaRepository.findOneBy.mockResolvedValue(null); // Dirección no existe
      mockLocalidadRepository.findOne.mockResolvedValue(mockLocalidad); // Localidad existe
      mockCuentaRepository.findOne.mockResolvedValue(mockCuenta); // Cuenta existe

      const result = await inmobiliariaService.create(mockCreateInmobiliariaDto);
      
      // Verifica que se hayan llamado los métodos correctos con los parámetros correctos
      expect(mockInmobiliariaRepository.findOneBy).toHaveBeenCalledWith({ direccion: mockCreateInmobiliariaDto.direccion });
      expect(mockLocalidadRepository.findOne).toHaveBeenCalledWith({ where: { id: mockCreateInmobiliariaDto.localidad } });
      expect(mockCuentaRepository.findOne).toHaveBeenCalledWith({ where: { id: mockCreateInmobiliariaDto.cuenta } });
      expect(mockInmobiliariaRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        nombre: 'Inmobiliaria',
        direccion: 'Avenida Falsa 123',
        localidad: mockLocalidad,
        cuenta: mockCuenta,
      }));
      expect(mockInmobiliariaRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockInmobiliaria);
    });

    it('❌ Debería lanzar ConflictException si ya existe una inmobiliaria con esa dirección', async () => {
      mockInmobiliariaRepository.findOneBy.mockResolvedValue(mockInmobiliaria); // Dirección ya existe

      await expect(inmobiliariaService.create(mockCreateInmobiliariaDto)).rejects.toThrow(
        new ConflictException('La dirección ya existe')
      );
      expect(mockInmobiliariaRepository.findOneBy).toHaveBeenCalledWith({ direccion: mockCreateInmobiliariaDto.direccion });
      expect(mockInmobiliariaRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(mockLocalidadRepository.findOne).not.toHaveBeenCalled();
      expect(mockCuentaRepository.findOne).not.toHaveBeenCalled();
      expect(mockInmobiliariaRepository.save).not.toHaveBeenCalled();
    });

    it('❌ Debería lanzar NotFoundException si la localidad no existe', async () => {
      mockInmobiliariaRepository.findOneBy.mockResolvedValue(null); // Dirección no existe
      mockLocalidadRepository.findOne.mockResolvedValue(null); // Localidad no existe

      await expect(inmobiliariaService.create(mockCreateInmobiliariaDto)).rejects.toThrow(
        new NotFoundException(`Localidad con id ${mockCreateInmobiliariaDto.localidad} no existe`)
      );
      expect(mockInmobiliariaRepository.findOneBy).toHaveBeenCalledWith({ direccion: mockCreateInmobiliariaDto.direccion });
      expect(mockLocalidadRepository.findOne).toHaveBeenCalledWith({ where: { id: mockCreateInmobiliariaDto.localidad } });
      expect(mockLocalidadRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockCuentaRepository.findOne).not.toHaveBeenCalled();
      expect(mockInmobiliariaRepository.create).not.toHaveBeenCalled();
      expect(mockInmobiliariaRepository.save).not.toHaveBeenCalled();
    });

    it('❌ Debería lanzar NotFoundException si la cuenta no existe', async () => {
      mockInmobiliariaRepository.findOneBy.mockResolvedValue(null); // Dirección no existe
      mockLocalidadRepository.findOne.mockResolvedValue(mockLocalidad); // Localidad existe
      mockCuentaRepository.findOne.mockResolvedValue(null); // Cuenta no existe

      await expect(inmobiliariaService.create(mockCreateInmobiliariaDto)).rejects.toThrow(
        new NotFoundException(`Cuenta con id ${mockCreateInmobiliariaDto.cuenta} no existe`)
      );
      expect(mockInmobiliariaRepository.findOneBy).toHaveBeenCalledWith({ direccion: mockCreateInmobiliariaDto.direccion });
      expect(mockLocalidadRepository.findOne).toHaveBeenCalledWith({ where: { id: mockCreateInmobiliariaDto.localidad } });
      expect(mockCuentaRepository.findOne).toHaveBeenCalledWith({ where: { id: mockCreateInmobiliariaDto.cuenta } });
      expect(mockInmobiliariaRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(mockLocalidadRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockCuentaRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockInmobiliariaRepository.save).not.toHaveBeenCalled();
    });
  });
});