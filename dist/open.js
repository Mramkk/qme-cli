"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeUrl = normalizeUrl;
exports.openUrlInBrowser = openUrlInBrowser;
exports.runOpen = runOpen;
const child_process_1 = require("child_process");
function normalizeUrl(raw) {
    const input = String(raw || "").trim();
    if (!input)
        return "";
    if (/^[a-zA-Z0-9.-]+:\d+\b/.test(input) && !/^https?:\/\//i.test(input))
        return `http://${input}`;
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input) && /^[\w.-]+(\:\d+)?(\/|$)/.test(input))
        return `http://${input}`;
    return input;
}
function openUrlInBrowser(url) {
    const target = normalizeUrl(url);
    if (!target)
        throw new Error("URL is required");
    if (process.platform === "win32") {
        (0, child_process_1.execSync)(`start "" "${target.replace(/"/g, '""')}"`, { stdio: "ignore", shell: "cmd.exe" });
        return;
    }
    const escaped = target.replace(/"/g, '\\"');
    (0, child_process_1.execSync)(process.platform === "darwin" ? `open "${escaped}"` : `xdg-open "${escaped}"`, { stdio: "ignore" });
}
function runOpen(url) {
    openUrlInBrowser(url);
}
