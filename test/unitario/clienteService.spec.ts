import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ClienteService } from '../../src/cliente/cliente.service';
import { CreateClienteDto } from '../../src/cliente/dto/create-cliente.dto';
import { RegisterCuentaDto } from '../../src/auth/dto/register-cuenta.dto';
import { Cliente } from '../../src/cliente/entities/cliente.entity';
import { Localidad } from '../../src/localidad/entities/localidad.entity';
import { Cuenta } from '../../src/auth/entities/cuenta.entity';
import { AuthService } from '../../src/auth/auth.service';




import { NotFoundException } from '@nestjs/common';

// --- Mocks de Datos ---

const mockLocalidadId = 15;
const mockCuentaId = 100;

// Datos de entrada para crear un cliente
const mockCreateClienteDto: CreateClienteDto = {
    nombre: 'Ana',
    apellido: 'Gomez',
    fechaNacimiento: '1990-01-01' as any,
    direccion: 'Calle Falsa 123',
    localidad: mockLocalidadId,
};
 
// Datos de entrada para crear una cuenta
const mockRegisterCuentaDto: RegisterCuentaDto = {
    nombreUsuario: 'ana.gomez',
    email: 'ana.gomez@test.com',
    password: 'PasswordSegura123',
    rol: 'CLIENTE',
};
// Objetos simulados que representan las entidades creadas
const mockCuentaCreada: Cuenta = {
    id: mockCuentaId,
    email: mockRegisterCuentaDto.email,
    rol: mockRegisterCuentaDto.rol,
    password: 'hashedPassword',
} as Cuenta; // Usamos 'as Cuenta' para simplificar las propiedades no relevantes

// Localidad simulada encontrada
const mockLocalidadEncontrada: Localidad = {
    id: mockLocalidadId,
    nombre: 'Córdoba',
} as Localidad;

// Cliente simulado creado
const mockClienteCreado: Cliente = {
    id: 1,
    nombre: mockCreateClienteDto.nombre,
    apellido: mockCreateClienteDto.apellido,
    fechaNacimiento: new Date(mockCreateClienteDto.fechaNacimiento),
    direccion: mockCreateClienteDto.direccion,
    cuenta: mockCuentaCreada,
    localidad: mockLocalidadEncontrada,
};


// --- Mocks de Dependencias ---

// 1. Mock de Repositorio (simulamos el repositorio principal de Cliente)
const mockClienteRepository = {
    manager: {
        // Este es el punto clave: mockear el método transaction del EntityManager
        transaction: jest.fn(), 
    } as unknown as EntityManager, 
};

const mockLocalidadRepository = {
    findOne: jest.fn(),
};

const mockCuentaRepository = { };

// 2. Mock del AuthService
const mockAuthService = {
    register: jest.fn(),
};

describe('ClienteService (Unit)', () => {
    let service: ClienteService;
    let authService: AuthService;
    let clienteRepository: Repository<Cliente>;
    let localidadRepository: Repository<Localidad>; // Lo necesitamos para el token, aunque se usa dentro de la transacción

    // Configuración del módulo de pruebas
    beforeEach(async () => {
        // Crear el módulo de pruebas con los proveedores necesarios
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ClienteService,
                {
                    provide: getRepositoryToken(Cliente),
                    useValue: mockClienteRepository,
                },
                {
                    provide: getRepositoryToken(Localidad),
                    useValue: {mockLocalidadRepository},
                },
                {
                    provide: getRepositoryToken(Cuenta),
                    useValue: {mockCuentaRepository},
                },
                // Mock del AuthService para inyectarlo y espiar sus métodos para las pruebas
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
            ],
        }).compile();

        //obtener instancias de los servicios y repositorios
        service = module.get<ClienteService>(ClienteService);
        authService = module.get<AuthService>(AuthService);
        //el getRepositoryToken nos permite obtener el repositorio mockeado 
        clienteRepository = module.get<Repository<Cliente>>(getRepositoryToken(Cliente));
        localidadRepository = module.get<Repository<Localidad>>(getRepositoryToken(Localidad));

        // Limpiar Mocks antes de cada prueba
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('debería crear un cliente exitosamente dentro de una transacción', async () => {
            
            // Configurar los Mocks para la Transacción
            // Creamos un Mock del EntityManager transaccional que contendrá los spies.
            //sirve para simular las operaciones dentro de la transacción
            const transactionalEntityManager = {
                findOne: jest.fn().mockResolvedValue(mockLocalidadEncontrada), // Simula encontrar Localidad
                create: jest.fn().mockReturnValue(mockClienteCreado),           // Simula crear el objeto Cliente
                save: jest.fn().mockResolvedValue(mockClienteCreado),           // Simula guardar el Cliente
            } as unknown as EntityManager;
            
            // Configurar el Mock del AuthService para devolver la cuenta
            // Simulamos que el registro de la cuenta es exitoso y devuelve la cuenta creada
            //el jest.spyOn permite espiar el método 'register' del authService
            //el mockResolvedValue hace que devuelva una promesa resuelta con el valor dado
            jest.spyOn(authService, 'register').mockResolvedValue(mockCuentaCreada);
            
            // 3. Configurar el Mock de la Transacción del ClienteRepository
            // Hacemos que la función 'transaction' ejecute inmediatamente el callback
            // sirve para simular el comportamiento de TypeORM al iniciar una transacción
            (clienteRepository.manager.transaction as jest.Mock).mockImplementation(
                async (callback) => {
                    return callback(transactionalEntityManager);
                }
            );
            // Ahora estamos listos para ejecutar la prueba

            // 4. Ejecutar el método a probar
            const result = await service.create(mockCreateClienteDto, mockRegisterCuentaDto);

            // 5. Verificaciones
            
            // Se debe llamar a la transacción
            //el metodo transaction del EntityManager del clienteRepository debe ser llamado una vez 
            expect(clienteRepository.manager.transaction).toHaveBeenCalledTimes(1);

            // Se debe llamar al registro de la cuenta
            expect(authService.register).toHaveBeenCalledWith(
                mockRegisterCuentaDto, 
                transactionalEntityManager // Verifica que se pase el EntityManager transaccional para que la creación de la cuenta también sea parte de la transacción
            );
            
            // Se debe buscar la localidad dentro de la transacción
            // Verifica que se haya llamado a findOne con la entidad Localidad y el ID correcto
            expect(transactionalEntityManager.findOne).toHaveBeenCalledWith(Localidad,{ where: { id: mockCreateClienteDto.localidad } },);

            // Se debe crear la entidad Cliente
            const expectedClienteData = {
                ...mockCreateClienteDto,
                localidad: mockLocalidadEncontrada,
                cuenta: mockCuentaCreada,
            };
            expect(transactionalEntityManager.create).toHaveBeenCalledWith(
                Cliente,
                expect.objectContaining(expectedClienteData)
            );
            
            // Se debe guardar el cliente
            expect(transactionalEntityManager.save).toHaveBeenCalledWith(mockClienteCreado);
            
            // Se debe retornar el objeto creado
            expect(result).toEqual(mockClienteCreado);
        });
        
        // --- TEST DE FALLA: Localidad no encontrada ---
        it('debería lanzar NotFoundException si la localidad no existe', async () => {
            
            // 1. Configurar Mocks para la Transacción de Falla
            const transactionalEntityManager = {
                // Simula que no se encuentra la localidad
                findOne: jest.fn().mockResolvedValue(null), 
                create: jest.fn(),
                save: jest.fn(),
            } as unknown as EntityManager;
            
            jest.spyOn(authService, 'register').mockResolvedValue(mockCuentaCreada);
            
            // 2. Configurar el Mock de la Transacción
            (clienteRepository.manager.transaction as jest.Mock).mockImplementation(
                async (callback) => {
                    return callback(transactionalEntityManager);
                }
            );

            // 3. Ejecutar y esperar la excepción
            await expect(
                service.create(mockCreateClienteDto, mockRegisterCuentaDto)
            ).rejects.toThrow(NotFoundException);
            
            await expect(
                service.create(mockCreateClienteDto, mockRegisterCuentaDto)
            ).rejects.toThrow(`La localidad con el Id ${mockCreateClienteDto.localidad} no existe.`);

            // 4. Verificaciones de Flujo de Falla
            expect(authService.register).toHaveBeenCalledTimes(1);
            expect(transactionalEntityManager.create).not.toHaveBeenCalled();
            expect(transactionalEntityManager.save).not.toHaveBeenCalled();
            // Nota: Si la excepción es lanzada, TypeORM hace un ROLLBACK automáticamente.
        });
        
        // --- TEST DE FALLA: Error al guardar el cliente ---
        it('debería lanzar NotFoundException si no se puede guardar el cliente', async () => {
            
            // 1. Configurar Mocks para la Transacción de Falla
            const transactionalEntityManager = {
                findOne: jest.fn().mockResolvedValue(mockLocalidadEncontrada), 
                create: jest.fn().mockReturnValue(mockClienteCreado),
                // Simula que la función save devuelve un valor falsy (null o undefined)
                save: jest.fn().mockResolvedValue(null), 
            } as unknown as EntityManager;
            
            jest.spyOn(authService, 'register').mockResolvedValue(mockCuentaCreada);
            
            // 2. Configurar el Mock de la Transacción
            (clienteRepository.manager.transaction as jest.Mock).mockImplementation(
                async (callback) => {
                    return callback(transactionalEntityManager);
                }
            );

            // 3. Ejecutar y esperar la excepción
            await expect(
                service.create(mockCreateClienteDto, mockRegisterCuentaDto)
            ).rejects.toThrow(NotFoundException);
            
            await expect(
                service.create(mockCreateClienteDto, mockRegisterCuentaDto)
            ).rejects.toThrow('Error al guardar el cliente en la bases de datos.');

            // 4. Verificaciones de Flujo
            expect(transactionalEntityManager.findOne).toHaveBeenCalledTimes(1);
            expect(transactionalEntityManager.create).toHaveBeenCalledTimes(1);
            expect(transactionalEntityManager.save).toHaveBeenCalledTimes(1); 
        });
    });
});