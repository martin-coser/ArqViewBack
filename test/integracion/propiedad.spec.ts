import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ConflictException, NotFoundException, HttpStatus } from '@nestjs/common';
import request from 'supertest'; // Usar importación por defecto para supertest
import { PropiedadController } from 'src/propiedad/propiedad.controller';
import { PropiedadService } from 'src/propiedad/propiedad.service';
import { CreatePropiedadDto } from 'src/propiedad/dto/create-propiedad.dto';
import { TipoOperacion } from 'src/propiedad/entities/TipoOperacion.enum';
import { RecomendacionService } from 'src/recomendacion/recomendacion.service';
import { RolesGuard } from 'src/guards/roles.guard'; 
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard'; 

// --- Mocks de Datos y Respuestas ---
const mockCreatePayload: CreatePropiedadDto = {
  nombre: 'Prop Test Integ',
  descripcion: 'Desc Test Integ',
  direccion: 'Av Siempreviva 742',
  localidad: 1,
  precio: 120000,
  superficie: 90,
  tipoPropiedad: 1,
  tipoVisualizaciones: [1],
  estiloArquitectonico: 1,
  cantidadBanios: 1,
  cantidadDormitorios: 2,
  cantidadAmbientes: 3,
  tipoOperacion: TipoOperacion.VENTA,
  latitud: -34.1,
  longitud: -58.1,
  inmobiliaria_id: 1,
};

const mockPropiedadCreated = {
  id: 1,
  ...mockCreatePayload, // Incluir campos del DTO
  // Simular entidades unidas (reemplazar con datos mock reales si es necesario)
  localidad: { id: 1 },
  tipoPropiedad: { id: 1 },
  estiloArquitectonico: { id: 1 },
  tipoVisualizaciones: [{ id: 1 }],
  inmobiliaria: { id: 1 },
};

// --- Mock de Servicios ---
const mockPropiedadService = {
  create: jest.fn(),
};

const mockRecomendacionService = {
  notificarNuevaPropiedad: jest.fn(),
};

// --- Mock de Guardias (Enfoque simple para tests de integración) ---
// Podemos mockear los guardias para que siempre permitan el acceso en tests de controlador
const mockJwtAuthGuard = { canActivate: jest.fn(() => true) };
const mockRolesGuard = { canActivate: jest.fn(() => true) };


describe('PropiedadController (Integration - POST /propiedad/create)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PropiedadController],
      providers: [
        { provide: PropiedadService, useValue: mockPropiedadService },
        { provide: RecomendacionService, useValue: mockRecomendacionService },
        // Añadir proveedores de repositorios dummy si el controlador los inyecta (usualmente no es necesario)
      ],
    })
    // Sobreescribir Guardias para propósitos de testing
    .overrideGuard(JwtAuthGuard).useValue(mockJwtAuthGuard)
    .overrideGuard(RolesGuard).useValue(mockRolesGuard)
    .compile();

    app = moduleFixture.createNestApplication();
    // Aplicar ValidationPipe globalmente
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true })); // whitelist asegura que solo pasen propiedades definidas en el DTO
    await app.init();
  });

  afterEach(() => {
    // Limpiar mocks después de cada test
    jest.clearAllMocks();
  });

  // CASO 1: CREACIÓN EXITOSA (201 CREATED)
  it('Debería crear una propiedad y devolver 201 CREATED', async () => {
    // Arrange: Mockear el servicio para que devuelva la propiedad creada
    mockPropiedadService.create.mockResolvedValue(mockPropiedadCreated);
    // Mockear recomendacionService para que resuelva sin error
    mockRecomendacionService.notificarNuevaPropiedad.mockResolvedValue(undefined);

    // Act & Assert
    await request(app.getHttpServer())
      .post('/propiedad/create') // Endpoint a probar
      .send(mockCreatePayload) // Enviar el cuerpo de la petición
      .expect(HttpStatus.CREATED) // Verificar el código de estado HTTP
      .expect(res => {
        // Assert: Verificar que el cuerpo de la respuesta coincida con el objeto esperado
        expect(res.body).toEqual(mockPropiedadCreated);
      });

    // Assert: Verificar que los métodos de servicio fueron llamados correctamente
    expect(mockPropiedadService.create).toHaveBeenCalledWith(mockCreatePayload);
    // Assert: Verificar que el servicio de recomendación fue llamado después de la creación exitosa
    expect(mockRecomendacionService.notificarNuevaPropiedad).toHaveBeenCalledWith(mockPropiedadCreated.id);
  });

  // CASO 2: FALLA POR VALIDACIÓN (400 BAD REQUEST - Nombre faltante)
  it('Debería fallar con 400 BAD REQUEST si falta un campo requerido(ej. nombre) ', async () => {
    // Arrange: Crear un payload inválido (sin 'nombre')
    const { nombre, ...invalidPayload } = mockCreatePayload;

    // Act & Assert
    await request(app.getHttpServer())
      .post('/propiedad/create')
      .send(invalidPayload)
      .expect(HttpStatus.BAD_REQUEST) // Esperar un 400
      .expect(res => {
        // Assert: Verificar que la respuesta contenga mensajes de error de validación
        expect(res.body.message).toEqual(expect.arrayContaining([expect.stringContaining('nombre should not be empty')]));
      });

    // Assert: Verificar que el servicio NO fue llamado
    expect(mockPropiedadService.create).not.toHaveBeenCalled();
    expect(mockRecomendacionService.notificarNuevaPropiedad).not.toHaveBeenCalled();
  });

  // CASO 3: FALLA POR CONFLICTO (409 CONFLICT - Simular error del servicio)
  it('Debería devolver 409 CONFLICT si el servicio lanza ConflictException (ej. Dirección duplicada)', async () => {
    // Arrange: Mockear el servicio para que lance una ConflictException
    const conflictError = new ConflictException('La dirección ya existe');
    mockPropiedadService.create.mockRejectedValue(conflictError);

    // Act & Assert
    await request(app.getHttpServer())
      .post('/propiedad/create')
      .send(mockCreatePayload)
      .expect(HttpStatus.CONFLICT) // Esperar un 409
      .expect(res => {
        // Assert: Verificar que el cuerpo de la respuesta contenga el mensaje de error de conflicto
        expect(res.body.message).toContain('La dirección ya existe');
      });

    // Assert: Verificar que el servicio fue llamado
    expect(mockPropiedadService.create).toHaveBeenCalledWith(mockCreatePayload);
    // Assert: Verificar que el servicio de recomendación NO fue llamado porque la creación falló
    expect(mockRecomendacionService.notificarNuevaPropiedad).not.toHaveBeenCalled();
  });

  // CASO 4: FALLA POR NOT FOUND (404 NOT FOUND - Simular error del servicio)
  it('Debería devolver 404 NOT FOUND si el servicio lanza NotFoundException (ej. Localidad no existe)', async () => {
    // Arrange: Mockear el servicio para que lance una NotFoundException
    const notFoundError = new NotFoundException('Localidad con id 999 no existe');
    mockPropiedadService.create.mockRejectedValue(notFoundError);

    // Act & Assert
    await request(app.getHttpServer())
      .post('/propiedad/create')
      .send(mockCreatePayload)
      .expect(HttpStatus.NOT_FOUND) // Esperar un 404
      .expect(res => {
        // Assert: Verificar que el cuerpo de la respuesta contenga el mensaje de error "not found"
        expect(res.body.message).toContain('Localidad con id 999 no existe');
      });

    // Assert: Verificar que el servicio fue llamado
    expect(mockPropiedadService.create).toHaveBeenCalledWith(mockCreatePayload);
    // Assert: Verificar que el servicio de recomendación NO fue llamado porque la creación falló
    expect(mockRecomendacionService.notificarNuevaPropiedad).not.toHaveBeenCalled();
  });

  afterAll(async () => {
    // Cerrar la instancia de la aplicación NestJS
    await app.close();
  });
});