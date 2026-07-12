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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMacXamppStart = runMacXamppStart;
exports.runMacXamppStop = runMacXamppStop;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const chalk_1 = __importDefault(require("chalk"));
const config_store_1 = require("./config/config.store");
function normalizePathValue(value) {
    return (value || "").trim().replace(/^"+|"+$/g, "").replace(/[\\\/]+$/, "");
}
function normalizeMessage(value) { return (value || "").toLowerCase(); }
function hasAlreadyRunningSignal(message) { const n = normalizeMessage(message); return n.includes("already running") || n.includes("is running") || n.includes("running already"); }
function hasAlreadyStoppedSignal(message) { const n = normalizeMessage(message); return n.includes("not running") || n.includes("already stopped") || n.includes("is not running"); }
function hasRootRequiredSignal(message) { const n = normalizeMessage(message); return n.includes("need to be root") || n.includes("must be root") || n.includes("permission denied"); }
function getMacXamppScriptPath() {
    const configuredPath = normalizePathValue((0, config_store_1.getXamppPath)());
    const normalizedConfigured = configuredPath.replace(/\\/g, "/");
    const candidates = [];
    if (normalizedConfigured)
        candidates.push(`${normalizedConfigured}/xampp`, `${normalizedConfigured}/xamppfiles/xampp`, `${normalizedConfigured}/bin/xampp`);
    candidates.push("/Applications/XAMPP/xamppfiles/xampp", "/Applications/XAMPP/bin/xampp");
    for (const candidate of candidates)
        if (fs.existsSync(candidate))
            return candidate;
    return "";
}
function canReachHttpUrl(url) { return new Promise((resolve) => { const req = http.get(url, (response) => { const ok = response.statusCode >= 200 && response.statusCode < 500; response.resume(); resolve(ok); }); req.setTimeout(2500, () => { req.destroy(); resolve(false); }); req.on("error", () => resolve(false)); }); }
async function waitForHttpUrl(url, timeoutMs = 60000, pollMs = 1500) { const startedAt = Date.now(); while (Date.now() - startedAt < timeoutMs) {
    if (await canReachHttpUrl(url))
        return true;
    await new Promise((r) => setTimeout(r, pollMs));
} return false; }
function openUrlInBrowser(url) { (0, child_process_1.exec)(`open "${url}"`, { windowsHide: false }, (error) => { if (error) {
    console.log(chalk_1.default.yellow(`⚠️ Could not open browser automatically: ${url}`));
    console.log(chalk_1.default.yellow(error.message));
    return;
} console.log(chalk_1.default.green(`✅ Opened in browser: ${url}`)); }); }
function runMacXamppStart() { /* converted later in full pass */ throw new Error("runMacXamppStart not yet wired in TS"); }
function runMacXamppStop() { throw new Error("runMacXamppStop not yet wired in TS"); }
