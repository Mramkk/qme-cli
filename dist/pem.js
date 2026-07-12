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
exports.fixPemPermissions = fixPemPermissions;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
function fixPemPermissions(filePath) {
    if (process.platform !== "win32")
        throw new Error("qme pem is only available on Windows");
    const cleanedPath = String(filePath || "").trim().replace(/^"+|"+$/g, "");
    if (!cleanedPath)
        throw new Error("Missing PEM file path");
    if (!fs.existsSync(cleanedPath))
        throw new Error("File not found");
    const userName = (process.env.USERNAME || process.env.UserName || "").trim() || "Administrator";
    const runIcacls = (args) => {
        const result = (0, child_process_1.spawnSync)("icacls.exe", args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true, encoding: "utf8" });
        if (result.error)
            throw result.error;
        if (typeof result.status === "number" && result.status !== 0)
            throw new Error(result.stderr || result.stdout || "icacls failed");
    };
    runIcacls([cleanedPath, "/c", "/t", "/inheritance:d"]);
    runIcacls([cleanedPath, "/c", "/t", "/grant", `${userName}:F`]);
    runIcacls([cleanedPath, "/c", "/t", "/remove", "Administrator", "Authenticated Users", "BUILTIN\\Administrators", "BUILTIN", "Everyone", "System", "Users"]);
}
