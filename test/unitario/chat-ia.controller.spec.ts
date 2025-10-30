// src/chat-ia/chat-ia.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ChatIaController } from '../../src/chat-ia/chat-ia.controller';
import { ChatIaService } from '../../src/chat-ia/chat-ia.service';

describe('ChatIaController', () => {
  let controller: ChatIaController;
  let service: ChatIaService;

  // Mock del ChatIaService
  const mockChatIaService = {
    processChatQuery: jest.fn(),
  };

  // Configuración del módulo de prueba
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatIaController],
      providers: [
        {
          provide: ChatIaService,
          useValue: mockChatIaService,
        },
      ],
    }).compile();

    controller = module.get<ChatIaController>(ChatIaController);
    service = module.get<ChatIaService>(ChatIaService);
  });

  // Verificación de que el controlador esté definido
  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('handleChat', () => {
    it('debe llamar a processChatQuery con el mensaje y userId y devolver el resultado', async () => {
      const mensaje = 'quiero una casa en Córdoba';
      const userId = 123;
      const respuestaMock = { response: 'Aquí tienes las casas...', properties: [] };

      const req = { user: { id: userId } };

      mockChatIaService.processChatQuery.mockResolvedValue(respuestaMock);

      const resultado = await controller.handleChat(mensaje, req);

      expect(service.processChatQuery).toHaveBeenCalledWith(mensaje, userId);
      expect(resultado).toEqual(respuestaMock);
    });

    it('debe lanzar un error si el servicio falla', async () => {
      const mensaje = 'error';
      const req = { user: { id: 999 } };

      mockChatIaService.processChatQuery.mockRejectedValue(new Error('Error al procesar'));

      await expect(controller.handleChat(mensaje, req)).rejects.toThrow('Error al procesar');
    });
  });
});