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
exports.getDefaultSshEmail = getDefaultSshEmail;
exports.generateGitSshKey = generateGitSshKey;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const utils_1 = require("./utils");
function detectPlatformHomeDirectory() {
    if (process.platform === "win32") {
        if (process.env.USERPROFILE)
            return process.env.USERPROFILE;
        if (process.env.HOMEDRIVE && process.env.HOMEPATH)
            return `${process.env.HOMEDRIVE}${process.env.HOMEPATH}`;
    }
    else if (process.env.HOME) {
        return process.env.HOME;
    }
    return os.homedir();
}
function resolveHomeDirectory(homeDirInput) {
    const detectedHome = detectPlatformHomeDirectory();
    if (!homeDirInput || homeDirInput === "~")
        return detectedHome;
    if (homeDirInput.startsWith("~/") || homeDirInput.startsWith("~\\"))
        return path.join(detectedHome, homeDirInput.slice(2));
    return path.resolve(homeDirInput);
}
function getDefaultEmail() {
    const globalUser = (0, utils_1.getGitUser)("--global");
    if (globalUser?.email)
        return globalUser.email;
    const localUser = (0, utils_1.getGitUser)("--local");
    if (localUser?.email)
        return localUser.email;
    try {
        return `${os.userInfo().username}@${os.hostname()}`;
    }
    catch {
        return "user@localhost";
    }
}
function getDefaultSshEmail() {
    return getDefaultEmail();
}
function buildKeyFileName(tagInput) {
    const tag = String(tagInput || "").trim();
    if (!tag)
        return "";
    return tag.startsWith("id_rsa") ? tag : `id_rsa_${tag}`;
}
function generateGitSshKey(options = {}) {
    const homeDir = resolveHomeDirectory(options.homeDir);
    const email = String(options.comment || getDefaultEmail()).trim();
    const keyName = buildKeyFileName(options.fileTag);
    if (!email)
        throw new Error("Email/comment cannot be empty");
    const sshDir = path.join(homeDir, ".ssh");
    const privateKeyPath = path.join(sshDir, keyName);
    const publicKeyPath = `${privateKeyPath}.pub`;
    if (fs.existsSync(privateKeyPath) || fs.existsSync(publicKeyPath))
        throw new Error(`SSH key already exists at: ${privateKeyPath}`);
    fs.mkdirSync(sshDir, { recursive: true });
    const result = (0, child_process_1.spawnSync)("ssh-keygen", ["-t", "rsa", "-b", "4096", "-C", email, "-f", privateKeyPath, "-N", ""], { stdio: "inherit" });
    if (result.error)
        throw result.error;
    if (result.status !== 0)
        throw new Error("ssh-keygen failed");
}
