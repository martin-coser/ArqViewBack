import { Test, TestingModule } from '@nestjs/testing';
import { SuscripcionService } from './suscripcion.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';
import { Repository } from 'typeorm';
import { Comprobante } from './entities/comprobante.entity';
import { Cuenta } from 'src/auth/entities/cuenta.entity';
import { InmobiliariaService } from 'src/inmobiliaria/inmobiliaria.service';

describe('SuscripcionService', () => {
  let service: SuscripcionService;
  let inmobiliariaRepository: Repository<Inmobiliaria>;
  let cuentaRepository: Repository<Cuenta>;
  let comprobanteRepository: Repository<Comprobante>;
  let inmobiliariaService: InmobiliariaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuscripcionService,
        {
          provide: getRepositoryToken(Inmobiliaria),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Cuenta),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Comprobante),
          useClass: Repository,
        },
        {
          provide: InmobiliariaService,
          useValue: {
            updatePlan: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SuscripcionService>(SuscripcionService);
    inmobiliariaRepository = module.get<Repository<Inmobiliaria>>(getRepositoryToken(Inmobiliaria));
    cuentaRepository = module.get<Repository<Cuenta>>(getRepositoryToken(Cuenta));
    comprobanteRepository = module.get<Repository<Comprobante>>(getRepositoryToken(Comprobante));
    inmobiliariaService = module.get<InmobiliariaService>(InmobiliariaService);

    // Mock de métodos
    jest.spyOn(cuentaRepository, 'findOneBy').mockResolvedValue({ id: 1 } as Cuenta);
    jest.spyOn(inmobiliariaRepository, 'findOneBy').mockResolvedValue({
      id: 1,
      cuenta: { id: 1 },
      fechaSuscripcion: null,
      fechaVencimiento: null,
      plan: 'BASICO',
    } as Inmobiliaria);
    jest.spyOn(comprobanteRepository, 'save').mockResolvedValue({} as Comprobante);
  });

  it('debería actualizar a BASICO y limpiar fechas si el pago es fuera de plazo', async () => {
    // Configurar fecha actual después de la fecha límite
    const fechaSuscripcion = new Date('2025-09-01');
    const fechaVencimiento = new Date('2025-09-30');
    const fechaLimite = new Date('2025-10-03');
    const fechaActual = new Date('2025-10-04');

    jest.spyOn(global, 'Date').mockImplementation(() => fechaActual as any);

    // Mockear la inmobiliaria con fechas iniciales
    jest.spyOn(inmobiliariaRepository, 'findOneBy').mockResolvedValueOnce({
      id: 1,
      cuenta: { id: 1 },
      fechaSuscripcion,
      fechaVencimiento,
      plan: 'PREMIUM',
    } as Inmobiliaria);

    // Ejecutar el método
    await expect(service.abonar(1)).rejects.toThrow(
      'El pago no se realizó porque la fecha esta fuera del plazo permitido. El plan ha sido cambiado a básico.',
    );

    // Verificar que se actualizó el plan a BASICO
    expect(inmobiliariaService.updatePlan).toHaveBeenCalledWith(1, 'BASICO');
    expect(inmobiliariaRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        fechaSuscripcion: null,
        fechaVencimiento: null,
      }),
    );
  });

  it('debería actualizar a PREMIUM y generar comprobante si el pago es dentro de plazo', async () => {
    // Configurar fecha actual antes de la fecha límite
    const fechaSuscripcion = new Date('2025-09-01');
    const fechaVencimiento = new Date('2025-09-30');
    const fechaLimite = new Date('2025-10-03');
    const fechaActual = new Date('2025-10-02');

    jest.spyOn(global, 'Date').mockImplementation(() => fechaActual as any);

    // Mockear la inmobiliaria con fechas iniciales
    jest.spyOn(inmobiliariaRepository, 'findOneBy').mockResolvedValueOnce({
      id: 1,
      cuenta: { id: 1 },
      fechaSuscripcion,
      fechaVencimiento,
      plan: 'BASICO',
    } as Inmobiliaria);

    // Ejecutar el método
    const result = await service.abonar(1);

    // Verificar que se actualizó el plan a PREMIUM
    expect(inmobiliariaService.updatePlan).toHaveBeenCalledWith(1, 'PREMIUM');
    expect(comprobanteRepository.save).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('debería manejar la primera suscripción correctamente', async () => {
    // Configurar fecha actual
    const fechaActual = new Date('2025-09-16');

    jest.spyOn(global, 'Date').mockImplementation(() => fechaActual as any);

    // Mockear la inmobiliaria sin fechas iniciales
    jest.spyOn(inmobiliariaRepository, 'findOneBy').mockResolvedValueOnce({
      id: 1,
      cuenta: { id: 1 },
      fechaSuscripcion: null,
      fechaVencimiento: null,
      plan: 'BASICO',
    } as Inmobiliaria);

    const result = await service.abonar(1);

    expect(inmobiliariaRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        fechaSuscripcion: expect.any(Date),
        fechaVencimiento: expect.any(Date),
      }),
    );
    expect(inmobiliariaService.updatePlan).toHaveBeenCalledWith(1, 'PREMIUM');
    expect(comprobanteRepository.save).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});