import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawnSync } from "child_process";
import { getGitUser } from "./utils";

function detectPlatformHomeDirectory(): string {
  if (process.platform === "win32") {
    if (process.env.USERPROFILE) return process.env.USERPROFILE;
    if (process.env.HOMEDRIVE && process.env.HOMEPATH) return `${process.env.HOMEDRIVE}${process.env.HOMEPATH}`;
  } else if (process.env.HOME) {
    return process.env.HOME;
  }
  return os.homedir();
}

function resolveHomeDirectory(homeDirInput?: string): string {
  const detectedHome = detectPlatformHomeDirectory();
  if (!homeDirInput || homeDirInput === "~") return detectedHome;
  if (homeDirInput.startsWith("~/") || homeDirInput.startsWith("~\\")) return path.join(detectedHome, homeDirInput.slice(2));
  return path.resolve(homeDirInput);
}

function getDefaultEmail(): string {
  const globalUser = getGitUser("--global");
  if (globalUser?.email) return globalUser.email;
  const localUser = getGitUser("--local");
  if (localUser?.email) return localUser.email;
  try { return `${os.userInfo().username}@${os.hostname()}`; } catch { return "user@localhost"; }
}

export function getDefaultSshEmail(): string {
  return getDefaultEmail();
}

function buildKeyFileName(tagInput?: string): string {
  const tag = String(tagInput || "").trim();
  if (!tag) return "";
  return tag.startsWith("id_rsa") ? tag : `id_rsa_${tag}`;
}

export function generateGitSshKey(options: { homeDir?: string; comment?: string; fileTag?: string } = {}): void {
  const homeDir = resolveHomeDirectory(options.homeDir);
  const email = String(options.comment || getDefaultEmail()).trim();
  const keyName = buildKeyFileName(options.fileTag);
  if (!email) throw new Error("Email/comment cannot be empty");

  const sshDir = path.join(homeDir, ".ssh");
  const privateKeyPath = path.join(sshDir, keyName);
  const publicKeyPath = `${privateKeyPath}.pub`;

  if (fs.existsSync(privateKeyPath) || fs.existsSync(publicKeyPath)) throw new Error(`SSH key already exists at: ${privateKeyPath}`);
  fs.mkdirSync(sshDir, { recursive: true });

  const result = spawnSync("ssh-keygen", ["-t", "rsa", "-b", "4096", "-C", email, "-f", privateKeyPath, "-N", ""], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("ssh-keygen failed");
}

