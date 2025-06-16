"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePropiedadDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_propiedad_dto_1 = require("./create-propiedad.dto");
class UpdatePropiedadDto extends (0, mapped_types_1.PartialType)(create_propiedad_dto_1.CreatePropiedadDto) {
    nombre;
    descripcion;
    direccion;
    localidad;
    precio;
    superficie;
    tipoPropiedad;
    tipoVisualizacion;
    estiloArquitectonico;
    cantidadBanios;
    cantidadDormitorios;
    cantidadAmbientes;
}
exports.UpdatePropiedadDto = UpdatePropiedadDto;
//# sourceMappingURL=update-propiedad.dto.js.map