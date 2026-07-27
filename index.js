#!/usr/bin/env node

const chalk = require("chalk");
const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const net = require("net");
const {
  runGitSync,
  runGitReset,
  runGitOpen,
  runGitRemove,
  runGitUserSwitch,
  runGitUserAdd,
  runGitUserRemove,
} = require("./src/git.js");
const { generateGitSshKey, getDefaultSshEmail } = require("./src/ssh.js");
const { askQuestion, askSshEmail, askSshTag } = require("./src/prompts.js");
const {
  exportConfig,
  setRemoteBranchForRepo,
  setProjectIdForRepo,
  setLastRunProject,
  getSavedProjects,
  setXamppPath,
  clearXamppPath,
  getXamppPath,
  setXamppCurrentVersion,
  clearXamppCurrentVersion,
  getXamppCurrentVersion,
  getAliases,
  addOrUpdateAlias,
  removeAlias,
  getConfigPath,
  ensureConfigFile,
  getUpdateCheckSetting,
  setUpdateCheckSetting,
} = require("./src/config.js");
const { runUpdateFlow, autoCheckUpdateOnStartup } = require("./src/update.js");
const { getProjectRepoUrl, getCurrentIpAddress } = require("./src/utils.js");
const { initializeRepo } = require("./src/init.js");
const { runArtisan } = require("./src/laravel");
const {
  runWindowsCommand,
  runNotepad,
  runGoogleChat,
  runHubstaff,
  runMail,
  runOutlookMail,
  runXamppStart,
  runXamppStop,
} = require("./src/windows");
const { runMacXamppStart, runMacXamppStop } = require("./src/mac");
const { runTimer } = require("./src/timer");
const { runOpen } = require("./src/open");
const { fixPemPermissions } = require("./src/pem");

function getCliVersion() {
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const pkg = require("./package.json");
    return pkg && pkg.version ? String(pkg.version) : "";
  } catch {
    return "";
  }
}

function printHelp(options = {}) {
  const { isError = false, message = "" } = options;

  if (message) {
    console.log(isError ? chalk.red(message) : chalk.yellow(message));
    console.log();
  }

  const version = getCliVersion();
  const header = version ? `qme v${version}` : "qme";
  console.log();
  console.log();
  console.log(chalk.blueBright(header));
  console.log(chalk.gray("Developer command-line toolkit"));
  console.log();

  console.log(chalk.blueBright("Usage:"));
  console.log(chalk.green("  qme <command> [subcommand] [options]"));
  console.log();

  console.log(chalk.blueBright("Common commands:"));
  // console.log(chalk.green("  qme init [--branch <name>]"));
  // console.log(chalk.green("  qme recent"));
  console.log(chalk.green("  qme git sync"));
  console.log(chalk.gray("  Alias: qme gsync   (same as: qme git sync)"));
  console.log(chalk.gray("  Alias: qme git -o   (same as: qme git open)"));
  console.log(chalk.green("  qme pilot"));
  console.log(chalk.gray("  Smart workspace inspector and startup helper"));
  console.log(chalk.green("  qme git users [switch|add|remove]"));
  console.log(chalk.green("  qme alias [list|add|remove]"));
  console.log(chalk.green("  qme mysql"));
  console.log(chalk.gray("  qme mysql permission   Updates XAMPP MySQL data-folder permissions"));
  console.log(chalk.green("  qme ip"));
  console.log(chalk.green("  qme flutter"));
  console.log(chalk.gray("  App run, build, devices, clean, and common Flutter targets"));
  console.log(chalk.green("  qme adb"));
  console.log(chalk.gray("  Connect Android device to ADB over Wi-Fi using USB first"));
  console.log(chalk.gray("  Lists databases, then offers import, truncate, export, or shell"));
  console.log(chalk.green("  qme config"));
  console.log(chalk.gray("  Opens qme config file in VS Code"));
  console.log(chalk.gray("  qme config auto-update [enable|disable|--show]"));
  console.log(chalk.green("  qme update"));
  console.log(chalk.gray("  Checks for and automatically installs CLI updates"));
  console.log(chalk.green("  qme proj"));
  console.log(chalk.gray("  Lists saved projects from qme config"));
  console.log(chalk.green("  qme open <url>"));
  console.log(chalk.green("  qme pem -f <path-to-pem>"));
  console.log(
    chalk.green(
      "  qme git ssh-key [--home <path>] [--comment <email>] [--tag <name>]",
    ),
  );
  // console.log(chalk.green("  qme config export [output-path]"));
  // console.log(chalk.green("  qme config branch <branch-name>"));
  // console.log(chalk.green("  qme xampp start|stop|switch <version>"));
  console.log(chalk.green("  qme xini"));
  console.log(chalk.gray("  Opens current XAMPP php.ini in VS Code"));
  console.log(chalk.green("  qme xproj"));
  console.log(chalk.gray("  Lists project folders from XAMPP htdocs"));
  console.log(chalk.green("  qme sprint-review [to-email]"));
  console.log(chalk.gray("  Creates an Outlook sprint review mail draft"));
  console.log(chalk.green("  qme sprint-plan [to-email]"));
  console.log(chalk.gray("  Creates an Outlook sprint plan mail draft"));
  // console.log(chalk.green("  qme win <action|cmd...>  (alias: qme w)"));
  // console.log(chalk.green("  qme timer <min> <label> [--popup|-p]"));
  console.log();

  console.log(chalk.blueBright("Git users:"));
  console.log(chalk.green("  qme git users"));
  console.log(chalk.green("  qme git users add"));
  console.log(chalk.green("  qme git users remove"));
  console.log(
    chalk.gray("  Aliases: qme git user switch|add|remove, qme add git user"),
  );
  console.log();

  console.log(chalk.blueBright("Help:"));
  console.log(chalk.green("  qme help"));
  console.log(chalk.green("  qme --help   qme -h"));
  console.log(chalk.green("  qme --version   qme -v"));

  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const { getConfigPath } = require("./src/config.js");
    console.log();
    console.log(chalk.gray(`Config: ${getConfigPath()}`));
  } catch {
    // ignore
  }
}

function normalizeXamppVersion(version) {
  return String(version || "")
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/^xampp-/i, "");
}

function runWindowsShellSync(commandLine, options = {}) {
  const { allowFailure = false, failMessage = "Command failed" } = options;
  const result = spawnSync(commandLine, {
    stdio: "inherit",
    shell: true,
    windowsHide: false,
  });

  if (result.error) {
    if (allowFailure) {
      return false;
    }
    console.log(chalk.red(`❌ ${failMessage}`));
    console.log(chalk.yellow(result.error.message));
    process.exit(1);
  }

  if (typeof result.status === "number" && result.status !== 0) {
    if (allowFailure) {
      return false;
    }
    console.log(chalk.red(`❌ ${failMessage}`));
    process.exit(result.status);
  }

  return true;
}

function encodeUrlValue(value) {
  return encodeURIComponent(String(value || ""));
}

function formatShortDate(date = new Date()) {
  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getFullYear()).slice(-2),
  ].join("-");
}

function formatMonthName(date = new Date()) {
  return date.toLocaleString("en-US", { month: "long" });
}

function formatDateOnly(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  return text.split("T")[0] || text;
}

function formatShortDateOnly(value) {
  const isoDate = formatDateOnly(value);
  if (!isoDate) {
    return "";
  }

  const parts = isoDate.split("-");
  if (parts.length !== 3) {
    return isoDate;
  }

  return `${parts[2]}-${parts[1]}-${parts[0].slice(-2)}`;
}

function normalizePhpVersionParts(version) {
  const rawValue = normalizeXamppVersion(version);
  const match = rawValue.match(/(\d+)\.(\d+)(?:\.\d+)?/);
  const value = match ? match[0] : rawValue;
  const parts = value.split(".").filter(Boolean);
  return {
    value,
    majorMinor: parts.length >= 2 ? `${parts[0]}.${parts[1]}` : value,
  };
}

function getXamppSwitchVersionCandidate(version) {
  const normalized = normalizeXamppVersion(version);
  if (!normalized) {
    return "";
  }

  const parts = normalizePhpVersionParts(normalized);
  return parts.majorMinor || parts.value || normalized;
}

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function hasFile(baseDir, fileName) {
  try {
    const fullPath = path.join(baseDir, fileName);
    return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
  } catch {
    return false;
  }
}

function hasDirectory(baseDir, dirName) {
  try {
    const fullPath = path.join(baseDir, dirName);
    return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
  } catch {
    return false;
  }
}

function detectProjectProfile(baseDir) {
  const pkg = safeReadJson(path.join(baseDir, "package.json"));

  if (hasFile(baseDir, "artisan") && hasFile(baseDir, "composer.json")) {
    return "laravel";
  }
  if (hasFile(baseDir, "pubspec.yaml")) {
    return "flutter";
  }
  if (pkg) {
    if (
      pkg.dependencies?.["@nestjs/common"] ||
      pkg.dependencies?.["@nestjs/core"] ||
      pkg.devDependencies?.["@nestjs/common"] ||
      pkg.devDependencies?.["@nestjs/core"] ||
      pkg.devDependencies?.["@nestjs/cli"]
    ) {
      return "nestjs";
    }
    if (
      hasFile(baseDir, "angular.json") ||
      pkg.dependencies?.["@angular/core"] ||
      pkg.devDependencies?.["@angular/core"]
    ) {
      return "angular";
    }
    if (pkg.dependencies?.next || pkg.devDependencies?.next) return "next";
    if (pkg.dependencies?.react || pkg.devDependencies?.react) return "react";
    if (pkg.dependencies?.vite || pkg.devDependencies?.vite) return "vite";
    return "node";
  }
  return "unknown";
}

function getProjectTypeLabel(profile) {
  const value = String(profile || "").trim().toLowerCase();

  if (value === "laravel") return "laravel";
  if (value === "flutter") return "flutter";
  if (value === "nestjs") return "nestjs";
  if (value === "angular") return "angular";
  if (value === "next") return "next";
  if (value === "react") return "react";
  if (value === "vite") return "vite";
  if (value === "node") return "node";

  return "unknown";
}

function getPhpVersion(baseDir) {
  try {
    const result = spawnSync("php", ["-v"], {
      cwd: baseDir,
      encoding: "utf8",
      windowsHide: true,
      shell: process.platform === "win32",
    });

    if (result.error || result.status !== 0) {
      return "";
    }

    const output = String(result.stdout || "").trim();
    const firstLine = output.split(/\r?\n/)[0] || "";
    const match = firstLine.match(/PHP\s+([0-9]+\.[0-9]+\.[0-9]+(?:-[^\s]+)?)/i);
    if (match && match[1]) {
      return match[1];
    }

    const fallback = spawnSync("php", ["-r", "echo PHP_VERSION;"], {
      cwd: baseDir,
      encoding: "utf8",
      windowsHide: true,
      shell: process.platform === "win32",
    });

    if (fallback.error || fallback.status !== 0) {
      return "";
    }

    return String(fallback.stdout || "").trim();
  } catch {
    return "";
  }
}

function getLaravelVersion(baseDir) {
  try {
    const composer = safeReadJson(path.join(baseDir, "composer.json"));
    const version = String(composer?.require?.["laravel/framework"] || "").trim();
    return version;
  } catch {
    return "";
  }
}

function getNodePackageManager(baseDir) {
  if (hasFile(baseDir, "pnpm-lock.yaml")) return "pnpm";
  if (hasFile(baseDir, "yarn.lock")) return "yarn";
  return "npm";
}

function runCommandInDir(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    console.log(chalk.red(`❌ Failed to run ${command}`));
    console.log(chalk.yellow(result.error.message));
    process.exit(1);
  }

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }

  return true;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProcessRunningOnWindows(imageName) {
  if (process.platform !== "win32") {
    return false;
  }

  const result = spawnSync("tasklist", ["/FI", `IMAGENAME eq ${imageName}`], {
    encoding: "utf8",
    windowsHide: true,
    shell: true,
  });

  const output = `${result.stdout || ""}\n${result.stderr || ""}`.toLowerCase();
  return output.includes(String(imageName || "").toLowerCase());
}

async function waitForWindowsProcesses(imageNames, timeoutMs = 45000, pollMs = 1500) {
  const targets = Array.from(new Set(imageNames.filter(Boolean)));
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (targets.every((imageName) => isProcessRunningOnWindows(imageName))) {
      return true;
    }

    await sleep(pollMs);
  }

  return false;
}

async function isXamppRunningByPlatform() {
  if (process.platform === "win32") {
    return isProcessRunningOnWindows("httpd.exe") || isProcessRunningOnWindows("mysqld.exe");
  }

  if (process.platform === "darwin") {
    const result = spawnSync("pgrep", ["-f", "xampp"], {
      encoding: "utf8",
      windowsHide: true,
    });
    return result.status === 0;
  }

  return false;
}

async function waitForXamppReadyByPlatform() {
  if (process.platform === "win32") {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 60000) {
      for (const port of [80, 8080]) {
        if (await waitForTcpPort("127.0.0.1", port, 500, 100)) {
          return true;
        }
      }

      await sleep(1500);
    }

    return false;
  }

  if (process.platform === "darwin") {
    const startedAt = Date.now();

    while (Date.now() - startedAt < 45000) {
      if (await isXamppRunningByPlatform()) {
        return true;
      }

      await sleep(1500);
    }

    return false;
  }

  return true;
}

async function waitForXamppStoppedByPlatform() {
  if (process.platform === "win32") {
    const startedAt = Date.now();

    while (Date.now() - startedAt < 45000) {
      const apacheRunning = isProcessRunningOnWindows("httpd.exe");
      const mysqlRunning = isProcessRunningOnWindows("mysqld.exe");

      if (!apacheRunning && !mysqlRunning) {
        return true;
      }

      await sleep(1500);
    }

    return false;
  }

  if (process.platform === "darwin") {
    return true;
  }

  return true;
}

async function closeVsCodeForXamppSwitch() {
  if (process.platform !== "win32") {
    return;
  }

  try {
    console.log(chalk.cyan("Closing VS Code before switching XAMPP..."));
    execSync('cmd /c taskkill /F /T /IM code.exe', {
      stdio: "inherit",
      windowsHide: false,
    });
    console.log(chalk.green("✅ Closed VS Code"));
  } catch {
    console.log(chalk.yellow("⚠️ VS Code was not running or could not be closed automatically"));
  }
}

async function forceCloseXamppLockers() {
  if (process.platform !== "win32") {
    return;
  }

  const processNames = [
    "httpd.exe",
    "mysqld.exe",
    "php.exe",
    "xampp-control.exe",
    "filezilla.exe",
    "mercury.exe",
    "xampp-shell.exe",
  ];

  const result = spawnSync(
    "taskkill",
    ["/F", "/T", ...processNames.flatMap((name) => ["/IM", name])],
    {
      encoding: "utf8",
      windowsHide: true,
    },
  );

  if (result.error) {
    console.log(
      chalk.yellow(
        `⚠️ Could not force-close XAMPP helper processes: ${result.error.message}`,
      ),
    );
    return;
  }

  const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  if (output) {
    console.log(chalk.gray(output));
  }
}

async function renameFolderWithRetry(fromPath, toPath, label, attempts = 5, delayMs = 400) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      fs.renameSync(fromPath, toPath);
      return;
    } catch (error) {
      lastError = error;
      const code = String(error.code || "").toUpperCase();

      if (!["EPERM", "EBUSY"].includes(code) || attempt === attempts) {
        throw error;
      }

      console.log(
        chalk.yellow(
          `⚠️ Retry ${attempt}/${attempts} failed while moving ${label}: ${error.message}`,
        ),
      );
      await sleep(delayMs * attempt);
    }
  }

  throw lastError;
}

async function prepareXamppForLaravelProject(selectedProject) {
  const selectedPhpVersion = getXamppSwitchVersionCandidate(selectedProject.phpVersion);

  const xamppRunning = await isXamppRunningByPlatform();
  if (xamppRunning) {
    console.log(
      chalk.cyan(
        "Stopping XAMPP before switching versions...",
      ),
    );
    await runXamppStopByPlatform();
  }

  if (selectedPhpVersion) {
    console.log(chalk.cyan(`Switching XAMPP to PHP ${selectedPhpVersion}...`));
    await runXamppSwitch(selectedPhpVersion);
  } else {
    console.log(chalk.cyan("Starting XAMPP..."));
    runXamppStartByPlatform();
  }

  console.log(chalk.cyan("Waiting for XAMPP to become ready..."));
  const ready = await waitForXamppReadyByPlatform();
  if (!ready) {
    console.log(chalk.red("❌ XAMPP did not become ready in time"));
    console.log(chalk.yellow("Please start XAMPP manually, then try opening the project again."));
    return false;
  }

  return true;
}

function printRunChecklist(items) {
  console.log(chalk.blueBright("Checks:"));
  for (const item of items) {
    const icon = item.ok ? chalk.green("✓") : chalk.yellow("!");
    console.log(chalk.gray(`  ${icon} ${item.label}${item.detail ? ` - ${item.detail}` : ""}`));
  }
  console.log();
}

function parseEnvFile(filePath) {
  const result = {};
  try {
    if (!fs.existsSync(filePath)) {
      return result;
    }

    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const idx = trimmed.indexOf("=");
      if (idx === -1) {
        continue;
      }

      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      value = value.replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
      result[key] = value;
    }
  } catch {
    return result;
  }

  return result;
}

function waitForTcpPort(host, port, timeoutMs = 30000, pollMs = 1000) {
  return new Promise((resolve) => {
    const startedAt = Date.now();

    const tryConnect = () => {
      const socket = net.connect({ host, port });

      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });

      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          resolve(false);
          return;
        }

        setTimeout(tryConnect, pollMs);
      });

      socket.setTimeout(2000, () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          resolve(false);
          return;
        }

        setTimeout(tryConnect, pollMs);
      });
    };

    tryConnect();
  });
}

function inspectRunEnvironment(baseDir) {
  const profile = detectProjectProfile(baseDir);
  const pkg = safeReadJson(path.join(baseDir, "package.json"));
  const envValues = parseEnvFile(path.join(baseDir, ".env"));
  const checks = [];
  const hasEnv = hasFile(baseDir, ".env");
  const hasEnvExample = hasFile(baseDir, ".env.example");
  const nodeModules = hasDirectory(baseDir, "node_modules");

  if (profile === "laravel") {
    checks.push({ ok: hasEnv, label: ".env", detail: hasEnv ? "found" : hasEnvExample ? "missing, .env.example exists" : "missing" });
    checks.push({ ok: hasFile(baseDir, "artisan"), label: "artisan", detail: "Laravel entry point" });
  } else if (profile === "node" || profile === "nestjs" || profile === "angular" || profile === "react" || profile === "vite" || profile === "next") {
    checks.push({ ok: nodeModules, label: "node_modules", detail: nodeModules ? "installed" : "missing" });
    checks.push({ ok: hasEnv || hasEnvExample, label: ".env", detail: hasEnv ? "found" : hasEnvExample ? "only .env.example found" : "missing" });
  } else if (profile === "flutter") {
    checks.push({ ok: hasFile(baseDir, "pubspec.yaml"), label: "pubspec.yaml", detail: "Flutter project" });
  }

  const scripts = pkg?.scripts ? Object.keys(pkg.scripts) : [];
  const startScript = scripts.includes("start");
  const devScript = scripts.includes("dev");
  const nextStep =
    profile === "laravel" ? "php artisan serve" :
    profile === "flutter" ? "flutter run" :
    devScript ? "npm run dev" :
    startScript ? "npm start" : "";

  return { profile, pkg, checks, hasEnv, hasEnvExample, nodeModules, nextStep, envValues };
}

function getNodeRunCommand(info, manager, action) {
  const scripts = info.pkg?.scripts || {};
  const candidates = {
    dev: info.profile === "nestjs" ? ["start"] : ["dev", "start"],
    watch: info.profile === "nestjs" ? ["start:dev", "dev:watch", "watch"] : ["dev:watch", "watch"],
    build: ["build"],
  }[action];

  const script = candidates.find((name) => scripts[name]);
  if (script) {
    return { command: manager, args: ["run", script], label: `${manager} run ${script}` };
  }

  if (action === "watch" && scripts.dev) {
    return { command: manager, args: ["run", "dev", "--", "--watch"], label: `${manager} run dev -- --watch` };
  }

  // Angular's standard CLI projects sometimes omit the npm scripts.
  if (info.profile === "angular") {
    if (action === "dev") return { command: "npx", args: ["ng", "serve"], label: "npx ng serve" };
    if (action === "watch") return { command: "npx", args: ["ng", "serve", "--watch"], label: "npx ng serve --watch" };
    if (action === "build") return { command: "npx", args: ["ng", "build"], label: "npx ng build" };
  }

  return null;
}

async function runNodeProjectMenu(info, baseDir, projectType) {
  const manager = getNodePackageManager(baseDir);
  if (!info.nodeModules) {
    console.log(chalk.cyan(`Installing dependencies with ${manager}...`));
    runCommandInDir(manager, ["install"], baseDir);
  }

  console.log();
  console.log(chalk.blueBright("Choose a project action:"));
  console.log(chalk.green("  1) dev"));
  console.log(chalk.green("  2) dev watch"));
  console.log(chalk.green("  3) build"));

  const answer = (await askQuestion(chalk.yellow("👉 Choose an option (1-3) [Enter to abort]: "))).trim();
  const action = { "1": "dev", "2": "watch", "3": "build" }[answer];
  if (!action) {
    console.log(chalk.gray("⏹️ Project run aborted"));
    return;
  }

  const runCommand = getNodeRunCommand(info, manager, action);
  if (!runCommand) {
    console.log(chalk.yellow(`ℹ️ No script found for ${action}`));
    return;
  }

  console.log(chalk.cyan(`Running ${runCommand.label}...`));
  setLastRunProject({ path: baseDir, type: projectType });
  runCommandInDir(runCommand.command, runCommand.args, baseDir);
}

function runPilot() {
  const baseDir = process.cwd();
  const info = inspectRunEnvironment(baseDir);

  console.log();
  console.log(chalk.blueBright("qme pilot"));
  console.log(chalk.gray(`Workspace: ${baseDir}`));
  console.log();
  console.log(chalk.green(`Project: ${info.profile}`));

  const gitBranch = (() => {
    try {
      return execSync("git branch --show-current", { cwd: baseDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    } catch {
      return "";
    }
  })();

  if (gitBranch) {
    console.log(chalk.green(`Git branch: ${gitBranch}`));
  }

  printRunChecklist(info.checks);

  const scripts = info.pkg?.scripts ? Object.keys(info.pkg.scripts) : [];
  if (scripts.length) {
    console.log(chalk.green(`Scripts: ${scripts.slice(0, 6).join(", ")}${scripts.length > 6 ? "..." : ""}`));
  }
  console.log(chalk.green(`Env: ${info.hasEnv ? ".env found" : info.hasEnvExample ? ".env.example only" : "missing"}`));
  if (info.nextStep) {
    console.log(chalk.cyan(`Suggested start: ${info.nextStep}`));
  }
  console.log();
}

async function runProjectList() {
  const projects = getSavedProjects();
  if (!projects.length) {
    console.log(chalk.yellow("ℹ️ No saved projects found in config"));
    console.log();
    return;
  }

  console.log(chalk.blueBright("Projects:"));
  projects.forEach((project, index) => {
    const isLaravel = String(project.type || "").toLowerCase() === "laravel";
    const updatedAt = formatShortDateOnly(project.updatedAt);
    const projectName = path.basename(project.path.replace(/[\\/]+$/, ""));

    if (isLaravel) {
      const phpValue = project.phpVersion ? `php: ${project.phpVersion}` : "";
      const laravelValue = project.laravelVersion ? `laravel: ${project.laravelVersion}` : "";
      const updatedValue = updatedAt ? updatedAt : "";
      console.log(chalk.green(`  ${index + 1}) ${projectName} ( ${[phpValue, laravelValue, updatedValue].filter(Boolean).join(" | ")} )`));
    } else if (project.type) {
      const updatedValue = updatedAt ? ` ${updatedAt}` : "";
      console.log(chalk.green(`  ${index + 1}) ${projectName} ( ${project.type} |${updatedValue} )`));
    }
  });

  console.log();
  const answer = await askQuestion(
    chalk.yellow(`👉 Select project to open (1/${projects.length}) [Enter to abort]: `),
  );
  const selected = Number.parseInt(answer, 10);

  if (!Number.isInteger(selected) || selected < 1 || selected > projects.length) {
    console.log(chalk.gray("⏹️".padEnd(4, " ") + "Project open aborted"));
    console.log();
    return;
  }

  const selectedProject = projects[selected - 1];
  if (String(selectedProject.type || "").toLowerCase() === "laravel") {
    const xamppReady = await prepareXamppForLaravelProject(selectedProject);
    if (!xamppReady) {
      console.log();
      return;
    }
  }

  tryOpenInVsCode(selectedProject.path, `${selectedProject.type || "project"} project`, {
    newWindow: true,
  });
  console.log();
}

async function runWorkspace() {
  const baseDir = process.cwd();
  const info = inspectRunEnvironment(baseDir);
  const projectType = getProjectTypeLabel(info.profile);
  const phpVersion = info.profile === "laravel" ? getPhpVersion(baseDir) : "";
  const laravelVersion = info.profile === "laravel" ? getLaravelVersion(baseDir) : "";

  console.log();
  console.log(chalk.blueBright("qme run"));
  console.log(chalk.gray(`Workspace: ${baseDir}`));
  console.log(chalk.green(`Detected: ${projectType}`));
  printRunChecklist(info.checks);

  if (info.profile === "laravel") {
    const dbConnection = String(info.envValues.DB_CONNECTION || "mysql").toLowerCase();
    const dbHost = String(info.envValues.DB_HOST || "127.0.0.1").trim() || "127.0.0.1";
    const dbPort = Number.parseInt(info.envValues.DB_PORT || "3306", 10) || 3306;

    if (dbConnection === "mysql") {
      console.log(chalk.cyan(`Waiting for database ${dbHost}:${dbPort}...`));
      const dbReady = await waitForTcpPort(dbHost, dbPort, 45000, 1500);
      if (!dbReady) {
        console.log(chalk.red("❌ Database is not reachable yet"));
        console.log(chalk.yellow(`Expected MySQL on ${dbHost}:${dbPort}`));
        console.log(chalk.yellow("Start MySQL separately, or fix DB_HOST / DB_PORT in .env"));
        return;
      }
    }

    console.log(chalk.cyan("Starting Laravel server..."));
    setLastRunProject({
      path: baseDir,
      type: projectType,
      phpVersion,
      laravelVersion,
    });
    runCommandInDir("php", ["artisan", "serve"], baseDir);
    return;
  }

  if (info.profile === "flutter") {
    console.log(chalk.cyan("Starting Flutter app..."));
    setLastRunProject({ path: baseDir, type: projectType });
    runCommandInDir("flutter", ["run"], baseDir);
    return;
  }

  if (info.profile === "node" || info.profile === "nestjs" || info.profile === "angular" || info.profile === "react" || info.profile === "vite" || info.profile === "next") {
    await runNodeProjectMenu(info, baseDir, projectType);
    return;
  }

  console.log(chalk.yellow("ℹ️ Unknown project type"));
}

function buildSprintDraft({
  args = [],
  title,
  greeting,
  intro,
}) {
  if (process.platform !== "win32") {
    console.log(chalk.red("❌ This command is only available on Windows"));
    process.exit(1);
  }

  const defaultRecipients = [
    "hr1.neovifytechnolabs@gmail.com",
    "suresh.r@neovify.com",
  ];
  const defaultCcRecipients = [
    "neovifyqa@gmail.com",
    "pm.neovify@gmail.com",
  ];
  const toList = args.length
    ? args.map((arg) => String(arg || "").trim()).filter(Boolean)
    : defaultRecipients;
  const to = toList.join(";");
  const cc = defaultCcRecipients.join(";");
  const monthName = formatMonthName();
  const subject = `${title} ( ${monthName} ) for This Week Backend`;
  const body = [
    greeting,
    "",
    intro,
    "",

    "",
    " Kindly let us know if any additional priorities need to be included",
    "",
  ].join("\r\n");

  return [
    `mailto:${encodeUrlValue(to)}`,
    `?subject=${encodeUrlValue(subject)}`,
    `&body=${encodeUrlValue(body)}`,
    `&cc=${encodeUrlValue(cc)}`,
  ].join("");
}

function runSprintReviewMail(args = []) {
  const composeUrl = buildSprintDraft({
    args,
    title: "Sprint Review",
    greeting: "Hi QA,",
    intro: "Please find the sprint update below.",
  });
  runOutlookMail(composeUrl);
}

function runSprintPlanMail(args = []) {
  const composeUrl = buildSprintDraft({
    args,
    title: "Sprint Plan",
    greeting: "Hi QA,",
    intro: "Please find the sprint plan below.",
  });
  runOutlookMail(composeUrl);
}

function getMysqlBinExecutableCandidates(binaryName) {
  const candidates = [];
  const fileName = process.platform === "win32" ? `${binaryName}.exe` : binaryName;

  for (const xamppRoot of getXamppPathCandidates()) {
    candidates.push(path.join(xamppRoot, "mysql", "bin", fileName));
  }

  candidates.push(binaryName);
  return [...new Set(candidates.filter(Boolean))];
}

function getMysqlExecutableCandidates() {
  return getMysqlBinExecutableCandidates("mysql");
}

function getMysqldumpExecutableCandidates() {
  return getMysqlBinExecutableCandidates("mysqldump");
}

function getMysqlBaseArgs() {
  return ["-u", process.env.QME_MYSQL_USER || "root"];
}

function runMysqlCapture(mysqlPath, mysqlArgs, options = {}) {
  const result = spawnSync(mysqlPath, mysqlArgs, {
    encoding: "utf8",
    windowsHide: true,
    ...options,
  });

  return result;
}

function resolveMysqlBinExecutable(candidates, label) {
  for (const candidate of candidates) {
    const result = runMysqlCapture(candidate, ["--version"]);
    if (!result.error && result.status === 0) {
      return candidate;
    }
  }

  console.log(chalk.red(`❌ ${label} not found`));
  console.log(chalk.yellow(`Install MySQL client tools, add \`${label}\` to PATH, or set XAMPP path: qme config xampp-path <path>`));
  process.exit(1);
}

function resolveMysqlExecutable() {
  return resolveMysqlBinExecutable(getMysqlExecutableCandidates(), "MySQL client");
}

function resolveMysqldumpExecutable() {
  return resolveMysqlBinExecutable(getMysqldumpExecutableCandidates(), "mysqldump");
}

function runMysqlPermission() {
  if (process.platform !== "win32") {
    console.log(chalk.red("❌ This command is only available on Windows"));
    process.exit(1);
  }

  const xamppPath = getXamppPath();
  if (!xamppPath) {
    console.log(chalk.red("❌ XAMPP path is not configured"));
    console.log(chalk.yellow('Set it first: qme config xampp-path "H:\\xampp"'));
    process.exit(1);
  }

  const mysqlDataPath = path.join(xamppPath, "mysql", "data");
  if (!fs.existsSync(mysqlDataPath)) {
    console.log(chalk.red(`❌ MySQL data folder was not found: ${mysqlDataPath}`));
    process.exit(1);
  }

  const username = String(process.env.USERNAME || "").trim();
  if (!username) {
    console.log(chalk.red("❌ Windows username could not be detected"));
    process.exit(1);
  }

  console.log(chalk.cyan(`Applying permissions to: ${mysqlDataPath}`));
  const attribResult = spawnSync("attrib", ["-R", path.join(mysqlDataPath, "*"), "/S", "/D"], {
    stdio: "inherit",
    windowsHide: true,
  });

  if (attribResult.error || attribResult.status !== 0) {
    console.log(chalk.red("❌ Failed to remove read-only attributes"));
    process.exit(1);
  }

  const icaclsResult = spawnSync("icacls", [
    mysqlDataPath,
    "/grant",
    `${username}:(OI)(CI)M`,
  ], {
    stdio: "inherit",
    windowsHide: true,
  });

  if (icaclsResult.error || icaclsResult.status !== 0) {
    console.log(chalk.red("❌ Permission update failed. Run this command as Administrator."));
    process.exit(1);
  }

  console.log(chalk.green("✅ MySQL permissions updated"));
}

function quoteMysqlIdentifier(value) {
  return `\`${String(value).replace(/`/g, "``")}\``;
}

const MYSQL_CREATE_DATABASE_ACTION = "__create_database__";

function isProtectedDatabase(databaseName) {
  return ["information_schema", "mysql", "performance_schema", "phpmyadmin", "sys", "test"].includes(
    String(databaseName || "").toLowerCase(),
  );
}

function parseMysqlLines(output) {
  return String(output || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getMysqlDatabases(mysqlPath) {
  const result = runMysqlCapture(mysqlPath, [
    ...getMysqlBaseArgs(),
    "--batch",
    "--skip-column-names",
    "-e",
    "SHOW DATABASES;",
  ]);

  if (result.error || result.status !== 0) {
    console.log(chalk.red("❌ Failed to list MySQL databases"));
    const message = result.error ? result.error.message : result.stderr;
    if (message) {
      console.log(chalk.yellow(String(message).trim()));
    }
    console.log(chalk.gray("Tip: set user with QME_MYSQL_USER if root is not correct."));
    process.exit(1);
  }

  return parseMysqlLines(result.stdout).filter(
    (databaseName) => !isProtectedDatabase(databaseName),
  );
}

async function askMysqlDatabase(databases) {
  console.log(chalk.blueBright("MySQL databases:"));
  console.log(chalk.green("  0) Create new database"));
  databases.forEach((database, index) => {
    console.log(chalk.green(`  ${index + 1}) ${database}`));
  });

  console.log();
  const answer = await askQuestion(
    chalk.yellow(`👉 Choose database (0-${databases.length}) [press Enter to abort]: `),
  );

  if (!answer) {
    console.log(chalk.yellow("ℹ️ MySQL action cancelled"));
    process.exit(0);
  }

  const selectedIndex = Number.parseInt(answer, 10);
  if (selectedIndex === 0) {
    return MYSQL_CREATE_DATABASE_ACTION;
  }

  if (
    Number.isNaN(selectedIndex) ||
    selectedIndex < 1 ||
    selectedIndex > databases.length
  ) {
    console.log(chalk.red("❌ Invalid database selection"));
    process.exit(1);
  }

  return databases[selectedIndex - 1];
}

async function askMysqlAction(databaseName) {
  console.log();
  console.log(chalk.blueBright(`Selected database: ${databaseName}`));
  console.log(chalk.green("  1) Import database"));
  console.log(chalk.green("  2) Export database"));
  console.log(chalk.green("  3) Drop all tables"));
  console.log(chalk.green("  4) Delete database"));
  console.log(chalk.green("  5) Open mysql shell"));
  console.log(chalk.green("  6) Abort"));

  const answer = await askQuestion(
    chalk.yellow("👉 Choose action (1/2/3/4/5/6) [default: 6]: "),
  );

  if (answer === "1") {
    return "import";
  }

  if (answer === "2") {
    return "export";
  }

  if (answer === "3") {
    return "truncate";
  }

  if (answer === "4") {
    return "delete";
  }

  if (answer === "5") {
    return "shell";
  }

  return "abort";
}

function resolveSqlFilePath(inputPath) {
  const resolvedPath = parseFileUriToPath(inputPath);
  if (!resolvedPath || !fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    console.log(chalk.red("❌ SQL file not found"));
    console.log(chalk.yellow(`Path: ${inputPath}`));
    process.exit(1);
  }

  return resolvedPath;
}

function getMysqlExportDefaultPath(databaseName) {
  const now = new Date();
  const datePart = [
    String(now.getDate()).padStart(2, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getFullYear()).slice(-2),
  ].join("-");

  return path.join(os.homedir(), "Downloads", `${databaseName}-${datePart}.sql`);
}

function resolveSqlExportPath(inputPath, databaseName) {
  const resolvedPath = inputPath
    ? path.resolve(parseFileUriToPath(inputPath) || inputPath)
    : getMysqlExportDefaultPath(databaseName);

  const exportDir = path.dirname(resolvedPath);
  if (!fs.existsSync(exportDir) || !fs.statSync(exportDir).isDirectory()) {
    console.log(chalk.red("❌ Export directory not found"));
    console.log(chalk.yellow(`Path: ${exportDir}`));
    process.exit(1);
  }

  return resolvedPath;
}

function importMysqlDatabase(mysqlPath, databaseName, sqlFilePath) {
  const result = spawnSync(
    mysqlPath,
    [...getMysqlBaseArgs(), databaseName],
    {
      stdio: ["pipe", "inherit", "inherit"],
      input: fs.readFileSync(sqlFilePath),
      windowsHide: true,
    },
  );

  if (result.error || result.status !== 0) {
    console.log(chalk.red("❌ Database import failed"));
    if (result.error) {
      console.log(chalk.yellow(result.error.message));
    }
    process.exit(result.status || 1);
  }

  console.log(chalk.green(`✅ Imported ${sqlFilePath} into ${databaseName}`));
}

async function askMysqlDatabaseName(promptText = "🗄️ Enter new database name: ") {
  const databaseName = await askQuestion(chalk.magenta(promptText));
  if (!databaseName) {
    console.log(chalk.yellow("ℹ️ Database create cancelled"));
    process.exit(0);
  }

  return databaseName.trim();
}

function createMysqlDatabase(mysqlPath, databaseName) {
  if (!databaseName) {
    console.log(chalk.red("❌ Database name required"));
    process.exit(1);
  }

  if (isProtectedDatabase(databaseName)) {
    console.log(chalk.red(`❌ Refusing to create protected database name: ${databaseName}`));
    process.exit(1);
  }

  const result = runMysqlCapture(mysqlPath, [
    ...getMysqlBaseArgs(),
    "-e",
    `CREATE DATABASE ${quoteMysqlIdentifier(databaseName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
  ]);

  if (result.error || result.status !== 0) {
    console.log(chalk.red("❌ Failed to create database"));
    const message = result.error ? result.error.message : result.stderr;
    if (message) {
      console.log(chalk.yellow(String(message).trim()));
    }
    process.exit(1);
  }

  console.log(chalk.green(`✅ Created database: ${databaseName}`));
}

async function deleteMysqlDatabase(mysqlPath, databaseName) {
  if (isProtectedDatabase(databaseName)) {
    console.log(chalk.red(`❌ Refusing to delete protected database: ${databaseName}`));
    process.exit(1);
  }

  console.log(chalk.red(`⚠️ This will permanently delete database: ${databaseName}`));
  const confirmation = await askQuestion(
    chalk.yellow("Are you sure? yes/no [default: no]: "),
  );

  if (String(confirmation || "").trim().toLowerCase() !== "yes") {
    console.log(chalk.yellow("ℹ️ Delete cancelled"));
    process.exit(0);
  }

  const result = runMysqlCapture(mysqlPath, [
    ...getMysqlBaseArgs(),
    "-e",
    `DROP DATABASE ${quoteMysqlIdentifier(databaseName)};`,
  ]);

  if (result.error || result.status !== 0) {
    console.log(chalk.red("❌ Failed to delete database"));
    const message = result.error ? result.error.message : result.stderr;
    if (message) {
      console.log(chalk.yellow(String(message).trim()));
    }
    process.exit(1);
  }

  console.log(chalk.green(`✅ Deleted database: ${databaseName}`));
}

function exportMysqlDatabase(mysqldumpPath, databaseName, outputPath) {
  const outFd = fs.openSync(outputPath, "w");

  try {
    const result = spawnSync(
      mysqldumpPath,
      [
        ...getMysqlBaseArgs(),
        "--routines",
        "--triggers",
        "--single-transaction",
        databaseName,
      ],
      {
        stdio: ["ignore", outFd, "inherit"],
        windowsHide: true,
      },
    );

    if (result.error || result.status !== 0) {
      console.log(chalk.red("❌ Database export failed"));
      if (result.error) {
        console.log(chalk.yellow(result.error.message));
      }
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size === 0) {
        fs.unlinkSync(outputPath);
      }
      process.exit(result.status || 1);
    }
  } finally {
    fs.closeSync(outFd);
  }

  console.log(chalk.green(`✅ Exported ${databaseName} to ${outputPath}`));
}

function runMysqlShell(mysqlPath, databaseName) {
  const result = spawnSync(
    mysqlPath,
    [...getMysqlBaseArgs(), databaseName],
    {
      stdio: "inherit",
      windowsHide: false,
    },
  );

  if (result.error) {
    console.log(chalk.red("❌ Failed to open MySQL shell"));
    console.log(chalk.yellow(result.error.message));
    process.exit(1);
  }

  process.exit(typeof result.status === "number" ? result.status : 0);
}

function getMysqlTables(mysqlPath, databaseName) {
  const result = runMysqlCapture(mysqlPath, [
    ...getMysqlBaseArgs(),
    "--batch",
    "--skip-column-names",
    databaseName,
    "-e",
    "SHOW FULL TABLES WHERE Table_type = 'BASE TABLE';",
  ]);

  if (result.error || result.status !== 0) {
    console.log(chalk.red("❌ Failed to read MySQL tables"));
    const message = result.error ? result.error.message : result.stderr;
    if (message) {
      console.log(chalk.yellow(String(message).trim()));
    }
    process.exit(1);
  }

  return parseMysqlLines(result.stdout).map((line) => line.split(/\t/)[0]).filter(Boolean);
}

async function dropMysqlTables(mysqlPath, databaseName) {
  if (isProtectedDatabase(databaseName)) {
    console.log(chalk.red(`❌ Refusing to modify protected database: ${databaseName}`));
    process.exit(1);
  }

  const tables = getMysqlTables(mysqlPath, databaseName);
  if (tables.length === 0) {
    console.log(chalk.yellow(`ℹ️ No base tables found in ${databaseName}`));
    return;
  }

  console.log(chalk.yellow(`⚠️ This will drop ${tables.length} table(s) in ${databaseName}.`));
  const confirmation = await askQuestion(
    chalk.yellow(`Type DROP ${databaseName} to continue: `),
  );

  if (confirmation !== `DROP ${databaseName}`) {
    console.log(chalk.yellow("ℹ️ Drop cancelled"));
    process.exit(0);
  }

  const statements = [
    "SET FOREIGN_KEY_CHECKS=0;",
    ...tables.map((table) => `DROP TABLE ${quoteMysqlIdentifier(table)};`),
    "SET FOREIGN_KEY_CHECKS=1;",
  ].join("\n");

  const result = runMysqlCapture(mysqlPath, [
    ...getMysqlBaseArgs(),
    databaseName,
    "-e",
    statements,
  ]);

  if (result.error || result.status !== 0) {
    console.log(chalk.red("❌ Failed to drop tables"));
    const message = result.error ? result.error.message : result.stderr;
    if (message) {
      console.log(chalk.yellow(String(message).trim()));
    }
    process.exit(1);
  }

  console.log(chalk.green(`✅ Dropped ${tables.length} table(s) in ${databaseName}`));
}

async function runMysqlMenu(args) {
  const mysqlPath = resolveMysqlExecutable();
  const databases = getMysqlDatabases(mysqlPath);
  const firstArg = args[1] && !String(args[1]).startsWith("-") ? args[1] : "";
  const firstArgIsAction = [
    "create",
    "import",
    "inport",
    "truncate",
    "delete",
    "drop",
    "export",
    "shell",
  ].includes(firstArg);

  if (firstArg === "create") {
    createMysqlDatabase(mysqlPath, args.slice(2).join(" ") || await askMysqlDatabaseName());
    return;
  }

  if (databases.length === 0) {
    console.log(chalk.yellow("ℹ️ No MySQL databases found"));
    createMysqlDatabase(mysqlPath, await askMysqlDatabaseName());
    return;
  }

  const databaseName = firstArg && !firstArgIsAction
    ? firstArg
    : await askMysqlDatabase(databases);

  if (databaseName === MYSQL_CREATE_DATABASE_ACTION) {
    createMysqlDatabase(mysqlPath, await askMysqlDatabaseName());
    return;
  }

  if (!databases.includes(databaseName)) {
    console.log(chalk.red(`❌ Database not found: ${databaseName}`));
    process.exit(1);
  }

  const action = firstArgIsAction ? firstArg : args[2] || await askMysqlAction(databaseName);
  const fileArgIndex = firstArgIsAction ? 2 : 3;

  if (action === "import" || action === "inport") {
    if (isProtectedDatabase(databaseName)) {
      console.log(chalk.red(`❌ Refusing to import into protected database: ${databaseName}`));
      process.exit(1);
    }

    const sqlFileInput = args.slice(fileArgIndex).join(" ")
      || await askQuestion(chalk.magenta("📄 Enter .sql file path: "));
    if (!sqlFileInput) {
      console.log(chalk.yellow("ℹ️ Import cancelled"));
      process.exit(0);
    }

    importMysqlDatabase(mysqlPath, databaseName, resolveSqlFilePath(sqlFileInput));
    return;
  }

  if (action === "export") {
    const defaultExportPath = getMysqlExportDefaultPath(databaseName);
    const outputInput = args.slice(fileArgIndex).join(" ")
      || await askQuestion(
        chalk.magenta(`💾 Enter export .sql file path [default: ${defaultExportPath}]: `),
      );

    exportMysqlDatabase(
      resolveMysqldumpExecutable(),
      databaseName,
      resolveSqlExportPath(outputInput, databaseName),
    );
    return;
  }

  if (action === "truncate") {
    await dropMysqlTables(mysqlPath, databaseName);
    return;
  }

  if (action === "delete" || action === "drop") {
    await deleteMysqlDatabase(mysqlPath, databaseName);
    return;
  }

  if (action === "shell") {
    runMysqlShell(mysqlPath, databaseName);
    return;
  }

  console.log(chalk.yellow("ℹ️ MySQL action cancelled"));
}

function getAvailableXamppVersions(baseDir, activeVersion) {
  if (!fs.existsSync(baseDir) || !fs.statSync(baseDir).isDirectory()) {
    return [];
  }

  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^xampp-(.+)$/i.test(entry.name))
    .map((entry) => normalizeXamppVersion(entry.name))
    .filter(
      (version) =>
        version &&
        version.toLowerCase() !== String(activeVersion || "").toLowerCase(),
    )
    .sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
}

async function runXamppSwitch(requestedVersionRaw) {
  if (process.platform !== "win32") {
    console.log(chalk.red("❌ xampp switch is currently supported on Windows"));
    process.exit(1);
  }

  const xamppRoot = getXamppPath() || "D:\\xampp";
  const currentVersion = getXamppSwitchVersionCandidate(getXamppCurrentVersion());
  if (!currentVersion) {
    console.log(chalk.red("❌ XAMPP current version is not set"));
    console.log(chalk.yellow("Set it first: qme config xampp-v <version>"));
    process.exit(1);
  }

  if (!fs.existsSync(xamppRoot) || !fs.statSync(xamppRoot).isDirectory()) {
    console.log(chalk.red(`❌ Active XAMPP folder not found: ${xamppRoot}`));
    process.exit(1);
  }

  const baseDir = path.dirname(xamppRoot);
  const requestedVersionCandidates = [];
  const normalizedRequested = normalizeXamppVersion(requestedVersionRaw);
  if (normalizedRequested) {
    requestedVersionCandidates.push(normalizedRequested);
    const phpParts = normalizePhpVersionParts(normalizedRequested);
    if (phpParts.majorMinor && phpParts.majorMinor !== normalizedRequested) {
      requestedVersionCandidates.push(phpParts.majorMinor);
    }
  }

  let requestedVersion = "";

  if (requestedVersionCandidates.length === 0) {
    const availableVersions = getAvailableXamppVersions(
      baseDir,
      currentVersion,
    );
    if (availableVersions.length === 0) {
      console.log(chalk.red(`❌ No switch targets found in: ${baseDir}`));
      console.log(chalk.yellow("Expected folders like: xampp-7.4, xampp-8.1"));
      process.exit(1);
    }

    console.log(chalk.blue(`📁 Active path: ${xamppRoot}`));
    console.log(chalk.blue(`📂 Searching switch targets in: ${baseDir}`));
    console.log(chalk.green(`🟢 Current active version: ${currentVersion}`));
    console.log(chalk.blue("🔹 Available XAMPP versions:"));
    availableVersions.forEach((version, index) => {
      console.log(chalk.green(`  ${index + 1}) ${version}`));
    });

    const answer = await askQuestion(
      chalk.yellow(
        `👉 Choose version (1-${availableVersions.length}) [press Enter to abort]: `,
      ),
    );
    if (!answer) {
      console.log(chalk.yellow("ℹ️ Switch cancelled"));
      process.exit(0);
    }

    const selectedIndex = Number.parseInt(answer, 10);
    if (
      Number.isNaN(selectedIndex) ||
      selectedIndex < 1 ||
      selectedIndex > availableVersions.length
    ) {
      console.log(chalk.red("❌ Invalid selection"));
      process.exit(1);
    }

    requestedVersion = availableVersions[selectedIndex - 1];
  } else {
    const availableVersions = getAvailableXamppVersions(baseDir, currentVersion);
    requestedVersion =
      requestedVersionCandidates.find((candidate) =>
        availableVersions.some(
          (availableVersion) =>
            availableVersion.toLowerCase() === candidate.toLowerCase(),
        ),
      ) || requestedVersionCandidates[0];
  }

  if (currentVersion.toLowerCase() === requestedVersion.toLowerCase()) {
    console.log(chalk.yellow(`ℹ️ XAMPP ${requestedVersion} is already active`));
    console.log(chalk.green("✅ Starting XAMPP with the current version..."));
    runXamppStart();
    return;
  }

  const currentVersionDir = path.join(baseDir, `xampp-${currentVersion}`);
  const requestedVersionDir = path.join(baseDir, `xampp-${requestedVersion}`);

  if (
    !fs.existsSync(requestedVersionDir) ||
    !fs.statSync(requestedVersionDir).isDirectory()
  ) {
    console.log(
      chalk.red(`❌ Requested XAMPP folder not found: ${requestedVersionDir}`),
    );
    process.exit(1);
  }

  if (fs.existsSync(currentVersionDir)) {
    console.log(
      chalk.red(`❌ Destination already exists: ${currentVersionDir}`),
    );
    console.log(
      chalk.yellow("Update xampp-v or rename/remove that folder first."),
    );
    process.exit(1);
  }

  const performSwap = async () => {
    await renameFolderWithRetry(
      xamppRoot,
      currentVersionDir,
      "active XAMPP folder",
    );
    try {
      await renameFolderWithRetry(
        requestedVersionDir,
        xamppRoot,
        "requested XAMPP folder",
      );
    } catch (swapError) {
      await renameFolderWithRetry(
        currentVersionDir,
        xamppRoot,
        "original XAMPP folder rollback",
      );
      throw swapError;
    }
  };

  let switchError = null;
  try {
    await performSwap();
  } catch (error) {
    switchError = error;
  }

  if (switchError && ["EPERM", "EBUSY"].includes(String(switchError.code || "").toUpperCase())) {
    console.log(chalk.yellow("⚠️ XAMPP folder looks busy. Stopping services and retrying once..."));
    await runXamppStopByPlatform();
    const stopped = await waitForXamppStoppedByPlatform();
    if (!stopped) {
      console.log(chalk.yellow("⚠️ XAMPP services still appear to be stopping. Retrying folder swap anyway..."));
    }
    await closeVsCodeForXamppSwitch();
    await forceCloseXamppLockers();
    try {
      await performSwap();
      switchError = null;
    } catch (retryError) {
      switchError = retryError;
    }
  }

  if (switchError) {
    console.log(chalk.red("❌ Failed to switch XAMPP folders"));
    console.log(chalk.yellow(switchError.message));
    process.exit(1);
  }

  setXamppPath(xamppRoot, { silent: true });
  setXamppCurrentVersion(requestedVersion, { silent: true });

  console.log(
    chalk.green(
      `✅ Switched XAMPP from ${currentVersion} to ${requestedVersion}`,
    ),
  );
  console.log(chalk.green(`✅ Active folder: ${xamppRoot}`));
  console.log(
    chalk.green(`✅ Previous active folder renamed as: ${currentVersionDir}`),
  );
  console.log(chalk.green("✅ Starting XAMPP with switched version..."));
  runXamppStart();
}

function runXamppStartByPlatform() {
  if (process.platform === "darwin") {
    runMacXamppStart();
    return;
  }

  if (process.platform === "win32") {
    runXamppStart();
    return;
  }

  console.log(
    chalk.red("❌ XAMPP commands are currently supported on Windows and macOS"),
  );
  process.exit(1);
}

async function runXamppStopByPlatform() {
  if (process.platform === "darwin") {
    await runMacXamppStop();
    return;
  }

  if (process.platform === "win32") {
    await runXamppStop();
    return;
  }

  console.log(
    chalk.red("❌ XAMPP commands are currently supported on Windows and macOS"),
  );
  process.exit(1);
}

function getDefaultXamppPathsByPlatform() {
  if (process.platform === "win32") {
    return ["C:\\xampp", "D:\\xampp"];
  }

  if (process.platform === "darwin") {
    return ["/Applications/XAMPP"];
  }

  return [];
}

function getXamppPathCandidates() {
  const candidates = [];
  const configuredPath = getXamppPath();

  if (configuredPath) {
    candidates.push(configuredPath);
  }

  if (process.platform === "win32") {
    ["XAMPP_HOME", "XAMPP_PATH", "XAMPP_DIR"].forEach((key) => {
      const value = process.env[key];
      if (value && value.trim()) {
        candidates.push(value.trim());
      }
    });
  }

  candidates.push(...getDefaultXamppPathsByPlatform());

  return [...new Set(
    candidates
      .map((value) =>
        String(value || "")
          .trim()
          .replace(/^"+|"+$/g, "")
          .replace(/[\\\/]+$/g, ""),
      )
      .filter(Boolean),
  )];
}

function resolveXamppPhpIniPath() {
  const xamppRoots = getXamppPathCandidates();

  if (xamppRoots.length === 0) {
    console.log(
      chalk.red("❌ XAMPP php.ini lookup is supported on Windows and macOS"),
    );
    process.exit(1);
  }

  const candidates = xamppRoots.flatMap((xamppRoot) =>
    process.platform === "darwin"
      ? [
        path.join(xamppRoot, "xamppfiles", "etc", "php.ini"),
        path.join(xamppRoot, "etc", "php.ini"),
        path.join(xamppRoot, "php", "php.ini"),
      ]
      : [path.join(xamppRoot, "php", "php.ini")],
  );

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  console.log(chalk.red("❌ XAMPP php.ini file not found"));
  console.log(chalk.yellow(`XAMPP paths: ${xamppRoots.join(", ")}`));
  console.log(chalk.yellow(`Checked: ${candidates.join(", ")}`));
  console.log(chalk.yellow("Set path with: qme config xampp-path <path>"));
  process.exit(1);
}

function resolveXamppHtdocsPath() {
  const xamppRoots = getXamppPathCandidates();

  if (xamppRoots.length === 0) {
    console.log(
      chalk.red("❌ XAMPP htdocs lookup is supported on Windows and macOS"),
    );
    process.exit(1);
  }

  const candidates = xamppRoots.flatMap((xamppRoot) =>
    process.platform === "darwin"
      ? [
        path.join(xamppRoot, "xamppfiles", "htdocs"),
        path.join(xamppRoot, "htdocs"),
      ]
      : [path.join(xamppRoot, "htdocs")],
  );

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  console.log(chalk.red("❌ XAMPP htdocs folder not found"));
  console.log(chalk.yellow(`XAMPP paths: ${xamppRoots.join(", ")}`));
  console.log(chalk.yellow(`Checked: ${candidates.join(", ")}`));
  console.log(chalk.yellow("Set path with: qme config xampp-path <path>"));
  process.exit(1);
}

const SKIPPED_XAMPP_PROJECT_FOLDERS = new Set([
  "dashboard",
  "img",
  "webalizer",
  "xampp",
]);

async function runXamppProjects() {
  const htdocsPath = resolveXamppHtdocsPath();
  const projects = fs
    .readdirSync(htdocsPath, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        !SKIPPED_XAMPP_PROJECT_FOLDERS.has(entry.name.toLowerCase()),
    )
    .map((entry) => entry.name)
    .sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );

  if (projects.length === 0) {
    console.log(chalk.yellow("ℹ️ No project folders found in XAMPP htdocs"));
    return;
  }

  console.log(chalk.blueBright("XAMPP projects:"));
  projects.forEach((project, index) => {
    console.log(chalk.green(`  ${index + 1}) ${project}`));
  });

  console.log();
  const answer = await askQuestion(
    chalk.yellow(`👉 Choose project (1-${projects.length}) [press Enter to abort]: `),
  );

  if (!answer) {
    console.log(chalk.yellow("ℹ️ Project open cancelled"));
    return;
  }

  const selectedIndex = Number.parseInt(answer, 10);
  if (
    Number.isNaN(selectedIndex) ||
    selectedIndex < 1 ||
    selectedIndex > projects.length
  ) {
    console.log(chalk.red("❌ Invalid project selection"));
    process.exit(1);
  }

  tryOpenInVsCode(path.join(htdocsPath, projects[selectedIndex - 1]), "XAMPP project", {
    newWindow: true,
  });
}

function getOptionValue(argv, keys) {
  const index = argv.findIndex((item) => keys.includes(item));
  if (index === -1) {
    return null;
  }

  const value = argv[index + 1];
  if (!value || value.startsWith("-")) {
    return null;
  }

  return value;
}

function runNodeToolCommand(tool, toolArgs) {
  const result = spawnSync(tool, toolArgs, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    console.log(chalk.red(`❌ Failed to run ${tool}`));
    console.log(chalk.yellow(result.error.message));
    process.exit(1);
  }

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

function resolveAdbExecutable() {
  const candidates = process.platform === "win32" ? ["adb.exe", "adb"] : ["adb"];

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["--version"], {
      stdio: "ignore",
      shell: process.platform === "win32",
    });

    if (!result.error && result.status === 0) {
      return candidate;
    }
  }

  console.log(chalk.red("❌ adb not found"));
  console.log(chalk.yellow("Install Android platform-tools and make sure `adb` is available in PATH."));
  process.exit(1);
}

function runAdbCommand(adbPath, adbArgs, options = {}) {
  const { allowFailure = false, input = undefined, expectSuccessText = "" } = options;
  const commandText = ["adb", ...adbArgs].join(" ");
  console.log(chalk.cyan(`▶ ${commandText}`));

  const result = spawnSync(adbPath, adbArgs, {
    encoding: "utf8",
    input,
    shell: process.platform === "win32",
    windowsHide: false,
  });

  if (result.stdout && String(result.stdout).trim()) {
    console.log(String(result.stdout).trimEnd());
  }

  if (result.stderr && String(result.stderr).trim()) {
    console.log(chalk.yellow(String(result.stderr).trimEnd()));
  }

  const combinedOutput = `${result.stdout || ""}\n${result.stderr || ""}`;
  const hasExpectedSuccessText =
    !expectSuccessText || combinedOutput.toLowerCase().includes(expectSuccessText.toLowerCase());
  const outputIndicatesFailure =
    /failed|unable to|cannot|error:/i.test(combinedOutput) && !hasExpectedSuccessText;

  if (
    result.error ||
    (typeof result.status === "number" && result.status !== 0) ||
    outputIndicatesFailure
  ) {
    if (allowFailure) {
      return { ok: false, result };
    }

    const message = result.error ? result.error.message : `adb exited with status ${result.status}`;
    console.log(chalk.red(`❌ ${message}`));
    process.exit(typeof result.status === "number" ? result.status : 1);
  }

  return { ok: true, result };
}

function runFlutterCommand(flutterArgs) {
  const result = spawnSync("flutter", flutterArgs, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    console.log(chalk.red("❌ Failed to run Flutter command"));
    console.log(chalk.yellow(result.error.message));
    process.exit(1);
  }

  process.exit(typeof result.status === "number" ? result.status : 0);
}

function printFlutterMenu() {
  console.log(chalk.blueBright("Flutter menu"));
  console.log(chalk.green("  1) App run"));
  console.log(chalk.green("  2) Run debug"));
  console.log(chalk.green("  3) Run release"));
  console.log(chalk.green("  4) List devices"));
  console.log(chalk.green("  5) Clean project"));
  console.log(chalk.green("  6) Build APK"));
  console.log(chalk.green("  7) Build App Bundle"));
  console.log(chalk.green("  8) Build Web"));
  console.log(chalk.green("  9) Build Windows"));
  console.log(chalk.green("  10) Build macOS"));
  console.log(chalk.green("  11) Build Linux"));
  console.log(chalk.green("  12) Build iOS"));
  console.log(chalk.gray("  You can also use: qme flutter run | build | devices | clean"));
}

async function runFlutterMenu() {
  printFlutterMenu();

  const choice = String(
    await askQuestion(chalk.yellow("👉 Choose option (1-12) [press Enter to abort]: ")),
  ).trim();

  if (!choice) {
    console.log(chalk.yellow("ℹ️ Flutter menu cancelled"));
    return;
  }

  if (choice === "1") {
    runFlutterCommand(["run"]);
    return;
  }

  if (choice === "2") {
    runFlutterCommand(["run", "--debug"]);
    return;
  }

  if (choice === "3") {
    runFlutterCommand(["run", "--release"]);
    return;
  }

  if (choice === "4") {
    runFlutterCommand(["devices"]);
    return;
  }

  if (choice === "5") {
    runFlutterCommand(["clean"]);
    return;
  }

  if (choice === "6") {
    runFlutterCommand(["build", "apk"]);
    return;
  }

  if (choice === "7") {
    runFlutterCommand(["build", "appbundle"]);
    return;
  }

  if (choice === "8") {
    runFlutterCommand(["build", "web"]);
    return;
  }

  if (choice === "9") {
    runFlutterCommand(["build", "windows"]);
    return;
  }

  if (choice === "10") {
    runFlutterCommand(["build", "macos"]);
    return;
  }

  if (choice === "11") {
    runFlutterCommand(["build", "linux"]);
    return;
  }

  if (choice === "12") {
    runFlutterCommand(["build", "ios"]);
    return;
  }

  console.log(chalk.red("❌ Invalid selection"));
  process.exit(1);
}

function getAdbDeviceList(adbPath) {
  const { result } = runAdbCommand(adbPath, ["devices"]);
  const lines = String(result.stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1);

  return lines
    .map((line) => {
      const [serial = "", status = ""] = line.split(/\s+/);
      return { serial, status };
    })
    .filter((device) => device.serial);
}

function printAdbMenu() {
  console.log(chalk.blueBright("ADB menu"));
  console.log(chalk.green("  1) devices"));
  console.log(chalk.green("  2) connect"));
  console.log(chalk.green("  3) disconnect"));
  console.log(chalk.gray("  Tip: qme adb connect will ask for IP and port"));
}

function runAdbDevices() {
  const adbPath = resolveAdbExecutable();
  runAdbCommand(adbPath, ["devices"]);
}

async function runAdbConnect(target) {
  const adbPath = resolveAdbExecutable();
  let connectTarget = String(target || "").trim();

  if (!connectTarget) {
    const ipAddress = (await askQuestion(chalk.magenta("📶 Enter device IP address: "))).trim();
    if (!ipAddress) {
      console.log(chalk.red("❌ IP address is required"));
      process.exit(1);
    }

    const portValue = (await askQuestion(chalk.magenta("🔌 Enter ADB port [default: 5555]: "))).trim();
    const port = portValue || "5555";

    if (!/^\d+$/.test(port)) {
      console.log(chalk.red("❌ Invalid port"));
      process.exit(1);
    }

    connectTarget = `${ipAddress}:${port}`;
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(connectTarget)) {
    const portValue = (await askQuestion(chalk.magenta("🔌 Enter ADB port [default: 5555]: "))).trim();
    const port = portValue || "5555";

    if (!/^\d+$/.test(port)) {
      console.log(chalk.red("❌ Invalid port"));
      process.exit(1);
    }

    connectTarget = `${connectTarget}:${port}`;
  }

  const connectResult = runAdbCommand(adbPath, ["connect", connectTarget], {
    expectSuccessText: "connected to",
  });

  const connectOutput = `${connectResult.result.stdout || ""}\n${connectResult.result.stderr || ""}`;
  if (!/connected to|already connected to/i.test(connectOutput)) {
    console.log(chalk.red("❌ Wireless connection failed"));
    console.log(chalk.yellow(String(connectOutput).trim() || "adb connect did not report a successful connection."));
    process.exit(1);
  }

  console.log(chalk.green(`✅ Wireless ADB connected: ${connectTarget}`));
}

async function runAdbDisconnect(target) {
  const adbPath = resolveAdbExecutable();
  const rawTarget = String(target || "").trim();
  const args = ["disconnect"];

  if (rawTarget) {
    args.push(rawTarget.includes(":") ? rawTarget : `${rawTarget}:5555`);
  }

  runAdbCommand(adbPath, args);
}

async function runAdbWifiConnect() {
  const adbPath = resolveAdbExecutable();

  console.log(chalk.blueBright("ADB over Wi-Fi setup"));
  console.log(chalk.gray("Make sure the phone is connected by USB first and USB debugging is authorized."));

  const devices = getAdbDeviceList(adbPath);
  const onlineDevices = devices.filter((device) => device.status === "device");
  const unauthorizedDevices = devices.filter((device) => device.status === "unauthorized");

  if (unauthorizedDevices.length > 0) {
    console.log(chalk.red("❌ USB debugging is not authorized"));
    console.log(chalk.yellow("Open the phone, accept the USB debugging prompt, then try again."));
    process.exit(1);
  }

  if (onlineDevices.length === 0) {
    console.log(chalk.red("❌ No Android device found"));
    console.log(chalk.yellow("Connect the device by USB and confirm `adb devices` shows a `device` status."));
    process.exit(1);
  }

  const selectedDevice = onlineDevices[0];
  if (onlineDevices.length > 1) {
    console.log(chalk.yellow(`ℹ️ Multiple devices detected. Using ${selectedDevice.serial}`));
  } else {
    console.log(chalk.green(`✅ USB device detected: ${selectedDevice.serial}`));
  }

  runAdbCommand(adbPath, ["-s", selectedDevice.serial, "tcpip", "5555"], {
    expectSuccessText: "restarting in tcp mode",
  });

  const finalIp = (await askQuestion(
    chalk.magenta("📶 Enter device IP address: "),
  )).trim();

  if (!finalIp) {
    console.log(chalk.red("❌ Invalid or unreachable IP address"));
    console.log(chalk.yellow("Run `adb shell ip route` or `adb shell ifconfig` again and try a valid IPv4 address."));
    process.exit(1);
  }

  console.log(chalk.blueBright("Connect the computer and device to the same Wi-Fi network, then disconnect the USB cable when ready."));
  const connectAnswer = await askQuestion(chalk.yellow("👉 Press Enter to continue with wireless connection: "));
  void connectAnswer;

  const connectResult = runAdbCommand(adbPath, ["connect", `${finalIp}:5555`], {
    expectSuccessText: "connected to",
  });

  const connectOutput = `${connectResult.result.stdout || ""}\n${connectResult.result.stderr || ""}`;
  if (!/connected to|already connected to/i.test(connectOutput)) {
    console.log(chalk.red("❌ Wireless connection failed"));
    console.log(chalk.yellow(String(connectOutput).trim() || "adb connect did not report a successful connection."));
    console.log(chalk.yellow("Common causes:"));
    console.log(chalk.yellow("  - Device not found"));
    console.log(chalk.yellow("  - Both devices are not on the same Wi-Fi network"));
    console.log(chalk.yellow("  - USB debugging not authorized"));
    console.log(chalk.yellow("  - TCP/IP mode not enabled"));
    console.log(chalk.yellow("  - Invalid or unreachable IP address"));
    process.exit(1);
  }

  console.log(chalk.blueBright("Verifying wireless ADB connection..."));
  const verify = runAdbCommand(adbPath, ["devices"]);
  const verifyText = String(verify.result.stdout || "");
  const connectedLine = verifyText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith(`${finalIp}:5555`));

  if (!connectedLine || !/\bdevice\b/i.test(connectedLine)) {
    console.log(chalk.red("❌ Wireless connection failed"));
    console.log(chalk.yellow("Common causes:"));
    console.log(chalk.yellow("  - Device not found"));
    console.log(chalk.yellow("  - Both devices are not on the same Wi-Fi network"));
    console.log(chalk.yellow("  - USB debugging not authorized"));
    console.log(chalk.yellow("  - TCP/IP mode not enabled"));
    console.log(chalk.yellow("  - Invalid or unreachable IP address"));
    process.exit(1);
  }

  console.log(chalk.green(`✅ Wireless ADB connected: ${finalIp}:5555`));
}

function getDesktopNotesPath() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  const fileName = `notes-${dd}-${mm}-${yyyy}.txt`;

  return `C:\\Users\\ADMIN\\Desktop\\${fileName}`;
}

function appendNoteText(notePath, text, options = {}) {
  const { showSuccess = true } = options;
  const fullPath = path.resolve(notePath);
  const dirPath = path.dirname(fullPath);

  try {
    fs.mkdirSync(dirPath, { recursive: true });
    const existing = fs.existsSync(fullPath)
      ? fs.readFileSync(fullPath, "utf8")
      : "";
    const needsLeadingNewline = existing.length > 0 && !existing.endsWith("\n");
    const content = `${needsLeadingNewline ? "\n" : ""}${text}\n`;
    fs.appendFileSync(fullPath, content, "utf8");
  } catch (error) {
    console.log(chalk.red("❌ Failed to write note file"));
    console.log(chalk.yellow(error.message));
    process.exit(1);
  }

  if (showSuccess) {
    console.log(chalk.green(`✅ Added to note: ${fullPath}`));
  }
}

function openCurrentPathByPlatform() {
  if (process.platform === "darwin") {
    const result = spawnSync("open", ["."], { stdio: "inherit" });
    if (result.error || result.status !== 0) {
      console.log(chalk.red("❌ Failed to open current folder in Finder"));
      if (result.error) {
        console.log(chalk.yellow(result.error.message));
      }
      process.exit(1);
    }
    console.log(chalk.green("✅ Opened current folder in Finder"));
    return;
  }

  if (process.platform === "win32") {
    runWindowsCommand("explorer");
    return;
  }

  const result = spawnSync("xdg-open", ["."], { stdio: "inherit" });
  if (result.error || result.status !== 0) {
    console.log(chalk.red("❌ Failed to open current folder"));
    if (result.error) {
      console.log(chalk.yellow(result.error.message));
    }
    process.exit(1);
  }
  console.log(chalk.green("✅ Opened current folder"));
}

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
    const appData =
      process.env.APPDATA || path.join(homeDir, "AppData", "Roaming");
    return path.join(appData, "Code", "User", "globalStorage", "storage.json");
  }

  if (process.platform === "linux") {
    return path.join(
      homeDir,
      ".config",
      "Code",
      "User",
      "globalStorage",
      "storage.json",
    );
  }

  return "";
}

function parseFileUriToPath(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  if (!value.startsWith("file://")) {
    return path.resolve(value);
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "file:") {
      return "";
    }

    let parsedPath = decodeURIComponent(parsed.pathname || "");
    if (process.platform === "win32") {
      if (parsedPath.startsWith("/")) {
        parsedPath = parsedPath.slice(1);
      }
      parsedPath = parsedPath.replace(/\//g, "\\");
    }

    return parsedPath || "";
  } catch (error) {
    return "";
  }
}

function resolveLastVsCodeProjectPath() {
  const storagePath = getVsCodeStoragePath();
  if (!storagePath) {
    console.log(
      chalk.red("❌ Unsupported platform for reading VS Code recent projects"),
    );
    process.exit(1);
  }

  if (!fs.existsSync(storagePath)) {
    console.log(chalk.red("❌ VS Code storage file not found"));
    console.log(chalk.yellow(`Expected path: ${storagePath}`));
    console.log(
      chalk.yellow("Open VS Code at least once, then run: qme recent"),
    );
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

  const lastWindow =
    storageData &&
      storageData.windowsState &&
      storageData.windowsState.lastActiveWindow
      ? storageData.windowsState.lastActiveWindow
      : null;

  const rawTarget =
    lastWindow && (lastWindow.folder || lastWindow.workspace)
      ? lastWindow.folder || lastWindow.workspace
      : "";

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
      ? spawnSync("cmd", ["/d", "/s", "/c", "code", ...codeArgs], {
        stdio: "inherit",
      })
      : spawnSync("code", codeArgs, {
        stdio: "inherit",
      });

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
      chalk.yellow(
        "Install the `code` command in PATH or verify the app is installed.",
      ),
    );
    process.exit(1);
  }

  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || "";
    const programFiles = process.env.ProgramFiles || "C:\\Program Files";
    const programFilesX86 =
      process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";

    const candidates = [
      localAppData
        ? `${localAppData}\\Programs\\Microsoft VS Code\\Code.exe`
        : "",
      `${programFiles}\\Microsoft VS Code\\Code.exe`,
      `${programFilesX86}\\Microsoft VS Code\\Code.exe`,
    ].filter(Boolean);

    for (const exePath of candidates) {
      if (!fs.existsSync(exePath)) {
        continue;
      }

      const result = spawnSync(
        "cmd",
        [
          "/d",
          "/s",
          "/c",
          `start "" "${exePath}" ${options.newWindow ? "-n" : "-r"} "${targetPath}"`,
        ],
        {
          stdio: "inherit",
        },
      );

      if (!result.error && result.status === 0) {
        console.log(
          chalk.green(`✅ Opened ${label} in VS Code: ${targetPath}`),
        );
        return;
      }
    }

    console.log(chalk.red("❌ Failed to open VS Code"));
    console.log(
      chalk.yellow("Install Visual Studio Code or add `code` to PATH."),
    );
    process.exit(1);
  }

  console.log(chalk.red("❌ Failed to open VS Code"));
  console.log(
    chalk.yellow("Install VS Code and ensure `code` is available in PATH."),
  );
  process.exit(1);
}


const RESERVED_ALIAS_NAMES = new Set([
  "help",
  "debug",
  "alias",
  "git",
  "gsync",
  "config",
  "timer",
  "npm",
  "npx",
  "n",
  "pa",
  "init",
  "add",
  "win",
  "w",
  "wintask",
  "taskm",
  "wl",
  ".",
  "recent",
  "path",
  "postman",
  "chrome",
  "gchat",
  "hub",
  "mail",
  "sprint-review",
  "sprint-plan",
  "mysql",
  "adb",
  "notepad",
  "note",
  "notes",
  "quit",
  "xstart",
  "xstop",
  "xswitch",
  "xini",
  "xproj",
  "xampp",
  "--help",
  "-h",
  "--version",
  "-v",
]);

function formatAliasTokens(tokens) {
  return tokens
    .map((t) => {
      const token = String(t || "");
      return /\s/.test(token) ? JSON.stringify(token) : token;
    })
    .join(" ")
    .trim();
}
function isAliasSeparator(token) {
  const value = String(token || "").trim();
  // Accept various dash characters: -, ‐, ‑, ‒, –, —, ―, −
  return /^[\-\u2010\u2011\u2012\u2013\u2014\u2015\u2212]{2,}$/.test(value);
}

function looksLikeUrl(value) {
  return typeof value === "string" && /^(https?:\/\/|file:\/\/|www\.)/i.test(value);
}

function getOptionValueFromArgs(args, names) {
  for (let i = 0; i < args.length; i += 1) {
    if (!names.includes(args[i])) {
      continue;
    }
    const value = args[i + 1];
    if (typeof value === "string" && value.length > 0 && !String(value).startsWith("-")) {
      return value;
    }
  }
  return "";
}

function expandAliases(inputArgs) {
  let args = Array.isArray(inputArgs) ? [...inputArgs] : [];
  if (!args.length) {
    return args;
  }

  let aliases = {};
  try {
    aliases = getAliases();
  } catch {
    aliases = {};
  }

  const seen = new Set();
  for (let depth = 0; depth < 5; depth += 1) {
    const name = args[0];
    if (!name || RESERVED_ALIAS_NAMES.has(name) || seen.has(name)) {
      break;
    }

    const replacement = aliases[name];
    if (!Array.isArray(replacement) || replacement.length === 0) {
      break;
    }

    seen.add(name);
    args = [...replacement, ...args.slice(1)];
  }

  return args;
}

function levenshteinDistance(a, b) {
  const left = String(a || "").toLowerCase();
  const right = String(b || "").toLowerCase();

  if (left === right) {
    return 0;
  }
  if (!left.length) {
    return right.length;
  }
  if (!right.length) {
    return left.length;
  }

  let prev = Array.from({ length: right.length + 1 }, (_, i) => i);

  for (let i = 1; i <= left.length; i += 1) {
    const curr = [i];

    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
    }

    prev = curr;
  }

  return prev[right.length];
}

function getCommandSuggestions(input, candidates, limit = 5) {
  const value = String(input || "").trim().toLowerCase();
  if (!value) {
    return [];
  }

  return candidates
    .map((candidate) => ({
      candidate,
      score: levenshteinDistance(value, candidate),
    }))
    .filter(({ score }) => score <= Math.max(2, Math.ceil(value.length / 3)))
    .sort((a, b) => a.score - b.score || a.candidate.localeCompare(b.candidate))
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

function printSuggestions(input, candidates, options = {}) {
  const { label = "command", prefix = "" } = options;
  const suggestions = getCommandSuggestions(input, candidates);

  if (!suggestions.length) {
    return false;
  }

  console.log(
    chalk.yellow(`Did you mean ${label}${suggestions.length > 1 ? "s" : ""}?`),
  );
  for (const suggestion of suggestions) {
    console.log(chalk.gray(`  ${prefix}${suggestion}`));
  }

  return true;
}

function getTopLevelCommands() {
  return [
    "help",
    "alias",
    "git",
    "gsync",
    "config",
    "update",
    "proj",
    "open",
    "ip",
    "pem",
    "npm",
    "npx",
    "n",
    "timer",
    "pa",
    "mysql",
    "flutter",
    "adb",
    "run",
    "init",
    "win",
    "w",
    "wintask",
    "taskm",
    "wl",
    ".",
    "recent",
    "path",
    "postman",
    "chrome",
    "gchat",
    "hub",
    "mail",
    "sprint",
    "sprint-review",
    "sprint-plan",
    "notepad",
    "note",
    "notes",
    "quit",
    "xstart",
    "xstop",
    "xswitch",
    "xini",
    "xproj",
    "xampp",
  ];
}

function getAliasSubcommands() {
  return ["list", "ls", "add", "remove", "rm", "del"];
}

function getFlutterSubcommands() {
  return ["run", "debug", "release", "devices", "clean", "build"];
}

function getAdbSubcommands() {
  return ["devices", "connect", "disconnect", "wifi", "setup"];
}

function getGitSubcommands() {
  return ["sync", "reset", "open", "-o", "users", "user", "remove", "ssh-key", "init", "repo"];
}

async function main() {
  const rawArgs = process.argv.slice(2);
  let args = [...rawArgs];
  args = expandAliases(args);

  if (
    args.length > 0 &&
    args[0] !== "help" &&
    !args.includes("--help") &&
    !args.includes("-h") &&
    args[0] !== "--version" &&
    args[0] !== "-v" &&
    args[0] !== "update"
  ) {
    try {
      await autoCheckUpdateOnStartup();
    } catch (e) {
      // Fail silently
    }
  }
  if (rawArgs[0] === "debug" && rawArgs[1] === "argv") {
    console.log(chalk.blueBright("Raw argv:"));
    console.log(JSON.stringify(rawArgs, null, 2));
    console.log();
    console.log(chalk.blueBright("Expanded argv:"));
    console.log(JSON.stringify(args, null, 2));
    return;
  }
  if (
    args.length === 0 ||
    args[0] === "help" ||
    args.includes("--help") ||
    args.includes("-h")
  ) {
    printHelp();
    return;
  }

  if (args[0] === "--version" || args[0] === "-v") {
    const version = getCliVersion();
    console.log(version || "");
    return;
  }

  if (args[0] === "alias") {
    const sub = args[1] || "list";

    if (sub === "list" || sub === "ls") {
      const aliases = getAliases();
      const names = Object.keys(aliases).sort((a, b) => a.localeCompare(b));

      if (names.length === 0) {
        console.log(chalk.yellow("ℹ️ No aliases configured"));
        console.log(chalk.gray(`Config: ${getConfigPath()}`));
        return;
      }

      console.log(chalk.blueBright("Aliases:"));
      for (const name of names) {
        console.log(
          chalk.green(`  ${name}`),
          chalk.gray("->"),
          chalk.cyan(formatAliasTokens(aliases[name])),
        );
      }
      console.log();
      console.log(chalk.gray(`Config: ${getConfigPath()}`));
      return;
    }
    if (sub === "add") {
      const name = args[2];
      const sepIndex = args.findIndex(isAliasSeparator);
      const tokens = sepIndex >= 0 ? args.slice(sepIndex + 1) : [];
      const valueArg = getOptionValueFromArgs(args, ["--value", "-v"]);
      const cmdArg = getOptionValueFromArgs(args, ["--cmd", "--command", "-c"]);
      const inlineValue = args[3];
      const urlShortcut = !sepIndex && looksLikeUrl(inlineValue);
      const urlAliasTarget = valueArg || (urlShortcut ? inlineValue : "");
      const shortcutTokens = urlAliasTarget ? ["open", urlAliasTarget] : [];
      const directCmdTokens = cmdArg ? cmdArg.trim().split(/\s+/).filter(Boolean) : [];
      const explicitTokens = sepIndex >= 0 ? tokens : directCmdTokens;
      const shouldUseUrlShortcut = Boolean(urlAliasTarget);

      if (!name || (!shouldUseUrlShortcut && sepIndex < 0 && directCmdTokens.length === 0 && tokens.length === 0)) {
        console.log(chalk.red("❌ Usage: qme alias add <name> -- <command...>"));
        console.log(chalk.gray("   or: qme alias add <name> --value <url>"));
        console.log(
          chalk.gray(
            "Tip: if you're running qme via npm scripts, you may need: npm run <script> -- --",
          ),
        );
        process.exit(1);
      }

      if (RESERVED_ALIAS_NAMES.has(name)) {
        console.log(chalk.red(`❌ Cannot use reserved alias name: ${name}`));
        process.exit(1);
      }

      const finalTokens = shouldUseUrlShortcut ? shortcutTokens : explicitTokens;
      const ok = addOrUpdateAlias(name, finalTokens);
      if (!ok) {
        console.log(chalk.red("❌ Invalid alias name or command"));
        console.log(
          chalk.yellow("Alias name must match: [a-zA-Z0-9][a-zA-Z0-9:_-]*"),
        );
        process.exit(1);
      }

      console.log(chalk.green(`✅ Alias saved: ${name}`));
      console.log(chalk.gray("   ->"), chalk.cyan(formatAliasTokens(finalTokens)));
      if (cmdArg) {
        console.log(chalk.gray("   cmd:"), chalk.cyan(cmdArg));
      }
      if (valueArg || urlShortcut) {
        console.log(chalk.gray(" value:"), chalk.cyan(urlAliasTarget));
      }
      console.log(chalk.gray(`📄 Config updated: ${getConfigPath()}`));
      return;
    }
    if (sub === "remove" || sub === "rm" || sub === "del") {
      const name = args[2];
      if (!name) {
        console.log(chalk.red("❌ Usage: qme alias remove <name>"));
        process.exit(1);
      }

      const ok = removeAlias(name);
      if (!ok) {
        console.log(chalk.yellow(`ℹ️ Alias not found: ${name}`));
        process.exit(1);
      }

      console.log(chalk.green(`✅ Alias removed: ${name}`));
      console.log(chalk.gray(`📄 Config updated: ${getConfigPath()}`));
      return;
    }

    console.log(chalk.red("❌ Unknown alias subcommand"));
    console.log(chalk.yellow("Usage: qme alias [list|add|remove]"));
    printSuggestions(sub, getAliasSubcommands(), {
      label: "alias subcommand",
      prefix: "qme alias ",
    });
    process.exit(1);
  }


  if (args[0] === "open") {
    const url = args[1];
    if (!url) {
      console.log(chalk.red("❌ Usage: qme open <url>"));
      process.exit(1);
    }
    runOpen(url);
    return;
  }
  if (args[0] === "ip") {
    const ipAddress = getCurrentIpAddress();
    if (ipAddress) {
      console.log(ipAddress);
      return;
    }
    process.exit(1);
  }
  if (args[0] === "pem") {
    if (process.platform !== "win32") {
      console.log(chalk.red("❌ This command is only available on Windows"));
      process.exit(1);
    }

    let rawTarget = getOptionValue(args, ["--file", "-f"]);
    if (!rawTarget && args[1] && !String(args[1]).startsWith("-")) {
      rawTarget = args[1];
    }

    if (!rawTarget) {
      rawTarget = await askQuestion(chalk.magenta("🔑 Enter PEM file path: "));
    }

    const resolvedPath = parseFileUriToPath(rawTarget);
    if (!resolvedPath) {
      console.log(chalk.red("❌ Invalid PEM file path"));
      console.log(chalk.yellow('Usage: qme pem -f "C:\\path\\to\\file.pem"'));
      process.exit(1);
    }

    fixPemPermissions(resolvedPath);
    return;
  }

  if (args[0] === "npm" || args[0] === "npx" || args[0] === "n") {
    const tool = args[0] === "n" ? "npm" : args[0];
    runNodeToolCommand(tool, args.slice(1));
    return;
  }

  if (args[0] === "timer") {
    const rest = args.slice(1);
    const popup = rest.includes("--popup") || rest.includes("-p");
    const cleaned = rest.filter((a) => a !== "--popup" && a !== "-p");
    const minutes = Number(cleaned[0]);
    const label = cleaned.slice(1).join(" ").trim();

    if (!Number.isFinite(minutes) || minutes <= 0) {
      console.log(chalk.red("❌ Minutes must be a positive number"));
      console.log(chalk.yellow("Usage: qme timer <min> <label> [--popup|-p]"));
      process.exit(1);
    }

    try {
      await runTimer({ minutes, label, popup });
      return;
    } catch (err) {
      console.log(chalk.red("❌ Timer failed"));
      console.log(
        chalk.yellow(err && err.message ? String(err.message) : String(err)),
      );
      process.exit(1);
    }
  }

  if (args[0] === "gsync") {
    await runGitSync();
    return;
  }

  if (args[0] === "git" && args[1] === "sync") {
    await runGitSync();
    return;
  }

  if (args[0] === "git" && args[1] === "reset") {
    await runGitReset();
    return;
  }

  if (args[0] === "git" && (args[1] === "open" || args[1] === "-o")) {
    runGitOpen();
    return;
  }
  // Git users (multiple accounts)
  // New command: `qme git users` (defaults to switch), keeping legacy `qme git user switch` working.
  if (args[0] === "git" && args[1] === "users") {
    if (args[2] === "add") {
      await runGitUserAdd();
      return;
    }

    if (args[2] === "remove") {
      await runGitUserRemove();
      return;
    }

    // Default action: switch
    if (!args[2] || args[2] === "switch") {
      await runGitUserSwitch();
      return;
    }
  }
  if (args[0] === "git" && args[1] === "user" && args[2] === "switch") {
    await runGitUserSwitch();
    return;
  }

  if (args[0] === "git" && args[1] === "user" && args[2] === "add") {
    await runGitUserAdd();
    return;
  }

  if (args[0] === "git" && args[1] === "user" && args[2] === "remove") {
    await runGitUserRemove();
    return;
  }

  if (args[0] === "add" && args[1] === "git" && args[2] === "user") {
    await runGitUserAdd();
    return;
  }

  if (args[0] === "pa") {
    runArtisan(args.slice(1));
    return;
  }

  if (args[0] === "git" && args[1] === "remove") {
    await runGitRemove();
    return;
  }

  if (args[0] === "git" && args[1] === "ssh-key") {
    const homeDir = getOptionValue(args, ["--home", "-H"]);
    let comment = getOptionValue(args, ["--comment", "-c"]);
    let fileTag = getOptionValue(args, ["--tag", "-f"]);

    if (!comment) {
      comment = await askSshEmail(getDefaultSshEmail());
    }

    if (!fileTag) {
      fileTag = await askSshTag();
    }

    generateGitSshKey({
      homeDir,
      comment,
      fileTag,
    });
    return;
  }

  if (args[0] === "mysql") {
    if (args[1] === "permission" || args[1] === "permissions") {
      runMysqlPermission();
      return;
    }

    await runMysqlMenu(args);
    return;
  }

  if (args[0] === "flutter") {
    const subcommand = args[1];

    if (!subcommand) {
      await runFlutterMenu();
      return;
    }

    if (subcommand === "run") {
      runFlutterCommand(["run", ...args.slice(2)]);
      return;
    }

    if (subcommand === "debug") {
      runFlutterCommand(["run", "--debug", ...args.slice(2)]);
      return;
    }

    if (subcommand === "release") {
      runFlutterCommand(["run", "--release", ...args.slice(2)]);
      return;
    }

    if (subcommand === "devices") {
      runFlutterCommand(["devices", ...args.slice(2)]);
      return;
    }

    if (subcommand === "clean") {
      runFlutterCommand(["clean", ...args.slice(2)]);
      return;
    }

    if (subcommand === "build") {
      const target = String(args[2] || "apk").toLowerCase();
      const buildMap = {
        apk: ["build", "apk"],
        appbundle: ["build", "appbundle"],
        web: ["build", "web"],
        windows: ["build", "windows"],
        macos: ["build", "macos"],
        linux: ["build", "linux"],
        ios: ["build", "ios"],
      };

      if (!buildMap[target]) {
        console.log(chalk.red("❌ Unknown Flutter build target"));
        console.log(chalk.yellow("Usage: qme flutter build [apk|appbundle|web|windows|macos|linux|ios]"));
        process.exit(1);
      }

      runFlutterCommand(buildMap[target].concat(args.slice(3)));
      return;
    }

    console.log(chalk.red("❌ Unknown Flutter subcommand"));
    console.log(chalk.yellow("Usage: qme flutter [run|debug|release|devices|clean|build]"));
    printSuggestions(subcommand, getFlutterSubcommands(), {
      label: "Flutter subcommand",
      prefix: "qme flutter ",
    });
    process.exit(1);
  }

  if (args[0] === "adb") {
    const subcommand = args[1];

    if (!subcommand) {
      printAdbMenu();
      const choice = (await askQuestion(chalk.yellow("👉 Choose an option (1/2/3) [default: abort]: "))).trim();

      if (choice === "1") {
        runAdbDevices();
        return;
      }

      if (choice === "2") {
        await runAdbConnect();
        return;
      }

      if (choice === "3") {
        await runAdbDisconnect();
        return;
      }

      if (!choice) {
        console.log(chalk.yellow("ℹ️ ADB menu cancelled"));
        return;
      }

      console.log(chalk.red("❌ Invalid selection"));
      return;
    }

    if (subcommand === "devices") {
      runAdbDevices();
      return;
    }

    if (subcommand === "connect") {
      await runAdbConnect(args[2]);
      return;
    }

    if (subcommand === "disconnect") {
      await runAdbDisconnect(args[2]);
      return;
    }

    if (subcommand === "wifi" || subcommand === "setup") {
      await runAdbWifiConnect();
      return;
    }

    printAdbMenu();
    printSuggestions(subcommand, getAdbSubcommands(), {
      label: "ADB subcommand",
      prefix: "qme adb ",
    });
    return;
  }

  if (args[0] === "config" && !args[1]) {
    const configPath = ensureConfigFile();
    tryOpenInVsCode(configPath, "qme config file");
    return;
  }

  if (args[0] === "config" && args[1] === "branch") {
    const branch = args[2];

    if (!branch) {
      console.log(chalk.red("❌ Branch name required"));
      console.log(chalk.yellow("Usage: qme config branch <branch-name>"));
      process.exit(1);
    }

    const repoUrl = getProjectRepoUrl();
    if (!repoUrl) {
      console.log(chalk.red("❌ Not a git repository"));
      process.exit(1);
    }

    setRemoteBranchForRepo(repoUrl, branch);
    console.log(
      chalk.green("✅ Remote branch for this project is now set to:"),
      chalk.cyan(branch),
    );
    return;
  }

  if (args[0] === "run") {
    await runWorkspace();
    return;
  }

  if (args[0] === "proj") {
    runProjectList();
    return;
  }

  if (
    args[0] === "git" &&
    args[1] === "repo" &&
    ((args[2] === "project" && args[3] === "id") ||
      args[2] === "project-id" ||
      args[2] === "project_id")
  ) {
    const rawProjectId = args[2] === "project" ? args[4] : args[3];
    const projectId = Number(rawProjectId);

    if (!rawProjectId || !Number.isInteger(projectId) || projectId <= 0) {
      console.log(chalk.red("❌ Valid numeric project ID required"));
      console.log(chalk.yellow("Usage: qme git repo project id <project-id>"));
      console.log(chalk.yellow("Alias: qme git repo project-id <project-id>"));
      process.exit(1);
    }

    const repoUrl = getProjectRepoUrl();
    if (!repoUrl) {
      console.log(chalk.red("❌ Not a git repository"));
      process.exit(1);
    }

    setProjectIdForRepo(repoUrl, projectId);
    console.log(
      chalk.green("✅ Project ID for this repository is now set to:"),
      chalk.cyan(String(projectId)),
    );
    return;
  }

  if (args[0] === "config" && args[1] === "export") {
    const outputPath = args[2] || null;
    exportConfig(outputPath);
    return;
  }

  if (
    args[0] === "config" &&
    (args[1] === "auto-update" || args[1] === "update-check")
  ) {
    const option = String(args[2] || "show").toLowerCase();

    if (option === "show" || option === "--show" || option === "-s") {
      console.log(
        getUpdateCheckSetting()
          ? chalk.green("✅ Automatic updates are enabled")
          : chalk.yellow("ℹ️ Automatic updates are disabled"),
      );
      console.log(chalk.gray(`Config: ${getConfigPath()}`));
      return;
    }

    if (["enable", "on", "true"].includes(option)) {
      setUpdateCheckSetting(true);
      console.log(chalk.green("✅ Automatic updates enabled"));
      console.log(chalk.gray(`Config: ${getConfigPath()}`));
      return;
    }

    if (["disable", "off", "false"].includes(option)) {
      setUpdateCheckSetting(false);
      console.log(chalk.yellow("✅ Automatic updates disabled"));
      console.log(chalk.gray(`Config: ${getConfigPath()}`));
      return;
    }

    console.log(chalk.red("❌ Use enable, disable, or --show"));
    console.log(chalk.yellow("Usage: qme config auto-update [enable|disable|--show]"));
    process.exit(1);
  }

  if (args[0] === "config" && args[1] === "xampp-path") {
    const option = args[2];

    if (!option || option === "--show" || option === "-s") {
      const current = getXamppPath();
      if (current) {
        console.log(chalk.green(`✅ XAMPP path: ${current}`));
      } else {
        console.log(chalk.yellow("ℹ️ No XAMPP path set in config"));
      }
      return;
    }

    if (option === "--clear") {
      clearXamppPath();
      return;
    }

    setXamppPath(option);
    return;
  }

  if (args[0] === "config" && args[1] === "xampp-v") {
    const option = args[2];

    if (!option || option === "--show" || option === "-s") {
      const current = getXamppCurrentVersion();
      if (current) {
        console.log(chalk.green(`✅ XAMPP current version: ${current}`));
      } else {
        console.log(chalk.yellow("ℹ️ No XAMPP current version set in config"));
      }
      return;
    }

    if (option === "--clear") {
      clearXamppCurrentVersion();
      return;
    }

    setXamppCurrentVersion(option);
    return;
  }

  if (args[0] === "update") {
    await runUpdateFlow({ force: true });
    return;
  }

  if (args[0] === "xampp" && args[1] === "switch") {
    await runXamppSwitch(args[2]);
    return;
  }

  if (args[0] === "git" && args[1] === "init") {
    const branch = getOptionValue(args, ["--branch", "-b"]);
    await initializeRepo({ branch, fullGitInit: true });
    return;
  }

  if (args[0] === "init") {
    const branch = getOptionValue(args, ["--branch", "-b"]);
    await initializeRepo({ branch });
    return;
  }

  if (args[0] === "win" || args[0] === "w") {
    runWindowsCommand(args[1], args.slice(2));
    return;
  }

  if (args[0] === "wintask") {
    runWindowsCommand("taskmgr");
    return;
  }

  if (args[0] === "taskm") {
    runWindowsCommand("taskmgr");
    return;
  }

  if (args[0] === "wl") {
    runWindowsCommand("lock");
    return;
  }

  if (args[0] === ".") {
    openCurrentPathByPlatform();
    return;
  }

  if (args[0] === "recent") {
    const recentPath = resolveLastVsCodeProjectPath();
    tryOpenInVsCode(recentPath);
    return;
  }

  if (args[0] === "xini") {
    const phpIniPath = resolveXamppPhpIniPath();
    tryOpenInVsCode(phpIniPath, "XAMPP php.ini");
    return;
  }

  if (args[0] === "xproj") {
    await runXamppProjects();
    return;
  }

  if (args[0] === "path") {
    runWindowsCommand("explorer");
    return;
  }

  if (args[0] === "postman") {
    runWindowsCommand("postman", [], { fireAndForget: true });
    return;
  }

  if (args[0] === "chrome") {
    runWindowsCommand("chrome");
    return;
  }

  if (args[0] === "gchat") {
    runGoogleChat();
    return;
  }

  if (args[0] === "hub") {
    runHubstaff(args[1] || "start");
    return;
  }

  if (args[0] === "mail") {
    runMail();
    return;
  }

  if (args[0] === "sprint" || args[0] === "sprint-review") {
    runSprintReviewMail(args.slice(1));
    return;
  }

  if (args[0] === "sprint-plan") {
    runSprintPlanMail(args.slice(1));
    return;
  }

  if (args[0] === "notepad") {
    runNotepad(args[1]);
    return;
  }

  if (args[0] === "note" || args[0] === "notes") {
    const noteText = args.slice(1).join(" ").trim();
    const notePath = getDesktopNotesPath();

    if (noteText) {
      appendNoteText(notePath, noteText, { showSuccess: false });
      return;
    }

    runNotepad(notePath);
    return;
  }

  if (args[0] === "quit") {
    if (process.platform !== "win32") {
      console.log(chalk.red("❌ This command is only available on Windows"));
      process.exit(1);
    }

    try {
      // Stop XAMPP before shutting down the machine.
      await runXamppStop({ strict: true, killDevProcesses: false });
    } catch (error) {
      process.exit(1);
    }

    runWindowsCommand("quit");
    return;
  }

  if (args[0] === "xstart") {
    runXamppStartByPlatform();
    return;
  }

  if (args[0] === "xstop") {
    await runXamppStopByPlatform();
    return;
  }

  if (args[0] === "xswitch") {
    await runXamppSwitch(args[1]);
    return;
  }

  if (args[0] === "xampp" && args[1] === "start") {
    runXamppStartByPlatform();
    return;
  }

  if (args[0] === "xampp" && args[1] === "stop") {
    await runXamppStopByPlatform();
    return;
  }

  // console.log(chalk.blue("Usage:"));
  // console.log("  qme pa serve");
  // console.log(chalk.green("  qme init [--branch <branch-name>]  # Bootstrap .gitignore, hooks, and branch config"));
  // console.log(chalk.green("  qme git sync           # Run git commit/pull/push flow"));
  // console.log(chalk.green("  qme git ssh-key [--home <path>] [-c <email>] [-f <tag>]"));
  // console.log(chalk.green("  qme config branch <branch-name>  # Set remote branch for pull"));
  // console.log(chalk.green("  qme config export [output-path]  # Export ~/.mycli.json backup"));
  // console.log(chalk.green("  qme config xampp-path [path|--show|--clear]"));
  // console.log(chalk.green("  qme config xampp-v [version|--show|--clear]"));
  // console.log(chalk.green("  qme wintask  # Open Task Manager"));
  // console.log(chalk.green("  qme taskm    # Open Task Manager (shortcut)"));
  // console.log(chalk.green("  qme wl       # Lock current Windows session"));
  // console.log(chalk.green("  qme path     # Open current folder in File Explorer"));
  // console.log(chalk.green("  qme postman  # Open Postman"));
  // console.log(chalk.green("  qme chrome   # Open Google Chrome"));
  // console.log(chalk.green("  qme gchat   # Open Google Chat app"));
  // console.log(chalk.green("  qme hub [start|stop]  # Start or stop Hubstaff app"));
  // console.log(chalk.green("  qme mail    # Open Thunderbird app"));
  // console.log(chalk.green("  qme n <args...>        # Alias for npm"));
  // console.log(chalk.green("  qme npm <args...>      # Run npm command"));
  // console.log(chalk.green("  qme npx <args...>      # Run npx command"));
  // console.log(chalk.green("  qme notepad [file]  # Open Notepad (optional file)"));
  // console.log(chalk.green("  qme note [text]     # Open note file, or append text and exit"));
  // console.log(chalk.green("  qme quit            # Close apps and shut down Windows"));
  // console.log(chalk.green("  qme win settings"));
  // console.log(chalk.green("  qme w <command...>    # Alias for win"));
  // console.log(chalk.green("  qme win <command...>  # Run any Windows cmd command"));
  // console.log(chalk.green("  qme xampp start|stop  # Start/stop XAMPP on Windows/macOS (start waits for phpMyAdmin readiness)"));
  // console.log(chalk.green("  qme xstart|xstop|xswitch <version>  # Shortcut for xampp start/stop/switch"));
  // console.log(chalk.green("  qme xini  # Open current XAMPP php.ini in VS Code"));

  console.log(chalk.red("❌ Unknown command"));
  printSuggestions(args[0], getTopLevelCommands(), {
    label: "command",
    prefix: "qme ",
  });
  printHelp({
    isError: true,
    message: "Use `qme help` to see available commands.",
  });
  process.exit(1);
}

main();
// testingx
// git push --set-upstream origin my-pc



















