import { Test, TestingModule } from '@nestjs/testing';
import { Imagen2dService } from '../../src/imagen2d/imagen2d.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Imagen2d } from '../../src/imagen2d/entities/imagen2d.entity';
import { Propiedad } from '../../src/propiedad/entities/propiedad.entity';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { UploadImagen2dDto } from '../../src/imagen2d/dto/upload-imagen2d.dto';
import { NotFoundException } from '@nestjs/common';
import path from 'path';

// Mockear fs
jest.mock('fs');

describe('Imagen2dService', () => {
  let service: Imagen2dService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let imagen2dRepository: Repository<Imagen2d>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let propiedadRepository: Repository<Propiedad>;

  const mockImagen2dRepository = {
    save: jest.fn(),
    findOneBy: jest.fn(),
    remove: jest.fn(),
    find: jest.fn(),
  };

  const mockPropiedadRepository = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Imagen2dService,
        {
          provide: getRepositoryToken(Imagen2d),
          useValue: mockImagen2dRepository,
        },
        {
          provide: getRepositoryToken(Propiedad),
          useValue: mockPropiedadRepository,
        },
      ],
    }).compile();

    service = module.get<Imagen2dService>(Imagen2dService);
    imagen2dRepository = module.get<Repository<Imagen2d>>(getRepositoryToken(Imagen2d));
    propiedadRepository = module.get<Repository<Propiedad>>(getRepositoryToken(Propiedad));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upload', () => {
    it('debería subir una imagen correctamente y devolver la URL', async () => {
      const file = { filename: 'test.jpg', path: '/tmp/test.jpg' } as Express.Multer.File;
      const dto: UploadImagen2dDto = { descripcion: 'Imagen de prueba', propiedad: 1 };
      const propiedad = { id: 1, nombre: 'Propiedad 1' };
      const savedImagen = {
        id: 1,
        filePath: '/imagenes2d/test.jpg',
        descripcion: 'Imagen de prueba',
        propiedad,
      };

      mockPropiedadRepository.findOneBy.mockResolvedValue(propiedad);
      mockImagen2dRepository.save.mockResolvedValue(savedImagen);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      const result = await service.upload(file, dto);

      expect(mockPropiedadRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockImagen2dRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '/imagenes2d/test.jpg',
          descripcion: 'Imagen de prueba',
          propiedad,
        }),
      );
      expect(result).toEqual({ imageUrl: '/imagenes2d/test.jpg' });
    });

    it('debería lanzar NotFoundException si la propiedad no existe', async () => {
      const file = { filename: 'test.jpg', path: '/tmp/test.jpg' } as Express.Multer.File;
      const dto: UploadImagen2dDto = { descripcion: 'Imagen de prueba', propiedad: 1 };

      mockPropiedadRepository.findOneBy.mockResolvedValue(null);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      await expect(service.upload(file, dto)).rejects.toThrow(
        new NotFoundException(`Propiedad con ID 1 no encontrada.`),
      );
      expect(fs.unlinkSync).toHaveBeenCalledWith(file.path);
    });

    it('debería subir una imagen sin descripción', async () => {
        const file = { filename: 'test.jpg', path: '/tmp/test.jpg' } as Express.Multer.File;
        const dto: UploadImagen2dDto = {
            propiedad: 1,
            descripcion: ''
        };
        const propiedad = { id: 1, nombre: 'Propiedad 1' };
        const savedImagen = {
        id: 1,
        filePath: '/imagenes2d/test.jpg',
        descripcion: undefined, // Cambiado de null a undefined
        propiedad,
        tags_visuales: undefined, // Añadido para coincidir con la entidad
        };

        mockPropiedadRepository.findOneBy.mockResolvedValue(propiedad);
        mockImagen2dRepository.save.mockResolvedValue(savedImagen);
        (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

        const result = await service.upload(file, dto);

        expect(mockImagen2dRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
            filePath: '/imagenes2d/test.jpg',
            descripcion: undefined, // Cambiado de null a undefined
            propiedad,
        }),
        );
        expect(result).toEqual({ imageUrl: '/imagenes2d/test.jpg' });
    });
  });

  describe('updateDescription', () => {
    it('debería actualizar la descripción de una imagen existente', async () => {
      const imagen = { id: 1, filePath: '/imagenes2d/test.jpg', descripcion: 'Descripción antigua' };
      const updatedImagen = { ...imagen, descripcion: 'Descripción nueva' };

      mockImagen2dRepository.findOneBy.mockResolvedValue(imagen);
      mockImagen2dRepository.save.mockResolvedValue(updatedImagen);

      const result = await service.updateDescription(1, 'Descripción nueva');

      expect(mockImagen2dRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockImagen2dRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ descripcion: 'Descripción nueva' }),
      );
      expect(result).toEqual(updatedImagen);
    });

    it('debería lanzar NotFoundException si la imagen no existe', async () => {
      mockImagen2dRepository.findOneBy.mockResolvedValue(null);

      await expect(service.updateDescription(1, 'Descripción nueva')).rejects.toThrow(
        new NotFoundException(`Imagen con ID 1 no encontrada.`),
      );
    });
  });

  describe('remove', () => {
    it('debería eliminar una imagen existente', async () => {
        const imagen = { id: 1, filePath: '/imagenes2d/test.jpg', tags_visuales: undefined };
        mockImagen2dRepository.findOneBy.mockResolvedValue(imagen);
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
        mockImagen2dRepository.remove.mockResolvedValue(undefined);
        await service.remove(1);
        expect(mockImagen2dRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
        expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining(path.normalize('imagenes2d/test.jpg')));
        expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining(path.normalize('imagenes2d/test.jpg')));
        expect(mockImagen2dRepository.remove).toHaveBeenCalledWith(imagen);
    });

    it('debería lanzar NotFoundException si la imagen no existe', async () => {
      mockImagen2dRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(1)).rejects.toThrow(
        new NotFoundException(`Imagen con ID 1 no encontrada.`),
      );
    });

    it('debería manejar el caso donde el archivo no existe en el sistema de archivos', async () => {
      const imagen = { id: 1, filePath: '/imagenes2d/test.jpg' };

      mockImagen2dRepository.findOneBy.mockResolvedValue(imagen);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockImagen2dRepository.remove.mockResolvedValue(undefined);

      await service.remove(1);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(mockImagen2dRepository.remove).toHaveBeenCalledWith(imagen);
    });
  });
});