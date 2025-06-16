import { CreatePropiedadDto } from './dto/create-propiedad.dto';
import { UpdatePropiedadDto } from './dto/update-propiedad.dto';
import { Propiedad } from './entities/propiedad.entity';
import { Repository } from 'typeorm';
export declare class PropiedadService {
    private propiedadRepository;
    constructor(propiedadRepository: Repository<Propiedad>);
    create(createPropiedadDto: CreatePropiedadDto): Promise<Propiedad>;
    findAll(): Promise<Propiedad[]>;
    findOne(id: number): Promise<Propiedad>;
    update(id: number, updatePropiedadDto: UpdatePropiedadDto): Promise<Propiedad>;
    remove(id: number): Promise<void>;
}
