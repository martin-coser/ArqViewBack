"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Propiedad = void 0;
const typeorm_1 = require("typeorm");
let Propiedad = class Propiedad {
    id;
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
};
exports.Propiedad = Propiedad;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Propiedad.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Propiedad.prototype, "nombre", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Propiedad.prototype, "descripcion", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Propiedad.prototype, "direccion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision' }),
    __metadata("design:type", Number)
], Propiedad.prototype, "precio", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], Propiedad.prototype, "superficie", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], Propiedad.prototype, "cantidadBanios", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], Propiedad.prototype, "cantidadDormitorios", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], Propiedad.prototype, "cantidadAmbientes", void 0);
exports.Propiedad = Propiedad = __decorate([
    (0, typeorm_1.Entity)()
], Propiedad);
//# sourceMappingURL=propiedad.entity.js.map