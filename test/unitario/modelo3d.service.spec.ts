import { Test, TestingModule } from '@nestjs/testing';
import { Modelo3DService } from '../../src/modelo3d/modelo3d.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Modelo3D } from '../../src/modelo3d/entities/modelo3d.entity';
import { Propiedad } from '../../src/propiedad/entities/propiedad.entity';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import path from 'path';
import { UploadModelo3DDto } from '../../src/modelo3d/dto/upload-modelo3d.dto';
import { NotFoundException } from '@nestjs/common';
import { InmobiliariaService } from '../../src/inmobiliaria/inmobiliaria.service';

// Mockear fs y path
jest.mock('fs');
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn(),
}));

describe('Modelo3DService', () => {
  let service: Modelo3DService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let modelo3DRepository: Repository<Modelo3D>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let propiedadRepository: Repository<Propiedad>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let inmobiliariaService: InmobiliariaService;

  const mockModelo3DRepository = {
    save: jest.fn(),
    findOneBy: jest.fn(),
    remove: jest.fn(),
    find: jest.fn(),
  };

  const mockPropiedadRepository = {
    findOneBy: jest.fn(),
  };

  const mockInmobiliariaService = {
    esPremium: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Modelo3DService,
        {
          provide: getRepositoryToken(Modelo3D),
          useValue: mockModelo3DRepository,
        },
        {
          provide: getRepositoryToken(Propiedad),
          useValue: mockPropiedadRepository,
        },
        {
          provide: InmobiliariaService,
          useValue: mockInmobiliariaService,
        },
      ],
    }).compile();

    service = module.get<Modelo3DService>(Modelo3DService);
    modelo3DRepository = module.get<Repository<Modelo3D>>(getRepositoryToken(Modelo3D));
    propiedadRepository = module.get<Repository<Propiedad>>(getRepositoryToken(Propiedad));
    inmobiliariaService = module.get<InmobiliariaService>(InmobiliariaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upload', () => {
    it('debería subir un modelo 3D correctamente y devolver la URL', async () => {
      const file = { filename: 'modelo.gltf', path: '/tmp/modelo.gltf' } as Express.Multer.File;
      const dto: UploadModelo3DDto = {propiedad: 1, descripcion: ''};
      const propiedad = { id: 1, nombre: 'Propiedad 1' };
      const savedModelo = {id: 1, filePath: '/modelos3d/modelo.gltf', descripcion: '', propiedad,};

      mockPropiedadRepository.findOneBy.mockResolvedValue(propiedad);
      mockModelo3DRepository.save.mockResolvedValue(savedModelo);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      const result = await service.upload(file, dto);

      expect(mockPropiedadRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockModelo3DRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '/modelos3d/modelo.gltf',
          descripcion: '',
          propiedad,
        }),
      );
      expect(result).toEqual({ imageUrl: '/modelos3d/modelo.gltf' });
    });

    it('debería lanzar NotFoundException si la propiedad no existe', async () => {
      const file = { filename: 'modelo.gltf', path: '/tmp/modelo.gltf' } as Express.Multer.File;
      const dto: UploadModelo3DDto = {
          propiedad: 1,
          descripcion: ''
      };

      mockPropiedadRepository.findOneBy.mockResolvedValue(null);

      await expect(service.upload(file, dto)).rejects.toThrow(
        new NotFoundException(`Propiedad con ID 1 no encontrada.`),
      );
    });

    it('debería lanzar error si dto.propiedad es undefined', async () => {
      const file = { filename: 'modelo.gltf', path: '/tmp/modelo.gltf' } as Express.Multer.File;

      await expect(service.upload(file, undefined)).rejects.toThrow(
        new NotFoundException(`Propiedad con ID undefined no encontrada.`),
      );
    });
  });

  describe('remove', () => {
    it('debería eliminar un modelo 3D existente y su archivo', async () => {
      const modelo = { id: 1, filePath: '/modelos3d/modelo.gltf' };
      const fullPath = '/app/modelos3d/modelo.gltf';

      mockModelo3DRepository.findOneBy.mockResolvedValue(modelo);
      (path.join as jest.Mock).mockReturnValue(fullPath);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
      mockModelo3DRepository.remove.mockResolvedValue(undefined);

      await service.remove(1);

      expect(mockModelo3DRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(path.join).toHaveBeenCalledWith(process.cwd(), '/modelos3d/modelo.gltf');
      expect(fs.existsSync).toHaveBeenCalledWith(fullPath);
      expect(fs.unlinkSync).toHaveBeenCalledWith(fullPath);
      expect(mockModelo3DRepository.remove).toHaveBeenCalledWith(modelo);
    });

    it('debería lanzar NotFoundException si el modelo 3D no existe', async () => {
      mockModelo3DRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(1)).rejects.toThrow(
        new NotFoundException(`Modelo 3D con ID 1 no encontrado.`),
      );
    });

    it('debería eliminar de la base de datos aunque el archivo no exista', async () => {
      const modelo = { id: 1, filePath: '/modelos3d/modelo.gltf' };
      const fullPath = '/app/modelos3d/modelo.gltf';

      mockModelo3DRepository.findOneBy.mockResolvedValue(modelo);
      (path.join as jest.Mock).mockReturnValue(fullPath);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockModelo3DRepository.remove.mockResolvedValue(undefined);

      await service.remove(1);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(mockModelo3DRepository.remove).toHaveBeenCalledWith(modelo);
    });
  });

  describe('findByPropiedad', () => {
    it('debería devolver modelos 3D si la inmobiliaria tiene plan premium', async () => {
      const propiedad = { id: 1, nombre: 'Propiedad 1' };
      const modelos = [
        { id: 1, filePath: '/modelos3d/modelo1.gltf', propiedad },
        { id: 2, filePath: '/modelos3d/modelo2.gltf', propiedad },
      ];

      mockInmobiliariaService.esPremium.mockResolvedValue(true);
      mockPropiedadRepository.findOneBy.mockResolvedValue(propiedad);
      mockModelo3DRepository.find.mockResolvedValue(modelos);

      const result = await service.findByPropiedad(1);

      expect(mockInmobiliariaService.esPremium).toHaveBeenCalledWith(1);
      expect(mockPropiedadRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockModelo3DRepository.find).toHaveBeenCalledWith({
        where: { propiedad: { id: 1 } },
      });
      expect(result).toEqual(modelos);
    });

    it('debería devolver array vacío si no tiene plan premium', async () => {
      mockInmobiliariaService.esPremium.mockResolvedValue(false);

      const result = await service.findByPropiedad(1);

      expect(mockInmobiliariaService.esPremium).toHaveBeenCalledWith(1);
      expect(mockPropiedadRepository.findOneBy).not.toHaveBeenCalled();
      expect(mockModelo3DRepository.find).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('debería lanzar NotFoundException si la propiedad no existe (con premium)', async () => {
      mockInmobiliariaService.esPremium.mockResolvedValue(true);
      mockPropiedadRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findByPropiedad(1)).rejects.toThrow(
        new NotFoundException(`Propiedad con ID 1 no encontrada.`),
      );

      expect(mockPropiedadRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockModelo3DRepository.find).not.toHaveBeenCalled();
    });
  });
});