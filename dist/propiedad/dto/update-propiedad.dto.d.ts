import { CreatePropiedadDto } from './create-propiedad.dto';
declare const UpdatePropiedadDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreatePropiedadDto>>;
export declare class UpdatePropiedadDto extends UpdatePropiedadDto_base {
    nombre?: string;
    descripcion?: string;
    direccion?: string;
    localidad?: number;
    precio?: number;
    superficie?: number;
    tipoPropiedad?: number;
    tipoVisualizacion?: number;
    estiloArquitectonico?: number;
    cantidadBanios?: number;
    cantidadDormitorios?: number;
    cantidadAmbientes?: number;
}
export {};
