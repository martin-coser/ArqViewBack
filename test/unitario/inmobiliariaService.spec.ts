import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Localidad } from 'src/localidad/entities/localidad.entity';
import { Cuenta } from 'src/auth/entities/cuenta.entity';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { RegisterCuentaDto } from 'src/auth/dto/register-cuenta.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateInmobiliariaDto } from 'src/inmobiliaria/dto/create-inmobiliaria.dto';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';
import { InmobiliariaService } from 'src/inmobiliaria/inmobiliaria.service';
import { AuthService } from 'src/auth/auth.service';

// --- Mocks de Datos de Prueba ---

const mockLocalidadId = 20;
const mockCuentaId = 30;

// Datos para crear una Inmobiliaria
const mockCreateInmobiliariaDto: CreateInmobiliariaDto = {
    nombre: 'Inmo Test S.A.',
    direccion: 'Avenida Ficticia 500',
    localidad: mockLocalidadId,
    codigoPais: '+54',
    numeroTelefono: '3514000000',
};

// Datos para crear la Cuenta asociada
const mockRegisterCuentaDto: RegisterCuentaDto = {
    nombreUsuario: 'inmo_test',
    email: 'test@inmobiliaria.com',
    password: 'SecurePassword456',
    rol: 'INMOBILIARIA',
};
// Mock de la Cuenta creada
const mockCuentaCreada: Cuenta = {
    id: mockCuentaId,
    email: mockRegisterCuentaDto.email,
    rol: mockRegisterCuentaDto.rol,
    password: 'hashedPassword',
} as Cuenta;

// Mock de la Localidad encontrada
const mockLocalidadEncontrada: Localidad = {
    id: mockLocalidadId,
    nombre: 'Rosario',
} as Localidad;

// Mock de la Inmobiliaria creada
const mockInmobiliariaCreada: Inmobiliaria = {
    id: 1,
    ...mockCreateInmobiliariaDto,
    localidad: mockLocalidadEncontrada,
    cuenta: mockCuentaCreada,
    plan: 'BASICO',
    fechaSuscripcion: null,
    fechaVencimiento: null,
    fechaComienzoFreemium: null,
    fechaFinFreemium: null,
    usoFreemium: false,
} as Inmobiliaria;

// --- Mocks de Dependencias ---

// 1. Mock de Repositorio (simulamos la transacción del repositorio principal)
const mockInmobiliariaRepository = {
    manager: {
        transaction: jest.fn(), 
        // Este método será mockeado en cada test para simular la transacción
    } as unknown as EntityManager,
};

// 2. Mock de AuthService
const mockAuthService = {
    register: jest.fn(),
};

const mockLocalidadRepository = {};
const mockCuentaRepository = {};
const mockPropiedadRepository = {};


describe('InmobiliariaService (Unit)', () => {
    let service: InmobiliariaService;
    let authService: AuthService;
    let inmobiliariaRepository: Repository<Inmobiliaria>;

    // Configuración del Módulo de Pruebas
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InmobiliariaService,
                // Proveer el Mock del Repositorio principal (con la transacción)
                {
                    provide: getRepositoryToken(Inmobiliaria),
                    useValue: mockInmobiliariaRepository,
                },
                // Proveer Mocks de otros Repositorios
                { provide: getRepositoryToken(Localidad), useValue: {mockLocalidadRepository} },
                { provide: getRepositoryToken(Cuenta), useValue: {mockCuentaRepository} },
                { provide: getRepositoryToken(Propiedad), useValue: {mockPropiedadRepository} },
                // Proveer el Mock de AuthService
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
            ],
        }).compile();
        // Obtener las instancias de servicio y repositorio
        service = module.get<InmobiliariaService>(InmobiliariaService);
        authService = module.get<AuthService>(AuthService);
        inmobiliariaRepository = module.get<Repository<Inmobiliaria>>(getRepositoryToken(Inmobiliaria));

        jest.clearAllMocks();
    });


    describe('create', () => {
        it('debería crear una inmobiliaria exitosamente dentro de una transacción', async () => {
            
            // 1. Configurar el EntityManager Transaccional para el Éxito
            const transactionalEntityManager = {
                // 1.1. Simula que la dirección NO existe
                findOne: jest.fn()
                    .mockResolvedValueOnce(null) // Primera llamada: Verificar si la dirección existe (NO existe)
                    .mockResolvedValueOnce(mockLocalidadEncontrada) // Segunda llamada: Buscar Localidad (ENCUENTRA)
                    .mockResolvedValueOnce(mockCuentaCreada), // Tercera llamada: Verificar Cuenta (ENCUENTRA)
                
                create: jest.fn().mockReturnValue(mockInmobiliariaCreada),
                save: jest.fn().mockResolvedValue(mockInmobiliariaCreada),
            } as unknown as EntityManager;
            
            // 2. Configurar Mocks de Servicio
            // espiar en el método register para simular la creación de la cuenta
            //simula que la cuenta se crea correctamente
            jest.spyOn(authService, 'register').mockResolvedValue(mockCuentaCreada);
            
            // 3. Configurar el Mock de la Transacción
            // Simula la ejecución de la transacción con el EntityManager transaccional
            (inmobiliariaRepository.manager.transaction as jest.Mock).mockImplementation(
                async (callback) => callback(transactionalEntityManager)
            );

            // 4. Ejecutar el método
            // Llamar al método create del servicio
            const result = await service.create(mockCreateInmobiliariaDto, mockRegisterCuentaDto);

            // 5. Verificaciones
            // Verificar que la transacción se inició
            expect(inmobiliariaRepository.manager.transaction).toHaveBeenCalledTimes(1);
            // Verificar que se llamó a authService.register con los datos correctos
            expect(authService.register).toHaveBeenCalledWith(
                mockRegisterCuentaDto, 
                transactionalEntityManager
            );
            
            // Verificaciones de las 3 llamadas a findOne dentro de la transacción
            expect(transactionalEntityManager.findOne).toHaveBeenCalledTimes(3);
            
            // Verificación específica de la primera llamada (Dirección)
            expect(transactionalEntityManager.findOne).toHaveBeenNthCalledWith(
                1,
                Inmobiliaria,
                { where: { direccion: mockCreateInmobiliariaDto.direccion } },
            );

            // Se debe crear y guardar
            expect(transactionalEntityManager.create).toHaveBeenCalledWith(
                Inmobiliaria,
                expect.objectContaining({ nombre: mockCreateInmobiliariaDto.nombre, localidad: mockLocalidadEncontrada })
            );
            expect(transactionalEntityManager.save).toHaveBeenCalledWith(mockInmobiliariaCreada);
            expect(result).toEqual(mockInmobiliariaCreada);
        });

        // FALLO 1: Dirección Duplicada
        it('debería lanzar ConflictException si la dirección ya existe', async () => {
            
            // Configurar el EntityManager Transaccional para la Falla
            const transactionalEntityManager = {
                // Simula que la dirección YA existe (devuelve una inmobiliaria existente)
                findOne: jest.fn().mockResolvedValue(mockInmobiliariaCreada),
                create: jest.fn(),
                save: jest.fn(),
            } as unknown as EntityManager;
            
            jest.spyOn(authService, 'register').mockResolvedValue(mockCuentaCreada);
            (inmobiliariaRepository.manager.transaction as jest.Mock).mockImplementation(
                async (callback) => callback(transactionalEntityManager)
            );

            // Ejecutar y esperar la excepción (UNA SOLA LLAMADA)
            await expect(
                service.create(mockCreateInmobiliariaDto, mockRegisterCuentaDto)
            ).rejects.toThrow(ConflictException);

            // Verificaciones de Flujo de Falla
            expect(authService.register).toHaveBeenCalledTimes(1);
            
            // findOne se llamó 1 vez para verificar la dirección y falló
            expect(transactionalEntityManager.findOne).toHaveBeenCalledTimes(1); 
            
            expect(transactionalEntityManager.create).not.toHaveBeenCalled();
            expect(transactionalEntityManager.save).not.toHaveBeenCalled();
        });

        // FALLO 2: Localidad No Encontrada
        it('debería lanzar NotFoundException si la localidad no existe', async () => {
            
            const transactionalEntityManager = {
                findOne: jest.fn()
                    .mockResolvedValueOnce(null) // 1. Verificar dirección (NO existe)
                    .mockResolvedValueOnce(null) // 2. Buscar Localidad (NO existe)
                    .mockResolvedValueOnce(mockCuentaCreada), // 3. Se llama, pero el flujo ya falla en el paso 2
                
                create: jest.fn(),
                save: jest.fn(),
            } as unknown as EntityManager;
            
            jest.spyOn(authService, 'register').mockResolvedValue(mockCuentaCreada);
            (inmobiliariaRepository.manager.transaction as jest.Mock).mockImplementation(
                async (callback) => callback(transactionalEntityManager)
            );

            // Ejecutar y esperar la excepción (UNA SOLA LLAMADA)
            await expect(
                service.create(mockCreateInmobiliariaDto, mockRegisterCuentaDto)
            ).rejects.toThrow(`Localidad con id ${mockLocalidadId} no existe`);

            // Verificaciones de Flujo de Falla
            expect(authService.register).toHaveBeenCalledTimes(1);
            
            // Se debe llamar 2 veces antes de fallar (Dirección, luego Localidad)
            expect(transactionalEntityManager.findOne).toHaveBeenCalledTimes(2); 
            
            expect(transactionalEntityManager.create).not.toHaveBeenCalled();
            expect(transactionalEntityManager.save).not.toHaveBeenCalled();
        });
        
        // FALLO 3: Cuenta No Encontrada (aunque debería ser rara si Auth funciona, la lógica la cubre)
        it('debería lanzar NotFoundException si la cuenta no existe (Error en el flujo)', async () => {
            
            const transactionalEntityManager = {
                findOne: jest.fn()
                    .mockResolvedValueOnce(null) // 1. Verificar dirección (NO existe)
                    .mockResolvedValueOnce(mockLocalidadEncontrada) // 2. Buscar Localidad (ENCUENTRA)
                    .mockResolvedValueOnce(null), // 3. Verificar Cuenta (NO existe)
                
                create: jest.fn(),
                save: jest.fn(),
            } as unknown as EntityManager;
            
            jest.spyOn(authService, 'register').mockResolvedValue(mockCuentaCreada);
            (inmobiliariaRepository.manager.transaction as jest.Mock).mockImplementation(
                async (callback) => callback(transactionalEntityManager)
            );

            // Ejecutar y esperar la excepción (UNA SOLA LLAMADA)
            await expect(
                service.create(mockCreateInmobiliariaDto, mockRegisterCuentaDto)
            ).rejects.toThrow(`Cuenta con id ${mockCuentaCreada.id} no existe`);

            // Verificaciones de Flujo de Falla
            expect(authService.register).toHaveBeenCalledTimes(1);
            
            // Se debe llamar 3 veces antes de fallar (Dirección, Localidad, Cuenta)
            expect(transactionalEntityManager.findOne).toHaveBeenCalledTimes(3); 
            
            expect(transactionalEntityManager.create).not.toHaveBeenCalled();
            expect(transactionalEntityManager.save).not.toHaveBeenCalled();
        });
    });
});