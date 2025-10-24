import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';

// Importa el servicio y las clases necesarias
import { EstiloArquitectonicoService } from '../../src/estilo-arquitectonico/estilo-arquitectonico.service';
import { EstiloArquitectonico } from '../../src/estilo-arquitectonico/entities/estilo-arquitectonico.entity';
import { CreateEstiloArquitectonicoDto } from '../../src/estilo-arquitectonico/dto/create-estilo-arquitectonico.dto';
import { UpdateEstiloArquitectonicoDto } from '../../src/estilo-arquitectonico/dto/update-estilo-arquitectonico.dto';

// --- Simulación del Repositorio (Mockito/Jest Mock) ---
// Define un mock para el repositorio de TypeORM con los métodos utilizados.
const mockEstiloArquitectonicoRepository = {
  // Simula los métodos del repositorio que se usan en el servicio
  findOneBy: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

describe('EstiloArquitectonicoService', () => {
  let service: EstiloArquitectonicoService;
  let repository: Repository<EstiloArquitectonico>;

  // Datos de prueba comunes
  const estiloMock: EstiloArquitectonico = {
    id: 1,
    nombre: 'Barroco',
    descripcion: 'Estilo recargado y dramático',
  } as EstiloArquitectonico; // el as significa que estamos forzando el tipo
  
  const createDto: CreateEstiloArquitectonicoDto = { 
    nombre: 'Gótico', 
    descripcion: 'Arcos ojivales' 
  };
  
  const nuevoEstiloMock = { id: 2, ...createDto } as EstiloArquitectonico;

  // Configuración del módulo de pruebas antes de cada test
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstiloArquitectonicoService,
        {
          // Proporciona el token del repositorio para inyección
          provide: getRepositoryToken(EstiloArquitectonico),
          // Usa la implementación mock
          useValue: mockEstiloArquitectonicoRepository,
        },
      ],
    }).compile();

    service = module.get<EstiloArquitectonicoService>(EstiloArquitectonicoService);
    // Obtiene el mock del repositorio para verificar las llamadas
    repository = module.get<Repository<EstiloArquitectonico>>(getRepositoryToken(EstiloArquitectonico));
    
    // Limpia los mocks antes de cada prueba para asegurar independencia
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  // --- Casos de Prueba para 'create' ---
  
  describe('create', () => {
    it('debe crear y devolver un nuevo estilo arquitectónico (éxito)', async () => {
      // 1. Simular que el estilo NO existe
      jest.spyOn(repository, 'findOneBy').mockResolvedValue(null); 
      // 2. Simular la creación en memoria
      jest.spyOn(repository, 'create').mockReturnValue(nuevoEstiloMock);
      // 3. Simular el guardado en la BD
      jest.spyOn(repository, 'save').mockResolvedValue(nuevoEstiloMock);

      const result = await service.create(createDto);

      expect(repository.findOneBy).toHaveBeenCalledWith({ nombre: createDto.nombre });
      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(nuevoEstiloMock);
      expect(result).toEqual(nuevoEstiloMock);
    });

    it('debe lanzar ConflictException si el estilo ya existe', async () => {

      jest.spyOn(repository, 'findOneBy').mockResolvedValue(estiloMock); // Simula que ya existe

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      expect(repository.findOneBy).toHaveBeenCalledWith({ nombre: createDto.nombre });
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
  
  // --- Casos de Prueba para 'findAll' ---

  describe('findAll', () => {
    it('debe devolver un array de estilos arquitectónicos (éxito)', async () => {
      const estilosMock: EstiloArquitectonico[] = [estiloMock, nuevoEstiloMock];
      jest.spyOn(repository, 'find').mockResolvedValue(estilosMock);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalled();
      expect(result).toEqual(estilosMock);
    });
  });

  // --- Casos de Prueba para 'findOne' ---

  describe('findOne', () => {
    it('debe devolver un estilo arquitectónico por ID (éxito)', async () => {
      jest.spyOn(repository, 'findOneBy').mockResolvedValue(estiloMock);

      const result = await service.findOne(estiloMock.id);

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: estiloMock.id });
      expect(result).toEqual(estiloMock);
    });

    it('debe lanzar NotFoundException si el estilo no existe', async () => {
      jest.spyOn(repository, 'findOneBy').mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 999 });
    });
  });
  
  // --- Casos de Prueba para 'update' ---

  describe('update', () => {
    const idExistente = estiloMock.id;
    // Espía el método 'findOne' del servicio, ya que 'update' lo llama internamente
    let findOneSpy: jest.SpyInstance;

    beforeEach(() => {
        findOneSpy = jest.spyOn(service, 'findOne'); 
    });

    it('debe actualizar y devolver el estilo (éxito, cambia nombre)', async () => {
      const updateDto: UpdateEstiloArquitectonicoDto = { nombre: 'Rococó' };
      const estiloActualizado = { ...estiloMock, nombre: 'Rococó' };

      // Simula que el estilo original existe
      findOneSpy.mockResolvedValue({ ...estiloMock }); 
      // Simula que el nuevo nombre NO existe
      jest.spyOn(repository, 'findOneBy').mockResolvedValue(null); 
      // Simula el guardado
      jest.spyOn(repository, 'save').mockResolvedValue(estiloActualizado);

      const result = await service.update(idExistente, updateDto);

      expect(findOneSpy).toHaveBeenCalledWith(idExistente);
      expect(repository.findOneBy).toHaveBeenCalledWith({ nombre: updateDto.nombre });
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Rococó' }));
      expect(result).toEqual(estiloActualizado);
    });
    
    it('debe actualizar sin verificar el nombre si solo cambia otros campos (éxito)', async () => {
        const updateDtoSoloDesc: UpdateEstiloArquitectonicoDto = { descripcion: 'Descripción nueva' };
        const estiloActualizado = { ...estiloMock, descripcion: 'Descripción nueva' };

        findOneSpy.mockResolvedValue({ ...estiloMock }); 
        jest.spyOn(repository, 'findOneBy').mockClear(); // Limpia el mock
        jest.spyOn(repository, 'save').mockResolvedValue(estiloActualizado);

        await service.update(idExistente, updateDtoSoloDesc);

        expect(repository.findOneBy).not.toHaveBeenCalled(); // No debe verificar nombre
        expect(repository.save).toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si el nuevo nombre ya existe en otra entidad', async () => {
      const updateDto: UpdateEstiloArquitectonicoDto = { nombre: 'Rococó' };
      const estiloExistenteConMismoNombre = { id: 2, nombre: 'Rococó' } as EstiloArquitectonico;

      findOneSpy.mockResolvedValue({ ...estiloMock }); // Estilo a actualizar
      jest.spyOn(repository, 'findOneBy').mockResolvedValue(estiloExistenteConMismoNombre); // Nuevo nombre ya existe

      await expect(service.update(idExistente, updateDto)).rejects.toThrow(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
    });
    
    it('debe lanzar NotFoundException si el estilo a actualizar no existe', async () => {
      const error = new NotFoundException(`El estilo arquitectonico con el id 999 no existe`);
      findOneSpy.mockRejectedValue(error); // Simula el error de findOne

      await expect(service.update(999, { nombre: 'Test' })).rejects.toThrow(NotFoundException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  // --- Casos de Prueba para 'remove' ---

  describe('remove', () => {
    const idExistente = estiloMock.id;
    // Espía el método 'findOne' del servicio, ya que 'remove' lo llama internamente
    let findOneSpy: jest.SpyInstance;

    beforeEach(() => {
        findOneSpy = jest.spyOn(service, 'findOne');
    });

    it('debe eliminar un estilo arquitectónico (éxito)', async () => {
      findOneSpy.mockResolvedValue(estiloMock); // Simula que el estilo existe
      jest.spyOn(repository, 'remove').mockResolvedValue(undefined as any); // Simula la eliminación

      await expect(service.remove(idExistente)).resolves.toBeUndefined();

      expect(findOneSpy).toHaveBeenCalledWith(idExistente);
      expect(repository.remove).toHaveBeenCalledWith(estiloMock);
    });

    it('debe lanzar NotFoundException si el estilo a eliminar no existe', async () => {
      const error = new NotFoundException(`El estilo arquitectonico con el id 999 no existe`);
      findOneSpy.mockRejectedValue(error); // Simula que findOne lanza la excepción

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(findOneSpy).toHaveBeenCalledWith(999);
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });
});