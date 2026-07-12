import { exec } from "child_process";
import * as fs from "fs";
import * as http from "http";
import chalk from "chalk";
import { getXamppPath } from "./config/config.store";

function normalizePathValue(value: string): string {
  return (value || "").trim().replace(/^"+|"+$/g, "").replace(/[\\\/]+$/, "");
}
function normalizeMessage(value: string): string { return (value || "").toLowerCase(); }
function hasAlreadyRunningSignal(message: string): boolean { const n = normalizeMessage(message); return n.includes("already running") || n.includes("is running") || n.includes("running already"); }
function hasAlreadyStoppedSignal(message: string): boolean { const n = normalizeMessage(message); return n.includes("not running") || n.includes("already stopped") || n.includes("is not running"); }
function hasRootRequiredSignal(message: string): boolean { const n = normalizeMessage(message); return n.includes("need to be root") || n.includes("must be root") || n.includes("permission denied"); }
function getMacXamppScriptPath(): string {
  const configuredPath = normalizePathValue(getXamppPath());
  const normalizedConfigured = configuredPath.replace(/\\/g, "/");
  const candidates: string[] = [];
  if (normalizedConfigured) candidates.push(`${normalizedConfigured}/xampp`, `${normalizedConfigured}/xamppfiles/xampp`, `${normalizedConfigured}/bin/xampp`);
  candidates.push("/Applications/XAMPP/xamppfiles/xampp", "/Applications/XAMPP/bin/xampp");
  for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate;
  return "";
}
function canReachHttpUrl(url: string): Promise<boolean> { return new Promise((resolve) => { const req = http.get(url, (response) => { const ok = response.statusCode >= 200 && response.statusCode < 500; response.resume(); resolve(ok); }); req.setTimeout(2500, () => { req.destroy(); resolve(false); }); req.on("error", () => resolve(false)); }); }
async function waitForHttpUrl(url: string, timeoutMs = 60000, pollMs = 1500): Promise<boolean> { const startedAt = Date.now(); while (Date.now() - startedAt < timeoutMs) { if (await canReachHttpUrl(url)) return true; await new Promise((r) => setTimeout(r, pollMs)); } return false; }
function openUrlInBrowser(url: string): void { exec(`open "${url}"`, { windowsHide: false }, (error) => { if (error) { console.log(chalk.yellow(`⚠️ Could not open browser automatically: ${url}`)); console.log(chalk.yellow(error.message)); return; } console.log(chalk.green(`✅ Opened in browser: ${url}`)); }); }

export function runMacXamppStart(): void { /* converted later in full pass */ throw new Error("runMacXamppStart not yet wired in TS"); }
export function runMacXamppStop(): void { throw new Error("runMacXamppStop not yet wired in TS"); }
