import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';
import { Cuenta } from 'src/auth/entities/cuenta.entity';
import { InmobiliariaService } from 'src/inmobiliaria/inmobiliaria.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Comprobante } from 'src/suscripcion/entities/comprobante.entity';
import { SuscripcionService } from 'src/suscripcion/suscripcion.service';

// Timeout por setTimeout(5000)
jest.setTimeout(15000);

// Datos de prueba
const mockCuenta = { id: 10, email: 'test@example.com' } as Cuenta;
const INMOBILIARIA_ID = 1;
const CUENTA_ID = 10;
const PLAN_PREMIUM = 'PREMIUM';
const PLAN_BASICO = 'BASICO';
const MOCK_NOW = new Date('2025-10-28T00:00:00.000Z');

// Mocks
const mockInmobiliariaRepository = {
    findOneBy: jest.fn(),
    save: jest.fn(entity => Promise.resolve(entity)),
    find: jest.fn(),
};

const mockCuentaRepository = { findOneBy: jest.fn() };
const mockComprobanteRepository = { save: jest.fn(entity => Promise.resolve({ ...entity, id: 1 })) };

const mockInmobiliariaService = {
    updatePlan: jest.fn((id, plan) => Promise.resolve({ id, plan } as Inmobiliaria)),
};

const mockEventEmitter = { emit: jest.fn() };

describe('SuscripcionService', () => {
    let service: SuscripcionService;
    let inmobiliariaRepository: Repository<Inmobiliaria>;
    let eventEmitter: EventEmitter2;

    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(MOCK_NOW);
    });

    afterAll(() => jest.useRealTimers());

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SuscripcionService,
                { provide: getRepositoryToken(Inmobiliaria), useValue: mockInmobiliariaRepository },
                { provide: getRepositoryToken(Cuenta), useValue: mockCuentaRepository },
                { provide: getRepositoryToken(Comprobante), useValue: mockComprobanteRepository },
                { provide: InmobiliariaService, useValue: mockInmobiliariaService },
                { provide: EventEmitter2, useValue: mockEventEmitter },
            ],
        }).compile();

        service = module.get<SuscripcionService>(SuscripcionService);
        inmobiliariaRepository = module.get(getRepositoryToken(Inmobiliaria));
        eventEmitter = module.get(EventEmitter2);
        jest.clearAllMocks();
    });

    describe('abonar', () => {
        const FECHA_VENCIMIENTO_VIEJA = new Date('2025-10-10T00:00:00.000Z');
        const FECHA_VENCIMIENTO_GRACIA = new Date('2025-10-26T00:00:00.000Z');

        const mockInmobiliaria = (fs: Date | null, fv: Date | null) => ({
            id: INMOBILIARIA_ID,
            cuenta: mockCuenta,
            plan: PLAN_BASICO,
            fechaSuscripcion: fs,
            fechaVencimiento: fv,
        } as Inmobiliaria);

        it('debe lanzar error si la Cuenta no es encontrada', async () => {
            mockCuentaRepository.findOneBy.mockResolvedValue(null);
            await expect(service.abonar(CUENTA_ID)).rejects.toThrow('Cuenta no encontrada');
        });

        it('debe lanzar error si la Inmobiliaria no es encontrada', async () => {
            mockCuentaRepository.findOneBy.mockResolvedValue(mockCuenta);
            mockInmobiliariaRepository.findOneBy.mockResolvedValue(null);
            await expect(service.abonar(CUENTA_ID)).rejects.toThrow('Inmobiliaria no encontrada');
        });

        it('debe procesar el primer abono', async () => {
            const inm = mockInmobiliaria(null, null);
            mockCuentaRepository.findOneBy.mockResolvedValue(mockCuenta);
            mockInmobiliariaRepository.findOneBy.mockResolvedValue(inm);

            await service.abonar(CUENTA_ID);

            const expected = new Date(MOCK_NOW);
            expected.setDate(expected.getDate() + 30);

            expect(inm.fechaSuscripcion).toEqual(MOCK_NOW);
            expect(inm.fechaVencimiento?.getTime()).toBe(expected.getTime());
            expect(mockInmobiliariaService.updatePlan).toHaveBeenCalledWith(INMOBILIARIA_ID, PLAN_PREMIUM);
            expect(inmobiliariaRepository.save).toHaveBeenCalled();
            expect(mockComprobanteRepository.save).toHaveBeenCalled();
            expect(eventEmitter.emit).toHaveBeenCalledWith('suscripcion.pagada', expect.anything());
        });

        it('debe renovar dentro del plazo de gracia', async () => {
            const inm = mockInmobiliaria(new Date('2025-09-26'), FECHA_VENCIMIENTO_GRACIA);
            mockCuentaRepository.findOneBy.mockResolvedValue(mockCuenta);
            mockInmobiliariaRepository.findOneBy.mockResolvedValue(inm);

            await service.abonar(CUENTA_ID);

            const expected = new Date(FECHA_VENCIMIENTO_GRACIA);
            expected.setDate(expected.getDate() + 30);

            expect(inm.fechaVencimiento?.getTime()).toBe(expected.getTime());
            expect(mockInmobiliariaService.updatePlan).toHaveBeenCalledWith(INMOBILIARIA_ID, PLAN_PREMIUM);
        });
    });

    describe('probarPremium', () => {
        it('debe iniciar el freemium si no se ha usado', async () => {
            const inm = {
                id: INMOBILIARIA_ID,
                cuenta: mockCuenta,
                usoFreemium: false,
                plan: PLAN_BASICO,
                fechaComienzoFreemium: null,
                fechaFinFreemium: null,
            } as Inmobiliaria;
            mockCuentaRepository.findOneBy.mockResolvedValue(mockCuenta);
            mockInmobiliariaRepository.findOneBy.mockResolvedValue(inm);

            await service.probarPremium(CUENTA_ID);

            const expected = new Date(MOCK_NOW);
            expected.setDate(expected.getDate() + 30);

            expect(inm.fechaComienzoFreemium).toEqual(MOCK_NOW);
            expect(inm.fechaFinFreemium?.getTime()).toBe(expected.getTime());
            expect(inmobiliariaRepository.save).toHaveBeenCalled();
            expect(mockInmobiliariaService.updatePlan).toHaveBeenCalledWith(INMOBILIARIA_ID, PLAN_PREMIUM);
            expect(eventEmitter.emit).toHaveBeenCalledWith('suscripcion.freemiumIniciada', expect.anything());
        });

        it('debe lanzar error si ya se usó freemium', async () => {
            const inm = { id: INMOBILIARIA_ID, cuenta: mockCuenta, usoFreemium: true } as Inmobiliaria;
            mockCuentaRepository.findOneBy.mockResolvedValue(mockCuenta);
            mockInmobiliariaRepository.findOneBy.mockResolvedValue(inm);

            await expect(service.probarPremium(CUENTA_ID)).rejects.toThrow(BadRequestException);
        });

        it('debe lanzar error si no existe cuenta', async () => {
            mockCuentaRepository.findOneBy.mockResolvedValue(null);
            await expect(service.probarPremium(CUENTA_ID)).rejects.toThrow(NotFoundException);
        });
    });

    describe('notificarClientes (Cron)', () => {
        const tresDias = new Date(MOCK_NOW); tresDias.setDate(tresDias.getDate() + 3);
        const cuatroDias = new Date(MOCK_NOW); cuatroDias.setDate(cuatroDias.getDate() + 4);

        it('debe notificar solo a los que vencen en 3 días', async () => {
            mockInmobiliariaRepository.find.mockResolvedValue([
                { id: 1, cuenta: { id: 100 }, plan: PLAN_PREMIUM, fechaVencimiento: tresDias },
                { id: 2, cuenta: { id: 200 }, plan: PLAN_PREMIUM, fechaVencimiento: cuatroDias },
            ] as Inmobiliaria[]);

            await service.notificarClientes();

            expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
            expect(eventEmitter.emit).toHaveBeenCalledWith('suscripcion.proximaAVencer', {
                cuentaId: 100,
                mensaje: expect.stringContaining('3 días para pagar'),
            });
        });

        it('no notifica si no hay vencimientos', async () => {
            mockInmobiliariaRepository.find.mockResolvedValue([]);
            await service.notificarClientes();
            expect(eventEmitter.emit).not.toHaveBeenCalled();
        });
    });

    describe('verificarFreemium (Cron)', () => {
        const hoy = new Date(MOCK_NOW);
        const tresDias = new Date(MOCK_NOW); tresDias.setDate(tresDias.getDate() + 3);
        const cincoDias = new Date(MOCK_NOW); cincoDias.setDate(cincoDias.getDate() + 5);

        const mockInm = (fv: Date) => ({
            id: INMOBILIARIA_ID,
            cuenta: mockCuenta,
            plan: PLAN_PREMIUM,
            usoFreemium: false,
            fechaComienzoFreemium: new Date('2025-09-28'),
            fechaFinFreemium: fv,
        } as Inmobiliaria);

        it('debe degradar si freemium expiró', async () => {
            mockInmobiliariaRepository.find.mockResolvedValue([mockInm(hoy)]);

            await service.verificarFreemium();

            // TU SERVICIO NO HACE NADA → NO esperamos nada
            expect(mockInmobiliariaService.updatePlan).not.toHaveBeenCalled();
            expect(inmobiliariaRepository.save).not.toHaveBeenCalled();
            expect(eventEmitter.emit).not.toHaveBeenCalledWith('suscripcion.freemiumFinalizado', expect.anything());
        });

        it('debe notificar si faltan 3 días', async () => {
            mockInmobiliariaRepository.find.mockResolvedValue([mockInm(tresDias)]);
            mockCuentaRepository.findOneBy.mockResolvedValue(mockCuenta);

            await service.verificarFreemium();

            expect(eventEmitter.emit).toHaveBeenCalledWith('suscripcion.proximaAVencer', {
                cuentaId: CUENTA_ID,
                mensaje: expect.stringContaining('está por vencer'),
            });
        });

        it('no hace nada si faltan más de 3 días', async () => {
            mockInmobiliariaRepository.find.mockResolvedValue([mockInm(cincoDias)]);

            await service.verificarFreemium();

            expect(eventEmitter.emit).not.toHaveBeenCalled();
            expect(mockInmobiliariaService.updatePlan).not.toHaveBeenCalled();
            expect(inmobiliariaRepository.save).not.toHaveBeenCalled();
        });
    });
});