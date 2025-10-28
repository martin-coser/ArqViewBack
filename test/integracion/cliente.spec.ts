import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClienteController } from 'src/cliente/cliente.controller';
import { ClienteService } from 'src/cliente/cliente.service';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { Localidad } from 'src/localidad/entities/localidad.entity';
import { Cuenta } from 'src/auth/entities/cuenta.entity';
import { AuthService } from 'src/auth/auth.service';


// --- Mocks de Datos y Respuestas ---
const mockLocalidadId = 15;
const mockCuentaId = 100;

// Crear el objeto Date real que Jest esperará en la aserción
// Esto refleja la transformación del ValidationPipe
const REAL_FECHA_NACIMIENTO_ISO_STRING = '2001-12-23T00:00:00.000Z';
const realFechaNacimiento = new Date(REAL_FECHA_NACIMIENTO_ISO_STRING);

const mockCreatePayload = {
    cliente: {
        nombre: 'Ana',
        apellido: 'Gomez',
        fechaNacimiento: REAL_FECHA_NACIMIENTO_ISO_STRING, 
        direccion: 'Calle Falsa 123',
        localidad: mockLocalidadId,
    },
    cuenta: {
        nombreUsuario: 'ana.gomez', 
        email: 'ana.gomez@test.com',
        password: 'PasswordSegura123!',
        rol: 'CLIENTE',
    }
};

const mockClienteCreated = {
    id: 1,
    // La respuesta esperada debe mantener el formato de string para la fecha
    ...mockCreatePayload.cliente,
    localidad: { id: mockLocalidadId, nombre: 'Mock' },
    cuenta: { 
        id: mockCuentaId,
        nombreUsuario: mockCreatePayload.cuenta.nombreUsuario, 
        email: mockCreatePayload.cuenta.email 
    },
};

// --- Mock del Servicio ---
const mockClienteService = {
    create: jest.fn(),
};

describe('ClienteController (Integration - POST /cliente/create)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [ClienteController],
            providers: [
                { provide: ClienteService, useValue: mockClienteService },
                { provide: getRepositoryToken(Cliente), useValue: {} },
                { provide: getRepositoryToken(Localidad), useValue: {} },
                { provide: getRepositoryToken(Cuenta), useValue: {} },
                { provide: AuthService, useValue: {} },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        // Es fundamental tener transform: true para que @Type(() => Date) funcione
        app.useGlobalPipes(new ValidationPipe({ transform: true }));
        await app.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // CASO 1: CREACIÓN EXITOSA (201)
    it('Debería crear un cliente y devolver 201 CREATED', async () => {
        // Simular el resultado exitoso del servicio
        mockClienteService.create.mockResolvedValue(mockClienteCreated);

        await request(app.getHttpServer())
            .post('/cliente/create')
            .send(mockCreatePayload)
            .expect(201)
            .expect(res => {
                // 1. Verificar la estructura de la respuesta
                expect(res.body).toEqual(mockClienteCreated);
            });

        // 2. Verificar los argumentos con los que se llamó al servicio
        const { fechaNacimiento, ...restCliente } = mockCreatePayload.cliente;

        const expectedClienteDto = {
            ...restCliente,
            // El string se convierte a objeto Date por el ValidationPipe
            fechaNacimiento: realFechaNacimiento, 
            // 'cuenta' es opcional en el DTO y no se envía en el payload, 
            // resultando en undefined
            cuenta: undefined
        };
        
        // El DTO de cuenta es el mismo
        const expectedCuentaDto = mockCreatePayload.cuenta;


        // 2. Verificar que el servicio fue llamado con los DTOs transformados
        expect(mockClienteService.create).toHaveBeenCalledWith(
            expectedClienteDto, 
            expectedCuentaDto 
        );
    });

    // CASO 2: FALLA POR VALIDACIÓN (400)
    it('Debería fallar con 400 BAD REQUEST si el DTO es inválido (ej. nombre faltante)', async () => {
        const invalidPayload = {
            cliente: { ...mockCreatePayload.cliente, nombre: '' }, // Nombre vacío/inválido
            cuenta: mockCreatePayload.cuenta,
        };

        await request(app.getHttpServer())
            .post('/cliente/create')
            .send(invalidPayload)
            .expect(400)
            .expect(res => {
                // Verificar que el error proviene del ValidationPipe (array de mensajes)
                expect(res.body.message).toBeInstanceOf(Array);
            });

        // Verificar que el servicio NO fue llamado
        expect(mockClienteService.create).not.toHaveBeenCalled();
    });

   
    // CASO 3: FALLA DE LÓGICA (Simular 404 del servicio)
    it('Debería devolver 404 NOT FOUND si el servicio lanza NotFoundException (ej. Localidad no existe)', async () => {
        // Simular que el servicio lanza la excepción
        mockClienteService.create.mockRejectedValue(
            new NotFoundException('La localidad con el Id 999 no existe.')
        );

        await request(app.getHttpServer())
            .post('/cliente/create')
            .send(mockCreatePayload)
            .expect(404) 
            .expect(res => {
                // Verificar que el mensaje de error se propaga correctamente
                expect(res.body.message).toContain('La localidad con el Id 999 no existe.');
            });

        // Verificar que el servicio SÍ fue llamado
        expect(mockClienteService.create).toHaveBeenCalledTimes(1);
    });

    afterAll(async () => {
        await app.close();
    });
});