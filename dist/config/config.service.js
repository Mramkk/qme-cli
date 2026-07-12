"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
const common_1 = require("@nestjs/common");
const config_store_1 = require("./config.store");
let ConfigService = class ConfigService {
    getConfigPath() {
        return (0, config_store_1.getConfigPath)();
    }
    ensureConfigFile() {
        return (0, config_store_1.ensureConfigFile)();
    }
    getSavedProjects() {
        return (0, config_store_1.getSavedProjects)();
    }
    getAliases() {
        return (0, config_store_1.getAliases)();
    }
    getGitUsers() {
        return (0, config_store_1.getGitUsers)();
    }
    setRemoteBranchForRepo(repoUrl, branch) {
        (0, config_store_1.setRemoteBranchForRepo)(repoUrl, branch);
    }
    getRemoteBranchForRepo(repoUrl) {
        return (0, config_store_1.getRemoteBranchForRepo)(repoUrl);
    }
    loadOrCreateRepoConfig(repoUrl) {
        return (0, config_store_1.loadOrCreateRepoConfig)(repoUrl);
    }
    addOrUpdateAlias(name, tokens) {
        return (0, config_store_1.addOrUpdateAlias)(name, tokens);
    }
    removeAlias(name) {
        return (0, config_store_1.removeAlias)(name);
    }
};
exports.ConfigService = ConfigService;
exports.ConfigService = ConfigService = __decorate([
    (0, common_1.Injectable)()
], ConfigService);
