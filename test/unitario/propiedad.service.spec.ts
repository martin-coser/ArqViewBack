import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { PropiedadService } from 'src/propiedad/propiedad.service';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { Localidad } from 'src/localidad/entities/localidad.entity';
import { TipoDePropiedad } from 'src/tipo-de-propiedad/entities/tipo-de-propiedad.entity';
import { EstiloArquitectonico } from 'src/estilo-arquitectonico/entities/estilo-arquitectonico.entity';
import { TipoDeVisualizacion } from 'src/tipo-de-visualizacion/entities/tipo-de-visualizacion.entity';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';
import { Imagen2dService } from 'src/imagen2d/imagen2d.service';
import { Imagen360Service } from 'src/imagen360/imagen360.service';
import { Modelo3DService } from 'src/modelo3d/modelo3d.service';
import { CreatePropiedadDto } from 'src/propiedad/dto/create-propiedad.dto';
import { UpdatePropiedadDto } from 'src/propiedad/dto/update-propiedad.dto';
import { TipoOperacion } from 'src/propiedad/entities/TipoOperacion.enum';

// --- MOCKS ---
// **CORRECCIÓN: Función fábrica para crear mocks de repositorio independientes**
const createMockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  find: jest.fn(),
  findBy: jest.fn(),
  remove: jest.fn(),
});

// Mocks específicos para los servicios
const mockImagen2dService = {
  findByPropiedad: jest.fn(),
  remove: jest.fn(),
  analyzeImage: jest.fn(),
};
const mockImagen360Service = { findByPropiedad: jest.fn(), remove: jest.fn() };
const mockModelo3DService = { findByPropiedad: jest.fn(), remove: jest.fn() };
const mockEventEmitter = { emit: jest.fn() };

// --- MOCKS DE DATOS --- (Sin cambios aquí)
const mockLocalidadData = { id: 1, nombre: 'Test Localidad' } as Localidad;
const mockTipoPropiedadData = { id: 1, nombre: 'Test Tipo' } as TipoDePropiedad;
const mockEstiloData = { id: 1, nombre: 'Test Estilo' } as EstiloArquitectonico;
const mockVisualizacionData = { id: 1, nombre: '2D' } as TipoDeVisualizacion;
const mockInmobiliariaData = { id: 1, nombre: 'Test Inmo' } as Inmobiliaria;
const mockCreateDto: CreatePropiedadDto = { /* ...datos... */
  nombre: 'Prop Test',
  descripcion: 'Desc Test',
  direccion: 'Calle Falsa 123',
  localidad: 1,
  precio: 100000,
  superficie: 100,
  tipoPropiedad: 1,
  tipoVisualizaciones: [1],
  estiloArquitectonico: 1,
  cantidadBanios: 1,
  cantidadDormitorios: 2,
  cantidadAmbientes: 3,
  tipoOperacion: TipoOperacion.VENTA,
  latitud: -34,
  longitud: -58,
  inmobiliaria_id: 1,
};
const mockPropiedadCreada = { id: 1, ...mockCreateDto, localidad: mockLocalidadData, tipoPropiedad: mockTipoPropiedadData, estiloArquitectonico: mockEstiloData, tipoVisualizaciones: [mockVisualizacionData], inmobiliaria: mockInmobiliariaData } as Propiedad;


describe('PropiedadService', () => {
  let service: PropiedadService;
  let propiedadRepository: jest.Mocked<Repository<Propiedad>>;
  let localidadRepository: jest.Mocked<Repository<Localidad>>;
  let tipoPropiedadRepository: jest.Mocked<Repository<TipoDePropiedad>>;
  let estiloArquitectonicoRepository: jest.Mocked<Repository<EstiloArquitectonico>>;
  let tipoDeVisualizacionRepository: jest.Mocked<Repository<TipoDeVisualizacion>>;
  let inmobiliariaRepository: jest.Mocked<Repository<Inmobiliaria>>;
  let imagen2dService: jest.Mocked<Imagen2dService>;
  let imagen360Service: jest.Mocked<Imagen360Service>;
  let modelo3DService: jest.Mocked<Modelo3DService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  jest.useFakeTimers();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropiedadService,
        { provide: getRepositoryToken(Propiedad), useValue: createMockRepository() },
        { provide: getRepositoryToken(Localidad), useValue: createMockRepository() },
        { provide: getRepositoryToken(TipoDePropiedad), useValue: createMockRepository() },
        { provide: getRepositoryToken(EstiloArquitectonico), useValue: createMockRepository() },
        { provide: getRepositoryToken(TipoDeVisualizacion), useValue: createMockRepository() },
        { provide: getRepositoryToken(Inmobiliaria), useValue: createMockRepository() },
        // Mocks de servicios 
        { provide: Imagen2dService, useValue: mockImagen2dService },
        { provide: Imagen360Service, useValue: mockImagen360Service },
        { provide: Modelo3DService, useValue: mockModelo3DService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    // Obtener las instancias
    service = module.get<PropiedadService>(PropiedadService);
    propiedadRepository = module.get(getRepositoryToken(Propiedad));
    localidadRepository = module.get(getRepositoryToken(Localidad));
    tipoPropiedadRepository = module.get(getRepositoryToken(TipoDePropiedad));
    estiloArquitectonicoRepository = module.get(getRepositoryToken(EstiloArquitectonico));
    tipoDeVisualizacionRepository = module.get(getRepositoryToken(TipoDeVisualizacion));
    inmobiliariaRepository = module.get(getRepositoryToken(Inmobiliaria));
    imagen2dService = module.get(Imagen2dService);
    imagen360Service = module.get(Imagen360Service);
    modelo3DService = module.get(Modelo3DService);
    eventEmitter = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('Debería crear una propiedad correctamente y llamar a analyzeImage', async () => {
      // Arrange (Configurar mocks específicos para ESTE test)
      propiedadRepository.findOneBy.mockResolvedValue(null);
      localidadRepository.findOne.mockResolvedValue(mockLocalidadData);
      tipoPropiedadRepository.findOne.mockResolvedValue(mockTipoPropiedadData);
      estiloArquitectonicoRepository.findOne.mockResolvedValue(mockEstiloData);
      tipoDeVisualizacionRepository.findBy.mockResolvedValue([mockVisualizacionData]);
      propiedadRepository.create.mockReturnValue(mockPropiedadCreada); // Configurar create para este test
      propiedadRepository.save.mockResolvedValue(mockPropiedadCreada);
      imagen2dService.findByPropiedad.mockResolvedValue([{ id: 1 } as any]);

      // Act
      const resultPromise = service.create(mockCreateDto);

      // Assert síncronos
      expect(propiedadRepository.findOneBy).toHaveBeenCalledWith({ direccion: 'Calle Falsa 123', localidad: { id: 1 } });
      // ... otras verificaciones síncronas ...

      // Resolvemos la promesa principal
      const result = await resultPromise;
      // Verificar create DESPUÉS de llamar al servicio
      expect(propiedadRepository.create).toHaveBeenCalled(); // <-- Ahora debería funcionar
      expect(propiedadRepository.save).toHaveBeenCalledWith(mockPropiedadCreada);

      // Timers y promesas asíncronas
      jest.runAllTimers();
      await Promise.resolve(); // Esperar microtareas

      // Assert asíncronos
      expect(imagen2dService.findByPropiedad).toHaveBeenCalledWith(mockPropiedadCreada.id);
      expect(imagen2dService.analyzeImage).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockPropiedadCreada);
    });

    // ... (resto de los tests de 'create' sin cambios) ...
    it('Debería lanzar ConflictException si la dirección ya existe', async () => {
        propiedadRepository.findOneBy.mockResolvedValue(mockPropiedadCreada);
        await expect(service.create(mockCreateDto)).rejects.toThrow(
          new ConflictException('La dirección ya existe'),
        );
        expect(propiedadRepository.save).not.toHaveBeenCalled(); // Asegurarse que save no se llame
      });
  
      it('Debería lanzar NotFoundException si una entidad relacionada no existe', async () => {
        propiedadRepository.findOneBy.mockResolvedValue(null);
        localidadRepository.findOne.mockResolvedValue(null);
        await expect(service.create(mockCreateDto)).rejects.toThrow(
          new NotFoundException(`Localidad con id 1 no existe`),
        );
        expect(propiedadRepository.save).not.toHaveBeenCalled(); // Asegurarse que save no se llame
      });
  });

  // --- Pruebas para update ---
  describe('update', () => {
    it('Debería actualizar una propiedad y emitir evento si hay cambios relevantes', async () => {
      const updateDto: UpdatePropiedadDto = { precio: 110000, descripcion: 'Nueva Desc', tipoVisualizaciones: [1] };
      const oldPropiedad = { ...mockPropiedadCreada };
      const updatedPropiedadSimulada = { ...oldPropiedad, ...updateDto, tipoVisualizaciones: [mockVisualizacionData] }; // Simular relaciones actualizadas

      // Mockear relaciones que se buscan en update
      tipoDeVisualizacionRepository.findBy.mockResolvedValue([mockVisualizacionData]);
      propiedadRepository.findOne.mockResolvedValue(oldPropiedad);
      propiedadRepository.save.mockResolvedValue(updatedPropiedadSimulada as any); // Castear

      const result = await service.update(1, updateDto);

      expect(propiedadRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });

      expect(propiedadRepository.save).toHaveBeenCalledWith(expect.objectContaining({
          ...updatedPropiedadSimulada, // Debe contener todos los campos actualizados

          tipoVisualizaciones: [mockVisualizacionData]
      }));
      expect(eventEmitter.emit).toHaveBeenCalledWith('propiedad.actualizada', expect.any(Object)); 
      expect(result).toEqual(updatedPropiedadSimulada);
    });

     it('Debería lanzar NotFoundException si la propiedad a actualizar no existe', async () => {
       propiedadRepository.findOne.mockResolvedValue(null);
       await expect(service.update(999, { precio: 120000, tipoVisualizaciones: [1] })).rejects.toThrow(NotFoundException);
       expect(eventEmitter.emit).not.toHaveBeenCalled();
     });

     it('No debería emitir evento si no hay cambios relevantes para notificación', async () => {
       const updateDto: UpdatePropiedadDto = { latitud: -35, tipoVisualizaciones: [1] };
       const oldPropiedad = { ...mockPropiedadCreada };
       const updatedPropiedadSimulada = { ...oldPropiedad, ...updateDto, tipoVisualizaciones: [mockVisualizacionData] }; // Simular

       tipoDeVisualizacionRepository.findBy.mockResolvedValue([mockVisualizacionData]);
       propiedadRepository.findOne.mockResolvedValue(oldPropiedad);
       propiedadRepository.save.mockResolvedValue(updatedPropiedadSimulada as any);

       await service.update(1, updateDto);

       expect(propiedadRepository.save).toHaveBeenCalled();
       expect(eventEmitter.emit).not.toHaveBeenCalled();
     });
  });

  // --- Pruebas para remove --- 
   describe('remove', () => {
     it('Debería eliminar una propiedad y llamar a remove de sus archivos asociados', async () => {
       const mockImagen2d = { id: 101 };
       const mockImagen360 = { id: 201 };
       const mockModelo3d = { id: 301 };

       imagen2dService.findByPropiedad.mockResolvedValue([mockImagen2d as any]);
       imagen360Service.findByPropiedad.mockResolvedValue([mockImagen360 as any]);
       modelo3DService.findByPropiedad.mockResolvedValue([mockModelo3d as any]);
       // findOne del servicio llama a findOneBy del repo
       propiedadRepository.findOneBy.mockResolvedValue(mockPropiedadCreada);
       propiedadRepository.remove.mockResolvedValue(mockPropiedadCreada as any); 

       await service.remove(1);

       expect(imagen2dService.remove).toHaveBeenCalledWith(mockImagen2d.id);
       expect(imagen360Service.remove).toHaveBeenCalledWith(mockImagen360.id);
       expect(modelo3DService.remove).toHaveBeenCalledWith(mockModelo3d.id);
       // Verificar que findOne (que llama a findOneBy) fue llamado antes de remove
       expect(propiedadRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
       expect(propiedadRepository.remove).toHaveBeenCalledWith(mockPropiedadCreada);
     });

     it('Debería lanzar NotFoundException si la propiedad a eliminar no existe', async () => {
       propiedadRepository.findOneBy.mockResolvedValue(null); // findOneBy es llamado por findOne

       await expect(service.remove(999)).rejects.toThrow(
         new NotFoundException(`La propiedad con el id 999 no existe`), // Mensaje de findOne
       );
       expect(propiedadRepository.remove).not.toHaveBeenCalled();
     });
   });
});