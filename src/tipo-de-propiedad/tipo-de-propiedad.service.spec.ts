import { Test, TestingModule } from '@nestjs/testing';
import { TipoDePropiedadService } from './tipo-de-propiedad.service';

describe('TipoDePropiedadService', () => {
  let service: TipoDePropiedadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TipoDePropiedadService],
    }).compile();

    service = module.get<TipoDePropiedadService>(TipoDePropiedadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
