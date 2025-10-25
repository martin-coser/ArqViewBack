import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ConflictException, NotFoundException } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InmobiliariaController } from 'src/inmobiliaria/inmobiliaria.controller';
import { InmobiliariaService } from 'src/inmobiliaria/inmobiliaria.service';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';
import { Localidad } from 'src/localidad/entities/localidad.entity';
import { Cuenta } from 'src/auth/entities/cuenta.entity';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { AuthService } from 'src/auth/auth.service';


// --- Mocks de Datos y Respuestas ---
const mockLocalidadId = 20;
const mockCuentaId = 200;

const mockCreatePayload = {
    inmobiliaria: {
        nombre: 'Inmo Test S.A.',
        direccion: 'Avenida Ficticia 500',
        localidad: mockLocalidadId,
        codigoPais: '+54',
        numeroTelefono: '3514000000',
    },
    cuenta: {
        nombreUsuario: 'inmo.test',
        email: 'test@inmobiliaria.com',
        password: 'SecurePassword456!',
        rol: 'INMOBILIARIA',
    }
};

const mockInmobiliariaCreated = {
    id: 1,
    ...mockCreatePayload.inmobiliaria,
    plan: 'BASICO',
    localidad: { id: mockLocalidadId, nombre: 'Mock' },
    cuenta: { id: mockCuentaId, email: mockCreatePayload.cuenta.email },
};

// --- Mock del Servicio ---
const mockInmobiliariaService = {
    create: jest.fn(),
};

describe('InmobiliariaController (Integration - POST /inmobiliaria/create)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [InmobiliariaController],
            providers: [
                // 1. Sobreescribir el InmobiliariaService con nuestro mock
                {
                    provide: InmobiliariaService,
                    useValue: mockInmobiliariaService,
                },
                // 2. Mockear dependencias (solo para satisfacer el inyector)
                { provide: getRepositoryToken(Inmobiliaria), useValue: {} },
                { provide: getRepositoryToken(Localidad), useValue: {} },
                { provide: getRepositoryToken(Cuenta), useValue: {} },
                { provide: getRepositoryToken(Propiedad), useValue: {} },
                { provide: AuthService, useValue: {} },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ transform: true }));
        await app.init();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });


    // CASO 1: CREACIÓN EXITOSA (201)
    it('Debería crear una inmobiliaria y devolver 201 CREATED', async () => {
        mockInmobiliariaService.create.mockResolvedValue(mockInmobiliariaCreated);

        await request(app.getHttpServer())
            .post('/inmobiliaria/create')
            .send(mockCreatePayload)
            .expect(201)
            .expect(res => {
                expect(res.body).toEqual(mockInmobiliariaCreated);
            });
        // verificar que el servicio fue llamado con los DTOs correctos
        const expectedInmobiliariaDto = {
            ...mockCreatePayload.inmobiliaria,
            cuenta: undefined,
        };
        //verificar que el servicio fue llamado con los DTOs correctos
        const expectedCuentaDto = mockCreatePayload.cuenta;


        expect(mockInmobiliariaService.create).toHaveBeenCalledWith(
            expectedInmobiliariaDto, // Usar el DTO ajustado con cuenta: undefined
            expectedCuentaDto
        );
    });

    
    // CASO 2: FALLA POR CONFLICTO (Simular 409 del servicio - Dirección Duplicada)
    it('Debería devolver 409 CONFLICT si el servicio lanza ConflictException (ej. Dirección duplicada)', async () => {
        // Simular que el servicio lanza la excepción
        mockInmobiliariaService.create.mockRejectedValue(
            new ConflictException('La dirección ya existe')
        );

        await request(app.getHttpServer())
            .post('/inmobiliaria/create')
            .send(mockCreatePayload)
            .expect(409)
            .expect(res => {
                expect(res.body.message).toContain('La dirección ya existe');
            });

        expect(mockInmobiliariaService.create).toHaveBeenCalledTimes(1);
    });

    // CASO 3: FALLA POR VALIDACIÓN (DTO Inválido)
    it('Debería fallar con 400 BAD REQUEST si falta un campo requerido (ej. nombre)', async () => {
        const invalidPayload = {
            inmobiliaria: { ...mockCreatePayload.inmobiliaria, nombre: '' }, // Nombre vacío
            cuenta: mockCreatePayload.cuenta,
        };

        await request(app.getHttpServer())
            .post('/inmobiliaria/create')
            .send(invalidPayload)
            .expect(400);

        expect(mockInmobiliariaService.create).not.toHaveBeenCalled();
    });

    // CASO 4: FALLA POR 404 NOT FOUND (ej. Localidad no existe)
    it('Debería devolver 404 NOT FOUND si el servicio lanza NotFoundException', async () => {
        mockInmobiliariaService.create.mockRejectedValue(
            new NotFoundException('Localidad con id 999 no existe')
        );

        await request(app.getHttpServer())
            .post('/inmobiliaria/create')
            .send(mockCreatePayload)
            .expect(404)
            .expect(res => {
                expect(res.body.message).toContain('Localidad con id 999 no existe');
            });

        expect(mockInmobiliariaService.create).toHaveBeenCalledTimes(1);
    });

    afterAll(async () => {
        await app.close();
    });
});