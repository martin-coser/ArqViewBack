import { Test, TestingModule } from '@nestjs/testing';
import { PropiedadController } from './propiedad.controller';
import { PropiedadService } from './propiedad.service';

describe('PropiedadController', () => {
  let controller: PropiedadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropiedadController],
      providers: [PropiedadService],
    }).compile();

    controller = module.get<PropiedadController>(PropiedadController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
