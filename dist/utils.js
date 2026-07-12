"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGitUser = getGitUser;
exports.getProjectRepoUrl = getProjectRepoUrl;
exports.getCurrentBranch = getCurrentBranch;
exports.getCurrentIpAddress = getCurrentIpAddress;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
function getGitUser(scope) {
    try {
        const name = (0, child_process_1.execSync)(`git config ${scope} user.name`, { encoding: "utf8" }).trim();
        const email = (0, child_process_1.execSync)(`git config ${scope} user.email`, { encoding: "utf8" }).trim();
        return name || email ? { name, email } : null;
    }
    catch {
        return null;
    }
}
function getProjectRepoUrl() {
    try {
        const url = (0, child_process_1.execSync)("git remote get-url origin", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
        return url || null;
    }
    catch { }
    try {
        let gitDir = "";
        try {
            gitDir = (0, child_process_1.execSync)("git rev-parse --git-dir", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
        }
        catch {
            gitDir = path.join(process.cwd(), ".git");
        }
        const configPath = path.isAbsolute(gitDir) ? path.join(gitDir, "config") : path.join(process.cwd(), gitDir, "config");
        const config = fs.readFileSync(configPath, "utf8");
        const match = config.match(/\[remote "origin"\][\s\S]*?url\s*=\s*(.+)/);
        return match ? match[1].trim() : null;
    }
    catch {
        return null;
    }
}
function getCurrentBranch() {
    try {
        return (0, child_process_1.execSync)("git branch --show-current", { encoding: "utf8" }).trim();
    }
    catch {
        return "unknown";
    }
}
function getCurrentIpAddress() {
    const interfaces = os.networkInterfaces();
    const candidates = [];
    for (const entries of Object.values(interfaces)) {
        for (const entry of entries || []) {
            if (!entry || entry.family !== "IPv4" || entry.internal)
                continue;
            candidates.push(entry.address);
        }
    }
    if (candidates.length > 0)
        return candidates[1] || candidates[0];
    for (const entries of Object.values(interfaces)) {
        for (const entry of entries || []) {
            if (!entry || entry.family !== "IPv4")
                continue;
            return entry.address;
        }
    }
    return "";
}
