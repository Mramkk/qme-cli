import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execSync } from "child_process";

export function getGitUser(scope: string): { name: string; email: string } | null {
  try {
    const name = execSync(`git config ${scope} user.name`, { encoding: "utf8" }).trim();
    const email = execSync(`git config ${scope} user.email`, { encoding: "utf8" }).trim();
    return name || email ? { name, email } : null;
  } catch {
    return null;
  }
}

export function getProjectRepoUrl(): string | null {
  try {
    const url = execSync("git remote get-url origin", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    return url || null;
  } catch {}

  try {
    let gitDir = "";
    try {
      gitDir = execSync("git rev-parse --git-dir", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    } catch {
      gitDir = path.join(process.cwd(), ".git");
    }

    const configPath = path.isAbsolute(gitDir) ? path.join(gitDir, "config") : path.join(process.cwd(), gitDir, "config");
    const config = fs.readFileSync(configPath, "utf8");
    const match = config.match(/\[remote "origin"\][\s\S]*?url\s*=\s*(.+)/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

export function getCurrentBranch(): string {
  try {
    return execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

export function getCurrentIpAddress(): string {
  const interfaces = os.networkInterfaces();
  const candidates: string[] = [];
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (!entry || entry.family !== "IPv4" || entry.internal) continue;
      candidates.push(entry.address);
    }
  }
  if (candidates.length > 0) return candidates[1] || candidates[0];
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (!entry || entry.family !== "IPv4") continue;
      return entry.address;
    }
  }
  return "";
}
