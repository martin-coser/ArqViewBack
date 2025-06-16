import { PartialType } from '@nestjs/mapped-types';
import { CreatePropiedadDto } from './create-propiedad.dto';

export class UpdatePropiedadDto extends PartialType(CreatePropiedadDto) {
    
    nombre?: string

    descripcion?:string

    direccion?: string 
    
    localidad?:number 
    
    precio?:number

    superficie?:number 

    tipoPropiedad?:number 

    tipoVisualizacion?:number 

    estiloArquitectonico?:number 

    cantidadBanios?:number

    cantidadDormitorios?:number
    
    cantidadAmbientes?:number
}
