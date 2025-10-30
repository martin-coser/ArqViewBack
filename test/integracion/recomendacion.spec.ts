import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException } from '@nestjs/common';
import request from 'supertest';

const MOCK_CLIENTE_ID = 7;

// El objeto que simula una propiedad recomendada
const mockPropiedadRecomendable: Propiedad = {
  id: 20,
  precio: 155000,
} as Propiedad;

const mockRecomendaciones = [mockPropiedadRecomendable];

// --- Mock del Servicio ---
const mockRecomendacionService = {
  generarRecomendaciones: jest.fn(), 
};

// --- Mock para simular el Guard y permitir el acceso ---
const mockAuthGuard = {
  canActivate: jest.fn(() => true), // Siempre permite el acceso
};
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport'; // Usa la ruta real de tu AuthGuard
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { RecomendacionController } from 'src/recomendacion/recomendacion.controller';
import { RecomendacionService } from 'src/recomendacion/recomendacion.service';


describe('RecomendacionController (Integration - GET /recomendacion/:clienteId)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RecomendacionController],
      providers: [
        // 1. Sobreescribir el RecomendacionService con nuestro mock
        {
          provide: RecomendacionService,
          useValue: mockRecomendacionService,
        },
        // 2. Sobreescribir el AuthGuard global o de ruta para permitir la ejecución del controlador
        {
          provide: APP_GUARD,
          useValue: mockAuthGuard,
        },
        // También puedes necesitar mockear el AuthGuard de Passport si se usa directamente
        {
          provide: AuthGuard('jwt'), // Reemplaza 'jwt' con tu estrategia real
          useValue: mockAuthGuard,
        }
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // CASO 1: Éxito con Recomendaciones Encontradas
  it('Debería devolver 200 OK y la lista de recomendaciones para un cliente válido', async () => {
    //  Simular que el servicio encuentra recomendaciones
    mockRecomendacionService.generarRecomendaciones.mockResolvedValue(mockRecomendaciones);

    // ACT & ASSERT
    const response = await request(app.getHttpServer())
      .get(`/recomendacion/${MOCK_CLIENTE_ID}`)
      .expect(200); // Esperamos éxito (OK)

    // 1. Verificar que la respuesta HTTP contenga las propiedades
    expect(response.body).toEqual(mockRecomendaciones);

    // 2. Verificar que el servicio fue llamado con el ID correcto de la URL
    expect(mockRecomendacionService.generarRecomendaciones).toHaveBeenCalledWith(MOCK_CLIENTE_ID.toString());
  });



  // CASO 2: Éxito sin Recomendaciones (Lista Vacía)
  it('Debería devolver 200 OK y un array vacío si no hay recomendaciones', async () => {
    // Simular que el servicio devuelve una lista vacía
    mockRecomendacionService.generarRecomendaciones.mockResolvedValue([]);

    // ACT & ASSERT
    const response = await request(app.getHttpServer())
      .get(`/recomendacion/${MOCK_CLIENTE_ID}`)
      .expect(200); // Esperamos éxito (OK)

    // Verificar que la respuesta es un array vacío
    expect(response.body).toEqual([]);
    expect(mockRecomendacionService.generarRecomendaciones).toHaveBeenCalledTimes(1);
  });

 
  // CASO 3: Manejo de Errores de Servicio
  it('Debería devolver 404 NOT FOUND si el servicio no encuentra el recurso base', async () => {
    mockRecomendacionService.generarRecomendaciones.mockRejectedValue(
        new NotFoundException(`Cliente con ID ${MOCK_CLIENTE_ID} no encontrado.`)
    );

    // ACT & ASSERT
    await request(app.getHttpServer())
      .get(`/recomendacion/${MOCK_CLIENTE_ID}`)
      .expect(404)
      .expect(res => {
          expect(res.body.message).toContain('Cliente con ID 7 no encontrado.');
      });
      
    expect(mockRecomendacionService.generarRecomendaciones).toHaveBeenCalledTimes(1);
  });

  afterAll(async () => {
    await app.close();
  });
});