import { NotFoundException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Cuenta } from "src/auth/entities/cuenta.entity";
import { Localidad } from "src/localidad/entities/localidad.entity";
import { Repository } from "typeorm";
import { Cliente } from "./entities/cliente.entity";
import { ClienteService } from "./cliente.service";
import { Test, TestingModule } from "@nestjs/testing";
import { CreateClienteDto } from "./dto/create-cliente.dto";

describe('ClienteService', () => {
  let service: ClienteService;
  let clienteRepository: Repository<Cliente>;
  let localidadRepository: Repository<Localidad>;
  let cuentaRepository: Repository<Cuenta>;

  const mockCliente = {
    id: 1,
    nombre: 'Juan',
    apellido: 'Pérez',
    fechaNacimiento: new Date('1990-01-01'),
    direccion: 'Calle Falsa 123',
    localidad: { id: 1 },
    cuenta: { id: 1 },
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
  const mockCuenta = { id: 1, email: 'juan@example.com' };

  const mockClienteRepository = {
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockLocalidadRepository = {
    findOneBy: jest.fn(),
  };

  const mockCuentaRepository = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClienteService,
        {
          provide: getRepositoryToken(Cliente),
          useValue: mockClienteRepository,
        },
        {
          provide: getRepositoryToken(Localidad),
          useValue: mockLocalidadRepository,
        },
        {
          provide: getRepositoryToken(Cuenta),
          useValue: mockCuentaRepository,
        },
      ],
    }).compile();

    service = module.get<ClienteService>(ClienteService);
    clienteRepository = module.get<Repository<Cliente>>(getRepositoryToken(Cliente));
    localidadRepository = module.get<Repository<Localidad>>(getRepositoryToken(Localidad));
    cuentaRepository = module.get<Repository<Cuenta>>(getRepositoryToken(Cuenta));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('Debería crear un nuevo cliente con éxito.', async () => {
      // preparacion de los datos
      mockClienteRepository.findOneBy.mockResolvedValue(null); // No existe cliente
      mockLocalidadRepository.findOneBy.mockResolvedValue(mockLocalidad); // Localidad existe
      mockCuentaRepository.findOneBy.mockResolvedValue(mockCuenta); // Cuenta existe
      mockClienteRepository.create.mockReturnValue(mockCliente); // Simula la creación del cliente
      mockClienteRepository.save.mockResolvedValue(mockCliente);// Simula el guardado del cliente

      // ejecutamos el servicio
      const result = await service.create(mockCreateClienteDto);

      // vereficamos que se llamaron los métodos correctos y que el resultado es el esperado
      //verifico que el findOneBy, create y save fue llamado con los datos correctos
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

    it('Debería lanzar NotFoundException si el cliente ya existe', async () => {
      // preparacion de los datos
      mockClienteRepository.findOneBy.mockResolvedValue(mockCliente); // Cliente ya existe

      // ejecuttamos el servicio y verificamos que se lanza la excepción
      await expect(service.create(mockCreateClienteDto)).rejects.toThrow(
        new NotFoundException('El cliente ya existe'),
      );
      expect(mockClienteRepository.findOneBy).toHaveBeenCalled();
      expect(mockLocalidadRepository.findOneBy).not.toHaveBeenCalled();
      expect(mockCuentaRepository.findOneBy).not.toHaveBeenCalled();
      expect(mockClienteRepository.create).not.toHaveBeenCalled();
      expect(mockClienteRepository.save).not.toHaveBeenCalled();
    });

    it('Debería lanzar NotFoundException si la localidad no existe', async () => {
      // datos de preparacion
      mockClienteRepository.findOneBy.mockResolvedValue(null); // No existe cliente
      mockLocalidadRepository.findOneBy.mockResolvedValue(null); // Localidad no existe

      // ejecucuion del servicio y verificación de la excepción
      await expect(service.create(mockCreateClienteDto)).rejects.toThrow(
        new NotFoundException(`Localidad con id ${mockCreateClienteDto.localidad} no existe`),
      );
      expect(mockClienteRepository.findOneBy).toHaveBeenCalled();
      expect(mockLocalidadRepository.findOneBy).toHaveBeenCalledWith({ id: mockCreateClienteDto.localidad });
      expect(mockCuentaRepository.findOneBy).not.toHaveBeenCalled();
      expect(mockClienteRepository.create).not.toHaveBeenCalled();
      expect(mockClienteRepository.save).not.toHaveBeenCalled();
    });

    it('Debería lanzar NotFoundException si la cuenta no existe', async () => {
      // Arrange
      mockClienteRepository.findOneBy.mockResolvedValue(null); // No existe cliente
      mockLocalidadRepository.findOneBy.mockResolvedValue(mockLocalidad); // Localidad existe
      mockCuentaRepository.findOneBy.mockResolvedValue(null); // Cuenta no existe

      // Act & Assert
      await expect(service.create(mockCreateClienteDto)).rejects.toThrow(
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