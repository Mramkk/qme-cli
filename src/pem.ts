import { spawnSync } from "child_process";
import * as fs from "fs";

export function fixPemPermissions(filePath: string): void {
  if (process.platform !== "win32") throw new Error("qme pem is only available on Windows");
  const cleanedPath = String(filePath || "").trim().replace(/^"+|"+$/g, "");
  if (!cleanedPath) throw new Error("Missing PEM file path");
  if (!fs.existsSync(cleanedPath)) throw new Error("File not found");
  const userName = (process.env.USERNAME || process.env.UserName || "").trim() || "Administrator";
  const runIcacls = (args: string[]) => {
    const result = spawnSync("icacls.exe", args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true, encoding: "utf8" });
    if (result.error) throw result.error;
    if (typeof result.status === "number" && result.status !== 0) throw new Error(result.stderr || result.stdout || "icacls failed");
  };
  runIcacls([cleanedPath, "/c", "/t", "/inheritance:d"]);
  runIcacls([cleanedPath, "/c", "/t", "/grant", `${userName}:F`]);
  runIcacls([cleanedPath, "/c", "/t", "/remove", "Administrator", "Authenticated Users", "BUILTIN\\Administrators", "BUILTIN", "Everyone", "System", "Users"]);
}

