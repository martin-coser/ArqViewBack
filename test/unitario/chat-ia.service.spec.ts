// src/chat-ia/chat-ia.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ChatIaService } from '../../src/chat-ia/chat-ia.service';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('ChatIaService', () => {
  let service: ChatIaService;
  let httpService: HttpService;

  // Mock del HttpService
  const mockHttpService = {
    post: jest.fn(),
  };

  // Configuración del módulo de prueba
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatIaService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<ChatIaService>(ChatIaService);
    httpService = module.get<HttpService>(HttpService);
  });

  // Verificación de que el servicio esté definido
  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('processChatQuery', () => {
    const mensaje = 'casa en Villa María con garage grande';
    const session_id = 456;

    it('debe llamar a la API Flask y devolver los datos de la respuesta', async () => {
      const respuestaApiMock: AxiosResponse<unknown> = {
        data: {
          response: '¡Encontré 2 casas!',
          properties: [{ id: 1, nombre: 'Casa amplia' }],
          params: { tipoPropiedad: 'casa', localidad: 'Villa María' },
          session_id: session_id.toString(),
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      mockHttpService.post.mockReturnValue(of(respuestaApiMock));

      const resultado = await service.processChatQuery(mensaje, session_id);

      expect(httpService.post).toHaveBeenCalledWith('http://localhost:5001/chat', {
        session_id,
        message: mensaje,
      });
      expect(resultado).toEqual(respuestaApiMock.data);
    });

    it('debe lanzar un error si falla la petición HTTP', async () => {
      mockHttpService.post.mockReturnValue(throwError(() => new Error('Error de red')));

      await expect(service.processChatQuery(mensaje, session_id)).rejects.toThrow(
        'Error al procesar la consulta del chat',
      );
    });

    it('debe devolver los datos aunque la API responda con error 500', async () => {
        const respuestaError: AxiosResponse<unknown> = {
            data: { error: 'Error interno del servidor' },
            status: 500,
            statusText: 'Internal Server Error',
            headers: {},
            config: {} as never,
        };

        mockHttpService.post.mockReturnValue(of(respuestaError));

        const resultado = await service.processChatQuery(mensaje, session_id);

        expect(resultado).toEqual({ error: 'Error interno del servidor' });
    });
  });
});