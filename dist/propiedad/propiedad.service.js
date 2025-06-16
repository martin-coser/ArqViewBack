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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropiedadService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const propiedad_entity_1 = require("./entities/propiedad.entity");
const typeorm_2 = require("typeorm");
let PropiedadService = class PropiedadService {
    propiedadRepository;
    constructor(propiedadRepository) {
        this.propiedadRepository = propiedadRepository;
    }
    async create(createPropiedadDto) {
        const { direccion } = createPropiedadDto;
        const propiedadExistente = await this.propiedadRepository.findOneBy({ direccion });
        if (propiedadExistente) {
            throw new common_1.ConflictException('La direccion ya existe');
        }
        const propiedad = this.propiedadRepository.create(createPropiedadDto);
        return await this.propiedadRepository.save(propiedad);
    }
    async findAll() {
        return await this.propiedadRepository.find();
    }
    async findOne(id) {
        const propiedad = await this.propiedadRepository.findOneBy({ id });
        if (!propiedad) {
            throw new common_1.NotFoundException(`La propiedad con el id ${id} no existe`);
        }
        return propiedad;
    }
    async update(id, updatePropiedadDto) {
        const propiedad = await this.findOne(id);
        if (updatePropiedadDto.direccion && updatePropiedadDto.direccion !== propiedad.direccion) {
            const propiedadExistente = await this.propiedadRepository.findOneBy({
                direccion: updatePropiedadDto.direccion,
            });
            if (propiedadExistente) {
                throw new common_1.ConflictException('La direccion ya existe');
            }
        }
        Object.assign(propiedad, updatePropiedadDto);
        return this.propiedadRepository.save(propiedad);
    }
    async remove(id) {
        const propiedad = await this.findOne(id);
        await this.propiedadRepository.remove(propiedad);
    }
};
exports.PropiedadService = PropiedadService;
exports.PropiedadService = PropiedadService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(propiedad_entity_1.Propiedad)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PropiedadService);
//# sourceMappingURL=propiedad.service.js.map