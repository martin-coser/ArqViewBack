// src/chat-ia/chat-ia.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { ChatIaService } from '../../src/chat-ia/chat-ia.service';
import nock from 'nock';

describe('ChatIaService - Integración (Flask Mockeado)', () => {
  let service: ChatIaService;

  // Configuración del módulo de prueba
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [ChatIaService],
    }).compile();

    service = module.get<ChatIaService>(ChatIaService);
  });

  // Limpieza de nocks después de cada prueba
  afterEach(() => {
    nock.cleanAll(); // Limpia todos los mocks
  });

  it('debe enviar mensaje a Flask y recibir respuesta simulada', async () => {
    const mensaje = 'quiero un departamento en Córdoba con balcón';
    const session_id = 789;

    // Mock de Flask en localhost:5001
    nock('http://localhost:5001')
      .post('/chat')
      .reply(200, {
        response: '¡Genial! Encontré 3 departamentos en Córdoba con balcón.',
        properties: [
          { id: 10, nombre: 'Depto Centro', precio: 85000 },
        ],
        params: { tipoPropiedad: 'departamento', localidad: 'Córdoba' },
        session_id: session_id.toString(),
      });

    const resultado = await service.processChatQuery(mensaje, session_id);

    expect(resultado).toEqual({
      response: '¡Genial! Encontré 3 departamentos en Córdoba con balcón.',
      properties: expect.any(Array),
      params: expect.any(Object),
      session_id: expect.any(String),
    });

    expect(nock.isDone()).toBe(true); // Verifica que el mock fue usado
  });

  it('debe manejar error 500 de Flask', async () => {
    nock('http://localhost:5001')
      .post('/chat')
      .reply(500, { error: 'Flask explotó' });

    await expect(service.processChatQuery('test', 1)).rejects.toThrow(
      'Error al procesar la consulta del chat'
    );

    expect(nock.isDone()).toBe(true);
  });
});