"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitService = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
const utils_1 = require("../utils");
let GitService = class GitService {
    getProjectRepoUrl() {
        return (0, utils_1.getProjectRepoUrl)();
    }
    getCurrentBranch() {
        return (0, utils_1.getCurrentBranch)();
    }
    getGitUser(scope) {
        return (0, utils_1.getGitUser)(scope);
    }
    isInsideGitRepo() {
        try {
            return (0, child_process_1.execSync)("git rev-parse --is-inside-work-tree", { encoding: "utf8" }).trim() === "true";
        }
        catch {
            return false;
        }
    }
};
exports.GitService = GitService;
exports.GitService = GitService = __decorate([
    (0, common_1.Injectable)()
], GitService);
