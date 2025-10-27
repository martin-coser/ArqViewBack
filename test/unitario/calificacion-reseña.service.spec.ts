import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateCalificacionResenaDto } from 'src/calificacion-reseña/dto/create-calificacion-reseña.dto';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';
import { Mensaje } from 'src/mensaje/entities/mensaje.entity';
import { CalificacionResena } from 'src/calificacion-reseña/entities/calificacion-reseña.entity';
import { CalificacionResenaService } from 'src/calificacion-reseña/calificacion-reseña.service';


// --- Mocks de Entidades y DTOs ---

const mockCuentaId = 1;
const mockClienteId = 5;
const mockInmobiliariaId = 10;

const mockCreateDto: CreateCalificacionResenaDto = {
    calificacion: 5,
    reseña: 'Excelente servicio y atención.',
    inmobiliariaId: mockInmobiliariaId,
};

const mockCliente: Cliente = {
    id: mockClienteId,
    cuenta: { id: mockCuentaId },
} as Cliente;

const mockInmobiliaria: Inmobiliaria = {
    id: mockInmobiliariaId,
    // Propiedades mínimas necesarias
} as Inmobiliaria;

const mockMensajeCliente: Mensaje = { id: 1 } as Mensaje;
const mockMensajeInmobiliaria: Mensaje = { id: 2 } as Mensaje;

const mockResenaCreada: CalificacionResena = {
    id: 1,
    reseña: mockCreateDto.reseña,
    calificacion: mockCreateDto.calificacion,
    fechaCreacion: new Date(),
    cliente: mockCliente,
    inmobiliaria: mockInmobiliaria,
} as CalificacionResena;


// --- Mocks de Repositorios ---

const mockCalificacionResenaRepository = {
    create: jest.fn().mockReturnValue(mockResenaCreada),
    save: jest.fn().mockResolvedValue(mockResenaCreada),
};

const mockClienteRepository = {
    findOne: jest.fn(),
};

const mockInmobiliariaRepository = {
    findOne: jest.fn(),
};

const mockMensajeRepository = {
    findOne: jest.fn(),
};


describe('CalificacionResenaService', () => {
    let service: CalificacionResenaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CalificacionResenaService,
                // Proveer Mocks a los tokens de inyección
                {
                    provide: getRepositoryToken(CalificacionResena),
                    useValue: mockCalificacionResenaRepository,
                },
                {
                    provide: getRepositoryToken(Mensaje),
                    useValue: mockMensajeRepository,
                },
                {
                    provide: getRepositoryToken(Cliente),
                    useValue: mockClienteRepository,
                },
                {
                    provide: getRepositoryToken(Inmobiliaria),
                    useValue: mockInmobiliariaRepository,
                },
            ],
        }).compile();

        service = module.get<CalificacionResenaService>(CalificacionResenaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // --------------------------------------------------------------------------------
    // CASO DE USO EXITOSO
    // --------------------------------------------------------------------------------
    it('Debería crear una reseña exitosamente si el cliente y la interacción existen', async () => {
        mockClienteRepository.findOne.mockResolvedValue(mockCliente);
        mockMensajeRepository.findOne.mockResolvedValueOnce(mockMensajeCliente) // Cliente a Inmobiliaria
                                      .mockResolvedValueOnce(mockMensajeInmobiliaria); // Inmobiliaria a Cliente
        mockInmobiliariaRepository.findOne.mockResolvedValue(mockInmobiliaria);

        const result = await service.create(mockCreateDto, mockCuentaId);

        // Aserciones de las búsquedas
        expect(mockClienteRepository.findOne).toHaveBeenCalledWith({
            where: { cuenta: { id: mockCuentaId } },
            relations: ['cuenta'],
        });
        // Aserciones de los mensajes
        expect(mockInmobiliariaRepository.findOne).toHaveBeenCalledWith({
            where: { id: mockInmobiliariaId },
        });

        // Aserciones de la creación y guardado
        expect(mockCalificacionResenaRepository.create).toHaveBeenCalledWith({
            ...mockCreateDto,
            cliente: mockCliente,
            inmobiliaria: mockInmobiliaria,
        });
        expect(mockCalificacionResenaRepository.save).toHaveBeenCalledWith(mockResenaCreada);
        expect(result).toEqual(mockResenaCreada);
    });

    // --------------------------------------------------------------------------------
    // CASOS DE FALLA (EXCEPCIONES)
    // --------------------------------------------------------------------------------

    it('Debería lanzar NotFoundException si no se encuentra el Cliente asociado a la cuenta', async () => {
        mockClienteRepository.findOne.mockResolvedValue(null);

        await expect(service.create(mockCreateDto, mockCuentaId)).rejects.toThrow(NotFoundException);
        await expect(service.create(mockCreateDto, mockCuentaId)).rejects.toThrow(`No se encontró un cliente asociado a la cuenta con ID ${mockCuentaId}`);
        // Debe salir inmediatamente, sin buscar mensajes ni inmobiliaria
        expect(mockMensajeRepository.findOne).not.toHaveBeenCalled(); 
    });

    it('Debería lanzar BadRequestException si el Cliente nunca envió un mensaje a la inmobiliaria', async () => {
        mockClienteRepository.findOne.mockResolvedValue(mockCliente);
        mockMensajeRepository.findOne.mockResolvedValueOnce(null) // Falla el mensaje Cliente -> Inmobiliaria
                                      .mockResolvedValueOnce(mockMensajeInmobiliaria); 

        await expect(service.create(mockCreateDto, mockCuentaId)).rejects.toThrow(BadRequestException);
        await expect(service.create(mockCreateDto, mockCuentaId)).rejects.toThrow(
            'Para calificar, debe haber una interacción de mensajes con la inmobiliaria.'
        );
        expect(mockInmobiliariaRepository.findOne).not.toHaveBeenCalled(); // Debe fallar antes de buscar la inmobiliaria
    });

    it('Debería lanzar BadRequestException si la Inmobiliaria nunca envió un mensaje al cliente', async () => {
        mockClienteRepository.findOne.mockResolvedValue(mockCliente);
        mockMensajeRepository.findOne.mockResolvedValueOnce(mockMensajeCliente) // Éxito Cliente -> Inmobiliaria
                                      .mockResolvedValueOnce(null); // Falla el mensaje Inmobiliaria -> Cliente

        await expect(service.create(mockCreateDto, mockCuentaId)).rejects.toThrow(BadRequestException);
        await expect(service.create(mockCreateDto, mockCuentaId)).rejects.toThrow('Para calificar, debe haber una interacción de mensajes con la inmobiliaria.');
        expect(mockInmobiliariaRepository.findOne).not.toHaveBeenCalled(); // Debe fallar antes de buscar la inmobiliaria
    });

    it('Debería lanzar NotFoundException si la Inmobiliaria con el ID dado no existe', async () => {
        mockClienteRepository.findOne.mockResolvedValue(mockCliente); // Cliente existe
        mockMensajeRepository.findOne.mockResolvedValue(mockMensajeCliente); 
        mockInmobiliariaRepository.findOne.mockResolvedValue(null); // Inmobiliaria no existe

        await expect(service.create(mockCreateDto, mockCuentaId)).rejects.toThrow(`Inmobiliaria con ID ${mockCreateDto.inmobiliariaId} no encontrada.`);
        // Se asegura que los repositorios de mensaje y cliente fueron llamados
        expect(mockMensajeRepository.findOne).toHaveBeenCalledTimes(2);
    });
});