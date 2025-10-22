import { Test, TestingModule } from '@nestjs/testing';
import { Imagen360Service } from '../../src/imagen360/imagen360.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Imagen360 } from '../../src/imagen360/entities/imagen360.entity';
import { Propiedad } from '../../src/propiedad/entities/propiedad.entity';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { UploadImagen360Dto } from '../../src/imagen360/dto/UploadImagen360Dto';
import { NotFoundException } from '@nestjs/common';
import path from 'path';
import { InmobiliariaService } from '../../src/inmobiliaria/inmobiliaria.service';

// Mockear fs
jest.mock('fs');

describe('Imagen360Service', () => {
  let service: Imagen360Service;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let imagen360Repository: Repository<Imagen360>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let propiedadRepository: Repository<Propiedad>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let inmobiliariaService: InmobiliariaService;

  const mockImagen360Repository = {
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
        Imagen360Service,
        {
          provide: getRepositoryToken(Imagen360),
          useValue: mockImagen360Repository,
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

    service = module.get<Imagen360Service>(Imagen360Service);
    imagen360Repository = module.get<Repository<Imagen360>>(getRepositoryToken(Imagen360));
    propiedadRepository = module.get<Repository<Propiedad>>(getRepositoryToken(Propiedad));
    inmobiliariaService = module.get<InmobiliariaService>(InmobiliariaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upload', () => {
    it('debería subir una imagen 360 correctamente y devolver la URL', async () => {
      const file = { filename: 'test360.jpg', path: '/tmp/test360.jpg' } as Express.Multer.File;
      const dto: UploadImagen360Dto = { descripcion: 'Imagen 360 de prueba', propiedad: 1 };
      const propiedad = { id: 1, nombre: 'Propiedad 1' };
      const savedImagen = {
        id: 1,
        filePath: '/imagenes360/test360.jpg',
        descripcion: 'Imagen 360 de prueba',
        propiedad,
      };

      mockPropiedadRepository.findOneBy.mockResolvedValue(propiedad);
      mockImagen360Repository.save.mockResolvedValue(savedImagen);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      const result = await service.upload(file, dto);

      expect(mockPropiedadRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockImagen360Repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '/imagenes360/test360.jpg',
          descripcion: 'Imagen 360 de prueba',
          propiedad,
        }),
      );
      expect(result).toEqual({ imageUrl: '/imagenes360/test360.jpg' });
    });

    it('debería lanzar NotFoundException si la propiedad no existe', async () => {
      const file = { filename: 'test360.jpg', path: '/tmp/test360.jpg' } as Express.Multer.File;
      const dto: UploadImagen360Dto = { descripcion: 'Imagen 360 de prueba', propiedad: 1 };

      mockPropiedadRepository.findOneBy.mockResolvedValue(null);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      await expect(service.upload(file, dto)).rejects.toThrow(
        new NotFoundException(`Propiedad con ID 1 no encontrada.`),
      );
      expect(fs.unlinkSync).toHaveBeenCalledWith(file.path);
    });

    it('debería subir una imagen 360 sin descripción', async () => {
      const file = { filename: 'test360.jpg', path: '/tmp/test360.jpg' } as Express.Multer.File;
      const dto: UploadImagen360Dto = {
        propiedad: 1,
        descripcion: '',
      };
      const propiedad = { id: 1, nombre: 'Propiedad 1' };
      const savedImagen = {
        id: 1,
        filePath: '/imagenes360/test360.jpg',
        descripcion: undefined,
        propiedad,
      };

      mockPropiedadRepository.findOneBy.mockResolvedValue(propiedad);
      mockImagen360Repository.save.mockResolvedValue(savedImagen);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      const result = await service.upload(file, dto);

      expect(mockImagen360Repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '/imagenes360/test360.jpg',
          descripcion: undefined,
          propiedad,
        }),
      );
      expect(result).toEqual({ imageUrl: '/imagenes360/test360.jpg' });
    });
  });

  describe('remove', () => {
    it('debería eliminar una imagen 360 existente', async () => {
      const imagen = { id: 1, filePath: '/imagenes360/test360.jpg' };
      mockImagen360Repository.findOneBy.mockResolvedValue(imagen);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
      mockImagen360Repository.remove.mockResolvedValue(undefined);

      await service.remove(1);

      expect(mockImagen360Repository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining(path.normalize('imagenes360/test360.jpg')));
      expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining(path.normalize('imagenes360/test360.jpg')));
      expect(mockImagen360Repository.remove).toHaveBeenCalledWith(imagen);
    });

    it('debería lanzar NotFoundException si la imagen 360 no existe', async () => {
      mockImagen360Repository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(1)).rejects.toThrow(
        new NotFoundException(`Imagen con ID 1 no encontrada.`),
      );
    });

    it('debería manejar el caso donde el archivo no existe en el sistema de archivos', async () => {
      const imagen = { id: 1, filePath: '/imagenes360/test360.jpg' };
      mockImagen360Repository.findOneBy.mockResolvedValue(imagen);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockImagen360Repository.remove.mockResolvedValue(undefined);

      await service.remove(1);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(mockImagen360Repository.remove).toHaveBeenCalledWith(imagen);
    });
  });

  describe('findByPropiedad', () => {
    it('debería devolver imágenes 360 asociadas a una propiedad con plan premium', async () => {
      const propiedad = { id: 1, nombre: 'Propiedad 1' };
      const imagenes = [
        { id: 1, filePath: '/imagenes360/test1.jpg', propiedad },
        { id: 2, filePath: '/imagenes360/test2.jpg', propiedad },
      ];

      mockInmobiliariaService.esPremium.mockResolvedValue(true);
      mockPropiedadRepository.findOneBy.mockResolvedValue(propiedad);
      mockImagen360Repository.find.mockResolvedValue(imagenes);

      const result = await service.findByPropiedad(1);

      expect(mockInmobiliariaService.esPremium).toHaveBeenCalledWith(1);
      expect(mockPropiedadRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockImagen360Repository.find).toHaveBeenCalledWith({
        where: { propiedad: { id: 1 } },
      });
      expect(result).toEqual(imagenes);
    });

    it('debería devolver un array vacío si la inmobiliaria no tiene plan premium', async () => {
      mockInmobiliariaService.esPremium.mockResolvedValue(false);

      const result = await service.findByPropiedad(1);

      expect(mockInmobiliariaService.esPremium).toHaveBeenCalledWith(1);
      expect(mockPropiedadRepository.findOneBy).not.toHaveBeenCalled();
      expect(mockImagen360Repository.find).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('debería lanzar NotFoundException si la propiedad no existe', async () => {
      mockInmobiliariaService.esPremium.mockResolvedValue(true);
      mockPropiedadRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findByPropiedad(1)).rejects.toThrow(
        new NotFoundException(`Propiedad con ID 1 no encontrada.`),
      );
      expect(mockInmobiliariaService.esPremium).toHaveBeenCalledWith(1);
      expect(mockPropiedadRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockImagen360Repository.find).not.toHaveBeenCalled();
    });
  });
});