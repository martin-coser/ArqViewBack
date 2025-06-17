import { Test, TestingModule } from '@nestjs/testing';
import { TipoDePropiedadController } from './tipo-de-propiedad.controller';
import { TipoDePropiedadService } from './tipo-de-propiedad.service';

describe('TipoDePropiedadController', () => {
  let controller: TipoDePropiedadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TipoDePropiedadController],
      providers: [TipoDePropiedadService],
    }).compile();

    controller = module.get<TipoDePropiedadController>(TipoDePropiedadController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
