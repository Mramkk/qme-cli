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
exports.CliController = void 0;
const common_1 = require("@nestjs/common");
const cli_service_1 = require("./cli.service");
let CliController = class CliController {
    constructor(cliService) {
        this.cliService = cliService;
    }
    status() {
        return { ok: true, message: this.cliService.getStatus() };
    }
};
exports.CliController = CliController;
__decorate([
    (0, common_1.Get)("status"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], CliController.prototype, "status", null);
exports.CliController = CliController = __decorate([
    (0, common_1.Controller)("cli"),
    __metadata("design:paramtypes", [cli_service_1.CliService])
], CliController);
