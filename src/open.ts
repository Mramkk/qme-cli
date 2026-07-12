import { execSync } from "child_process";

export function normalizeUrl(raw: string): string {
  const input = String(raw || "").trim();
  if (!input) return "";
  if (/^[a-zA-Z0-9.-]+:\d+\b/.test(input) && !/^https?:\/\//i.test(input)) return `http://${input}`;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input) && /^[\w.-]+(\:\d+)?(\/|$)/.test(input)) return `http://${input}`;
  return input;
}

export function openUrlInBrowser(url: string): void {
  const target = normalizeUrl(url);
  if (!target) throw new Error("URL is required");
  if (process.platform === "win32") {
    execSync(`start "" "${target.replace(/"/g, '""')}"`, { stdio: "ignore", shell: "cmd.exe" });
    return;
  }
  const escaped = target.replace(/"/g, '\\"');
  execSync(process.platform === "darwin" ? `open "${escaped}"` : `xdg-open "${escaped}"`, { stdio: "ignore" });
}

export function runOpen(url: string): void {
  openUrlInBrowser(url);
}
