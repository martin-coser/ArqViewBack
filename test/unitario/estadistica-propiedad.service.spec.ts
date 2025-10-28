import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ActividadCliente } from 'src/actividad-cliente/entities/actividad-cliente.entity';
import { EstadisticaPropiedadService } from 'src/estadistica-propiedad/estadistica-propiedad.service';
import { Repository, SelectQueryBuilder } from 'typeorm';


// --- Mocks y Variables de Prueba ---
const mockFechaInicio = '2023-01-01';
const mockFechaFin = '2023-01-31';

// Mock del QueryBuilder de TypeORM
const mockQueryBuilder = {
    // Usamos jest.fn() para rastrear si se llaman y con qué argumentos
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]), // El resultado final de la consulta
} as unknown as SelectQueryBuilder<ActividadCliente>;


// Mock del Repositorio de TypeORM
const mockActividadClienteRepository = {
    // Simula el método .createQueryBuilder() del repositorio
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
} as unknown as Repository<ActividadCliente>;


describe('EstadisticaPropiedadService', () => {
    let service: EstadisticaPropiedadService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EstadisticaPropiedadService,
                {
                    provide: getRepositoryToken(ActividadCliente),
                    useValue: mockActividadClienteRepository,
                },
            ],
        }).compile();

        service = module.get<EstadisticaPropiedadService>(EstadisticaPropiedadService);
        
        // Resetear mocks del QueryBuilder antes de cada test para asegurar un conteo limpio
        jest.clearAllMocks();
    });

    // Test para obtenerVistasPorPropiedad (VISUALIZACION)
    describe('obtenerVista sPorPropiedad', () => {
        
        it('debería construir la query correctamente y filtrar por fechas', async () => {
            // ACT
            await service.obtenerVistasPorPropiedad(mockFechaInicio, mockFechaFin);

            // ASSERT: Verificar la llamada al QueryBuilder
            expect(mockActividadClienteRepository.createQueryBuilder).toHaveBeenCalledWith('actividad');
            
            // ASSERT: Verificar que la query base se construyó con el tipo correcto y el groupBy
            expect(mockQueryBuilder.where).toHaveBeenCalledWith(
                'actividad.tipoDeActividad = :tipo',
                { tipo: 'VISUALIZACION' }
            );
            expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('actividad.propiedad_id');

            // ASSERT: Verificar las selecciones específicas del método
            expect(mockQueryBuilder.select).toHaveBeenCalledWith('actividad.propiedad_id', 'propiedadId');
            expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('COUNT(actividad.id)', 'totalVistas');

            // ASSERT: Verificar el filtro de fechas
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'actividad.fechaYHoraActividad BETWEEN :fechaInicio AND :fechaFin',
                { fechaInicio: mockFechaInicio, fechaFin: mockFechaFin }
            );

            // ASSERT: Verificar la ejecución final
            expect(mockQueryBuilder.getRawMany).toHaveBeenCalledTimes(1);
        });

        it('debería construir la query correctamente sin filtrar por fechas', async () => {
            // ACT
            // CORRECCIÓN: Usamos '' (cadena vacía) en lugar de null para satisfacer el tipo 'string'
            await service.obtenerVistasPorPropiedad('', ''); 

            // ASSERT: Verificar que la query base es correcta
            expect(mockQueryBuilder.where).toHaveBeenCalledWith(
                'actividad.tipoDeActividad = :tipo',
                { tipo: 'VISUALIZACION' }
            );
            
            // ASSERT: Verificar que el filtro de fechas NO se aplicó
            // Esto se debe a que '' es un valor falsy en JS, por lo que el if (fechaInicio && fechaFin) falla
            expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
            
            // ASSERT: Verificar que las selecciones sí se aplicaron
            expect(mockQueryBuilder.select).toHaveBeenCalled();
            expect(mockQueryBuilder.addSelect).toHaveBeenCalled();
            expect(mockQueryBuilder.getRawMany).toHaveBeenCalledTimes(1);
        });
    });

    // Test para obtenerInteresadosPorPropiedad (LISTADEINTERES)
    describe('obtenerInteresadosPorPropiedad', () => {
        it('debería construir la query con el tipo LISTADEINTERES y la columna correcta', async () => {
            // ACT
            await service.obtenerInteresadosPorPropiedad(mockFechaInicio, mockFechaFin);

            // ASSERT: Verificar el tipo de actividad
            expect(mockQueryBuilder.where).toHaveBeenCalledWith(
                'actividad.tipoDeActividad = :tipo',
                { tipo: 'LISTADEINTERES' }
            );

            // ASSERT: Verificar la columna de conteo específica
            expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('COUNT(actividad.id)', 'totalInteresados');

            // ASSERT: Verificar el filtro de fechas (debe estar presente en este caso)
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(1);
        });
    });

    // Test para ObtenerConsultasPorPropiedad (CONSULTA)
    describe('ObtenerConsultasPorPropiedad', () => {
        it('debería construir la query con el tipo CONSULTA y la columna correcta', async () => {
            // ACT
            await service.ObtenerConsultasPorPropiedad(mockFechaInicio, mockFechaFin);

            // ASSERT: Verificar el tipo de actividad
            expect(mockQueryBuilder.where).toHaveBeenCalledWith(
                'actividad.tipoDeActividad = :tipo',
                { tipo: 'CONSULTA' }
            );

            // ASSERT: Verificar la columna de conteo específica
            expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('COUNT(actividad.id)', 'totalConsultas');

            // ASSERT: Verificar el filtro de fechas
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(1);
        });
    });
});
