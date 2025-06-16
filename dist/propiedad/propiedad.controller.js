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
exports.PropiedadController = void 0;
const common_1 = require("@nestjs/common");
const propiedad_service_1 = require("./propiedad.service");
const create_propiedad_dto_1 = require("./dto/create-propiedad.dto");
const update_propiedad_dto_1 = require("./dto/update-propiedad.dto");
let PropiedadController = class PropiedadController {
    propiedadService;
    constructor(propiedadService) {
        this.propiedadService = propiedadService;
    }
    async create(createPropiedadDto) {
        return await this.propiedadService.create(createPropiedadDto);
    }
    async findAll() {
        return await this.propiedadService.findAll();
    }
    async findOne(id) {
        return await this.propiedadService.findOne(+id);
    }
    async update(id, updatePropiedadDto) {
        return await this.propiedadService.update(+id, updatePropiedadDto);
    }
    remove(id) {
        return this.propiedadService.remove(+id);
    }
};
exports.PropiedadController = PropiedadController;
__decorate([
    (0, common_1.Post)('/create'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_propiedad_dto_1.CreatePropiedadDto]),
    __metadata("design:returntype", Promise)
], PropiedadController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('/findAll'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PropiedadController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('/findOne/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PropiedadController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)('/update/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_propiedad_dto_1.UpdatePropiedadDto]),
    __metadata("design:returntype", Promise)
], PropiedadController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('/remove/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PropiedadController.prototype, "remove", null);
exports.PropiedadController = PropiedadController = __decorate([
    (0, common_1.Controller)('propiedad'),
    __metadata("design:paramtypes", [propiedad_service_1.PropiedadService])
], PropiedadController);
//# sourceMappingURL=propiedad.controller.js.map