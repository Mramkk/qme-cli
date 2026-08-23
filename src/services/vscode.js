const fs = require("fs");
const os = require("os");
const path = require("path");

function createVsCodeService({ spawnSync, chalk }) {
  function getVsCodeStoragePath() {
    const homeDir = os.homedir();
    if (process.platform === "darwin") {
      return path.join(
        homeDir,
        "Library",
        "Application Support",
        "Code",
        "User",
        "globalStorage",
        "storage.json",
      );
    }
    if (process.platform === "win32") {
      const appData = process.env.APPDATA || path.join(homeDir, "AppData", "Roaming");
      return path.join(appData, "Code", "User", "globalStorage", "storage.json");
    }
    if (process.platform === "linux") {
      return path.join(homeDir, ".config", "Code", "User", "globalStorage", "storage.json");
    }
    return "";
  }

  function parseFileUriToPath(value) {
    if (!value || typeof value !== "string") return "";
    const input = value.trim();
    const unquotedInput =
      ((input.startsWith('"') && input.endsWith('"')) ||
        (input.startsWith("'") && input.endsWith("'"))) &&
      input.length >= 2
        ? input.slice(1, -1)
        : input;
    if (!unquotedInput.startsWith("file://")) return path.resolve(unquotedInput);
    try {
      const parsed = new URL(unquotedInput);
      if (parsed.protocol !== "file:") return "";
      let parsedPath = decodeURIComponent(parsed.pathname || "");
      if (process.platform === "win32") {
        if (parsedPath.startsWith("/")) parsedPath = parsedPath.slice(1);
        parsedPath = parsedPath.replace(/\//g, "\\");
      }
      return parsedPath || "";
    } catch {
      return "";
    }
  }

  function resolveLastVsCodeProjectPath() {
    const storagePath = getVsCodeStoragePath();
    if (!storagePath) {
      console.log(chalk.red("❌ Unsupported platform for reading VS Code recent projects"));
      process.exit(1);
    }
    if (!fs.existsSync(storagePath)) {
      console.log(chalk.red("❌ VS Code storage file not found"));
      console.log(chalk.yellow(`Expected path: ${storagePath}`));
      console.log(chalk.yellow("Open VS Code at least once, then run: qme recent"));
      process.exit(1);
    }

    let storageData;
    try {
      storageData = JSON.parse(fs.readFileSync(storagePath, "utf8"));
    } catch (error) {
      console.log(chalk.red("❌ Failed to parse VS Code storage file"));
      console.log(chalk.yellow(`File: ${storagePath}`));
      console.log(chalk.yellow(error.message));
      process.exit(1);
    }

    const lastWindow = storageData?.windowsState?.lastActiveWindow || null;
    const rawTarget = lastWindow?.folder || lastWindow?.workspace || "";
    if (!rawTarget) {
      console.log(chalk.red("❌ No recent VS Code project found"));
      process.exit(1);
    }
    const resolvedPath = parseFileUriToPath(rawTarget);
    if (!resolvedPath) {
      console.log(chalk.red("❌ Failed to parse recent VS Code project path"));
      console.log(chalk.yellow(`Raw value: ${rawTarget}`));
      process.exit(1);
    }
    return resolvedPath;
  }

  function tryOpenInVsCode(targetPath, label = "recent project", options = {}) {
    const codeArgs = [options.newWindow ? "-n" : "-r", targetPath];
    const codeResult =
      process.platform === "win32"
        ? spawnSync("cmd", ["/d", "/s", "/c", "code", ...codeArgs], { stdio: "inherit" })
        : spawnSync("code", codeArgs, { stdio: "inherit" });

    if (!codeResult.error && codeResult.status === 0) {
      console.log(chalk.green(`✅ Opened ${label} in VS Code: ${targetPath}`));
      return;
    }

    if (process.platform === "darwin") {
      const openResult = spawnSync(
        "open",
        [...(options.newWindow ? ["-n"] : []), "-a", "Visual Studio Code", targetPath],
        { stdio: "inherit" },
      );
      if (!openResult.error && openResult.status === 0) {
        console.log(chalk.green(`✅ Opened ${label} in VS Code: ${targetPath}`));
        return;
      }
      console.log(chalk.red("❌ Failed to open VS Code"));
      console.log(
        chalk.yellow("Install the `code` command in PATH or verify the app is installed."),
      );
      process.exit(1);
    }

    if (process.platform === "win32") {
      const localAppData = process.env.LOCALAPPDATA || "";
      const programFiles = process.env.ProgramFiles || "C:\\Program Files";
      const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
      const candidates = [
        localAppData ? `${localAppData}\\Programs\\Microsoft VS Code\\Code.exe` : "",
        `${programFiles}\\Microsoft VS Code\\Code.exe`,
        `${programFilesX86}\\Microsoft VS Code\\Code.exe`,
      ].filter(Boolean);
      for (const exePath of candidates) {
        if (!fs.existsSync(exePath)) continue;
        const result = spawnSync(
          "cmd",
          [
            "/d",
            "/s",
            "/c",
            `start "" "${exePath}" ${options.newWindow ? "-n" : "-r"} "${targetPath}"`,
          ],
          { stdio: "inherit" },
        );
        if (!result.error && result.status === 0) {
          console.log(chalk.green(`✅ Opened ${label} in VS Code: ${targetPath}`));
          return;
        }
      }
      console.log(chalk.red("❌ Failed to open VS Code"));
      console.log(chalk.yellow("Install Visual Studio Code or add `code` to PATH."));
      process.exit(1);
    }

    console.log(chalk.red("❌ Failed to open VS Code"));
    console.log(chalk.yellow("Install VS Code and ensure `code` is available in PATH."));
    process.exit(1);
  }

  return {
    getVsCodeStoragePath,
    parseFileUriToPath,
    resolveLastVsCodeProjectPath,
    tryOpenInVsCode,
  };
}

module.exports = { createVsCodeService };
