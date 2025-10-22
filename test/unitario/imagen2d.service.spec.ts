import { Test, TestingModule } from '@nestjs/testing';
import { Imagen2dService } from '../../src/imagen2d/imagen2d.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Imagen2d } from '../../src/imagen2d/entities/imagen2d.entity';
import { Propiedad } from '../../src/propiedad/entities/propiedad.entity';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { UploadImagen2dDto } from '../../src/imagen2d/dto/upload-imagen2d.dto';
import { NotFoundException } from '@nestjs/common';

jest.mock('fs'); // Mockeamos el módulo fs

describe('Imagen2dService', () => {
  let service: Imagen2dService;
  let imagen2dRepository: Repository<Imagen2d>;
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

  // Tests para upload
  describe('upload', () => {
    it('debería subir una imagen correctamente y devolver la URL', async () => {
      // Datos de prueba
      const file = { filename: 'test.jpg', path: '/tmp/test.jpg' } as Express.Multer.File;
      const dto: UploadImagen2dDto = { descripcion: 'Imagen de prueba', propiedad: 1 };
      const propiedad = { id: 1, nombre: 'Propiedad 1' };
      const savedImagen = {
        id: 1,
        filePath: '/imagenes2d/test.jpg',
        descripcion: 'Imagen de prueba',
        propiedad,
      };

      // Configurar mocks
      mockPropiedadRepository.findOneBy.mockResolvedValue(propiedad);
      mockImagen2dRepository.save.mockResolvedValue(savedImagen);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      // Ejecutar
      const result = await service.upload(file, dto);

      // Verificaciones
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
      // Datos de prueba
      const file = { filename: 'test.jpg', path: '/tmp/test.jpg' } as Express.Multer.File;
      const dto: UploadImagen2dDto = { descripcion: 'Imagen de prueba', propiedad: 1 };

      // Configurar mocks
      mockPropiedadRepository.findOneBy.mockResolvedValue(null);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      // Ejecutar y verificar
      await expect(service.upload(file, dto)).rejects.toThrow(
        new NotFoundException(`Propiedad con ID 1 no encontrada.`),
      );
      expect(fs.unlinkSync).toHaveBeenCalledWith(file.path);
    });

    it('debería subir una imagen sin descripción', async () => {
      // Datos de prueba
      const file = { filename: 'test.jpg', path: '/tmp/test.jpg' } as Express.Multer.File;
      const dto: UploadImagen2dDto = {
          propiedad: 1,
          descripcion: ''
      };
      const propiedad = { id: 1, nombre: 'Propiedad 1' };
      const savedImagen = {
        id: 1,
        filePath: '/imagenes2d/test.jpg',
        descripcion: null,
        propiedad,
      };

      // Configurar mocks
      mockPropiedadRepository.findOneBy.mockResolvedValue(propiedad);
      mockImagen2dRepository.save.mockResolvedValue(savedImagen);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      // Ejecutar
      const result = await service.upload(file, dto);

      // Verificaciones
      expect(mockImagen2dRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '/imagenes2d/test.jpg',
          descripcion: null,
          propiedad,
        }),
      );
      expect(result).toEqual({ imageUrl: '/imagenes2d/test.jpg' });
    });
  });

  // Tests para updateDescription
  describe('updateDescription', () => {
    it('debería actualizar la descripción de una imagen existente', async () => {
      // Datos de prueba
      const imagen = { id: 1, filePath: '/imagenes2d/test.jpg', descripcion: 'Descripción antigua' };
      const updatedImagen = { ...imagen, descripcion: 'Descripción nueva' };

      // Configurar mocks
      mockImagen2dRepository.findOneBy.mockResolvedValue(imagen);
      mockImagen2dRepository.save.mockResolvedValue(updatedImagen);

      // Ejecutar
      const result = await service.updateDescription(1, 'Descripción nueva');

      // Verificaciones
      expect(mockImagen2dRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockImagen2dRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ descripcion: 'Descripción nueva' }),
      );
      expect(result).toEqual(updatedImagen);
    });

    it('debería lanzar NotFoundException si la imagen no existe', async () => {
      // Configurar mocks
      mockImagen2dRepository.findOneBy.mockResolvedValue(null);

      // Ejecutar y verificar
      await expect(service.updateDescription(1, 'Descripción nueva')).rejects.toThrow(
        new NotFoundException(`Imagen con ID 1 no encontrada.`),
      );
    });
  });

  // Tests para remove
  describe('remove', () => {
    it('debería eliminar una imagen existente', async () => {
      // Datos de prueba
      const imagen = { id: 1, filePath: '/imagenes2d/test.jpg' };

      // Configurar mocks
      mockImagen2dRepository.findOneBy.mockResolvedValue(imagen);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
      mockImagen2dRepository.remove.mockResolvedValue(undefined);

      // Ejecutar
      await service.remove(1);

      // Verificaciones
      expect(mockImagen2dRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('/imagenes2d/test.jpg'));
      expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('/imagenes2d/test.jpg'));
      expect(mockImagen2dRepository.remove).toHaveBeenCalledWith(imagen);
    });

    it('debería lanzar NotFoundException si la imagen no existe', async () => {
      // Configurar mocks
      mockImagen2dRepository.findOneBy.mockResolvedValue(null);

      // Ejecutar y verificar
      await expect(service.remove(1)).rejects.toThrow(
        new NotFoundException(`Imagen con ID 1 no encontrada.`),
      );
    });

    it('debería manejar el caso donde el archivo no existe en el sistema de archivos', async () => {
      // Datos de prueba
      const imagen = { id: 1, filePath: '/imagenes2d/test.jpg' };

      // Configurar mocks
      mockImagen2dRepository.findOneBy.mockResolvedValue(imagen);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockImagen2dRepository.remove.mockResolvedValue(undefined);

      // Ejecutar
      await service.remove(1);

      // Verificaciones
      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(mockImagen2dRepository.remove).toHaveBeenCalledWith(imagen);
    });
  });
});