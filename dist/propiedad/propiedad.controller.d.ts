import { PropiedadService } from './propiedad.service';
import { CreatePropiedadDto } from './dto/create-propiedad.dto';
import { UpdatePropiedadDto } from './dto/update-propiedad.dto';
export declare class PropiedadController {
    private readonly propiedadService;
    constructor(propiedadService: PropiedadService);
    create(createPropiedadDto: CreatePropiedadDto): Promise<import("./entities/propiedad.entity").Propiedad>;
    findAll(): Promise<import("./entities/propiedad.entity").Propiedad[]>;
    findOne(id: string): Promise<import("./entities/propiedad.entity").Propiedad>;
    update(id: string, updatePropiedadDto: UpdatePropiedadDto): Promise<import("./entities/propiedad.entity").Propiedad>;
    remove(id: string): Promise<void>;
}
