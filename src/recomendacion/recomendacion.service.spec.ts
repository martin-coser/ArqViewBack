import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecomendacionService } from './recomendacion.service';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { ListaDeInteres } from 'src/lista-de-interes/entities/lista-de-interes.entity';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { Notificacion } from 'src/notificacion/entities/notificacion.entity';
import { MailerService } from '@nestjs-modules/mailer';
import { NotFoundException } from '@nestjs/common';

describe('RecomendacionService', () => {
  let service: RecomendacionService;

  const mockClienteRepo = () => ({});
  const mockListaDeInteresRepo = () => ({});
  const mockPropiedadRepo = () => ({});
  const mockNotificacionRepo = () => ({});
  const mockMailerService = () => ({
    sendMail: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecomendacionService,
        {
          provide: getRepositoryToken(Cliente),
          useFactory: mockClienteRepo,
        },
        {
          provide: getRepositoryToken(ListaDeInteres),
          useFactory: mockListaDeInteresRepo,
        },
        {
          provide: getRepositoryToken(Propiedad),
          useFactory: mockPropiedadRepo,
        },
        {
          provide: getRepositoryToken(Notificacion),
          useFactory: mockNotificacionRepo,
        },
        {
          provide: MailerService,
          useFactory: mockMailerService,
        },
      ],
    }).compile();

    service = module.get<RecomendacionService>(RecomendacionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calcularPesosDinamicos', () => {
    it('debe asignar pesos más altos a características con baja varianza relativa', () => {
      const propiedades = [
        {
          id: 1,
          precio: 100000,
          superficie: 100,
          cantidadBanios: 2,
          cantidadDormitorios: 3,
          cantidadAmbientes: 4,
          tipoPropiedad: { id: 1, nombre: 'Casa' },
        } as Propiedad,
        {
          id: 2,
          precio: 100000, // Mismo precio, baja varianza
          superficie: 150, // Variación
          cantidadBanios: 2,
          cantidadDormitorios: 3,
          cantidadAmbientes: 4,
          tipoPropiedad: { id: 1, nombre: 'Casa' },
        } as Propiedad,
      ];

      const pesos = service['calcularPesosDinamicos'](propiedades);

      // Precio tiene baja std normalizada, debe tener peso alto
      expect(pesos.precio).toBeGreaterThan(pesos.superficie);
      // Tipo igual, peso alto
      expect(pesos.tipoPropiedad).toBeGreaterThan(0.1);
    });

    it('debe normalizar los pesos para que sumen aproximadamente 1', () => {
      const propiedades = [
        {
          id: 1,
          precio: 100000,
          superficie: 100,
          cantidadBanios: 2,
          cantidadDormitorios: 3,
          cantidadAmbientes: 4,
          tipoPropiedad: { id: 1, nombre: 'Casa' },
        } as Propiedad,
      ];

      const pesos = service['calcularPesosDinamicos'](propiedades);
      const suma = Object.values(pesos).reduce((acc: number, val: number) => acc + val, 0);

      expect(suma).toBeCloseTo(1, 5); // Aproximadamente 1
    });
  });

  describe('calculateSimilarity', () => {
    it('debe calcular similitud más alta cuando características predominantes coinciden', () => {
      const prop1 = {
        precio: 100000,
        superficie: 100,
        cantidadBanios: 2,
        cantidadDormitorios: 3,
        cantidadAmbientes: 4,
        tipoPropiedad: { id: 1 },
      } as Propiedad;

      const prop2 = {
        precio: 100000, // Coincide en precio (alta ponderación si baja varianza)
        superficie: 105,
        cantidadBanios: 2,
        cantidadDormitorios: 3,
        cantidadAmbientes: 4,
        tipoPropiedad: { id: 1 },
      } as Propiedad;

      const prop3 = {
        precio: 200000, // Diferencia en precio
        superficie: 100,
        cantidadBanios: 2,
        cantidadDormitorios: 3,
        cantidadAmbientes: 4,
        tipoPropiedad: { id: 1 },
      } as Propiedad;

      const pesos = {
        precio: 0.5, // Alta ponderación
        superficie: 0.1,
        banios: 0.1,
        dormitorios: 0.1,
        ambientes: 0.1,
        tipoPropiedad: 0.1,
      };

      const sim2 = service['calculateSimilarity'](prop1, prop2, pesos);
      const sim3 = service['calculateSimilarity'](prop1, prop3, pesos);

      expect(sim2).toBeGreaterThan(sim3);
    });

    it('debe penalizar mismatch en tipo cuando es predominante', () => {
      const prop1 = {
        precio: 100000,
        superficie: 100,
        cantidadBanios: 2,
        cantidadDormitorios: 3,
        cantidadAmbientes: 4,
        tipoPropiedad: { id: 1 },
      } as Propiedad;

      const propMatch = {
        precio: 100000,
        superficie: 100,
        cantidadBanios: 2,
        cantidadDormitorios: 3,
        cantidadAmbientes: 4,
        tipoPropiedad: { id: 1 },
      } as Propiedad;

      const propMismatch = {
        precio: 100000,
        superficie: 100,
        cantidadBanios: 2,
        cantidadDormitorios: 3,
        cantidadAmbientes: 4,
        tipoPropiedad: { id: 2 },
      } as Propiedad;

      const pesosHighTipo = {
        precio: 0.1,
        superficie: 0.1,
        banios: 0.1,
        dormitorios: 0.1,
        ambientes: 0.1,
        tipoPropiedad: 0.5, // Alto peso en tipo
      };

      const simMatch = service['calculateSimilarity'](prop1, propMatch, pesosHighTipo);
      const simMismatch = service['calculateSimilarity'](prop1, propMismatch, pesosHighTipo);

      expect(simMatch).toBeGreaterThan(simMismatch);
      expect(simMismatch).toBeLessThan(0.8); // Penaliza lo suficiente
    });
  });

  // Agrega más tests para generarRecomendaciones y notificarNuevaPropiedad si es necesario
});