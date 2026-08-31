#!/usr/bin/env node

const chalk = require("chalk");
const { execSync, spawn, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  runGitSync,
  runGitReset,
  runGitOpen,
  runGitRemove,
  runGitUserSwitch,
  runGitUserAdd,
  runGitUserRemove,
  selectGitUserForSsh,
} = require("./src/git.js");
const { generateGitSshKey, updateSshConfig } = require("./src/ssh.js");
const { askQuestion, askSshTag } = require("./src/prompts.js");
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
  getSprintMailRecipients,
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
  runThunderbirdMail,
  runXamppStart,
  runXamppStop,
} = require("./src/windows");
const { runMacXamppStart, runMacXamppStop } = require("./src/mac");
const { runTimer } = require("./src/timer");
const { runOpen } = require("./src/open");
const { fixPemPermissions } = require("./src/pem");
const { runSync } = require("./src/process");
const { getPhpVersion } = require("./src/services/php");
const { waitForTcpPort } = require("./src/services/network");
const { isExecutableAvailable } = require("./src/services/validation");
const { createVsCodeService } = require("./src/services/vscode");
const { createWindowsProjectPicker } = require("./src/services/windows-project-picker");
const {
  getProjectTypeLabel,
  getLaravelVersion,
  getNodePackageManager,
  inspectRunEnvironment,
} = require("./src/services/project");
const {
  createXamppPlatformOperations,
  createXamppPathResolver,
  createXamppProjectBrowser,
  createXamppSwitch,
  getXamppSwitchVersionCandidate,
  isXamppRunning,
  waitForReady: waitForXamppReady,
  waitForStopped: waitForXamppStopped,
} = require("./src/services/xampp");
const { getXamppPathCandidates, resolveXamppHtdocsPath, resolveXamppPhpIniPath } =
  createXamppPathResolver({ getXamppPath, chalk });
const {
  parseFileUriToPath,
  resolveLastVsCodeProjectPath,
  getOpenVsCodePaths,
  tryOpenInVsCode,
} = createVsCodeService({
  spawnSync,
  chalk,
});
const { openProjectPicker } = createWindowsProjectPicker();
const runXamppProjects = createXamppProjectBrowser({
  resolveXamppHtdocsPath,
  askQuestion,
  tryOpenInVsCode,
  chalk,
});
const { runXamppStartByPlatform, runXamppStopByPlatform } = createXamppPlatformOperations({
  runMacXamppStart,
  runMacXamppStop,
  runWindowsXamppStart: runXamppStart,
  runWindowsXamppStop: runXamppStop,
  chalk,
});
const runXamppSwitch = createXamppSwitch({
  askQuestion,
  chalk,
  getXamppPath,
  getXamppCurrentVersion,
  setXamppPath,
  setXamppCurrentVersion,
  runXamppStart,
  runXamppStopByPlatform,
  waitForXamppStopped,
  execSync,
  spawnSync,
});
const { runWorkspace: runWorkspaceCommand } = require("./src/commands/run");
const { runOpenCommand } = require("./src/commands/open");
const { runIpCommand } = require("./src/commands/ip");
const { runPemCommand } = require("./src/commands/pem");
const { runTimerCommand } = require("./src/commands/timer");
const { runNodeToolCommand: runNodeToolCommandHandler } = require("./src/commands/node-tools");
const { runGitCommand } = require("./src/commands/git");
const { runFlutterCommand: runFlutterCommandHandler } = require("./src/commands/flutter");
const { runAdbCommand: runAdbCommandHandler } = require("./src/commands/adb");
const { runMysqlCommand: runMysqlCommandHandler } = require("./src/commands/mysql");
const { runConfigCommand: runConfigCommandHandler } = require("./src/commands/config");
const { runWindowsAliasCommand } = require("./src/commands/windows");
const { runDesktopCommand } = require("./src/commands/desktop");
const { runXamppCommand } = require("./src/commands/xampp");
const { runLifecycleCommand } = require("./src/commands/lifecycle");
const { runNavigationCommand } = require("./src/commands/navigation");
const { runArtisanCommand } = require("./src/commands/artisan");
const { dispatchCommand } = require("./src/commands/registry");
const { isCommandEnabled } = require("./src/commands/definitions");
const { runPilotCommand } = require("./src/commands/pilot");
const { runProjectListCommand } = require("./src/commands/project-list");
const { runDokrCommand } = require("./src/commands/dokr");
const { createAdbService } = require("./src/services/adb");
const { createFlutterService } = require("./src/services/flutter");
const { createNotesService } = require("./src/services/notes");
const { getAdbDeviceList, resolveAdbExecutable, runAdbCommand } = createAdbService({
  spawnSync,
  chalk,
});
const { runFlutterCommand, runFlutterMenu } = createFlutterService({
  spawnSync,
  chalk,
  askQuestion,
});
const { appendNoteText, getDesktopNotesPath } = createNotesService({ chalk });
const {
  createMysqlHelpers,
  createMysqlOperations,
  runMysqlPermission,
} = require("./src/services/mysql");
const mysqlHelpers = createMysqlHelpers(getXamppPathCandidates);
const { resolveMysqlExecutable, resolveMysqldumpExecutable } = mysqlHelpers;
const {
  createAction: MYSQL_CREATE_DATABASE_ACTION,
  getMysqlDatabases,
  askMysqlDatabase,
  askMysqlAction,
  resolveSqlFilePath,
  createMysqlDatabase,
  deleteMysqlDatabase,
  importMysqlDatabase: importMysqlDatabaseService,
  exportMysqlDatabase: exportMysqlDatabaseService,
  runMysqlShell: runMysqlShellService,
  dropMysqlTables: dropMysqlTablesService,
  isProtectedDatabase,
} = createMysqlOperations(mysqlHelpers, { askQuestion, parseFileUriPath: parseFileUriToPath });
const { handleCliError } = require("./src/errors");
const { configureOutput } = require("./src/output");
const { loadPluginCommands } = require("./src/plugins");

function getCliVersion() {
  try {
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

  console.log(chalk.green("  qme git sync"));
  console.log(chalk.gray("    Interactive Git workflow for pull, push, branches, and resets"));
  console.log(chalk.green("  qme git users"));
  console.log(chalk.gray("    Switch, add, or remove saved Git user identities"));
  console.log(chalk.green("  qme config"));
  console.log(chalk.gray("    Open, export, or update QME configuration"));
  console.log();

  console.log(chalk.blueBright("Help:"));
  console.log(chalk.green("  qme help"));
  console.log(chalk.green("  qme --help   qme -h"));
  console.log(chalk.green("  qme --version   qme -v"));
}

function formatMonthName(date = new Date()) {
  return date.toLocaleString("en-US", { month: "long" });
}

function encodeUrlValue(value) {
  return encodeURIComponent(String(value || ""));
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

function runCommandInDir(command, args, cwd) {
  runSync(command, args, {
    cwd,
    stdio: "inherit",
  });

  return true;
}

async function prepareXamppForLaravelProject(selectedProject) {
  const selectedPhpVersion = getXamppSwitchVersionCandidate(selectedProject.phpVersion);

  const xamppRunning = await isXamppRunning();
  if (xamppRunning) {
    console.log(chalk.cyan("Stopping XAMPP before switching versions..."));
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
  const ready = await waitForXamppReady(waitForTcpPort);
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

async function runNodeProjectMenu(info, baseDir, projectType) {
  const manager = getNodePackageManager(baseDir);
  if (!info.nodeModules) {
    console.log(chalk.cyan(`Installing dependencies with ${manager}...`));
    runCommandInDir(manager, ["install"], baseDir);
  }

  const scripts = Object.keys(info.pkg?.scripts || {});
  if (!scripts.length) {
    console.log(chalk.yellow("ℹ️ No scripts found in package.json"));
    return;
  }

  console.log();
  console.log(chalk.blueBright("Choose a package script:"));
  scripts.forEach((script, index) => {
    console.log(chalk.green(`  ${index + 1}) ${script}`));
  });

  const answer = (
    await askQuestion(chalk.yellow(`👉 Choose an option (1-${scripts.length}) [Enter to abort]: `))
  ).trim();
  const selectedIndex = Number.parseInt(answer, 10) - 1;
  const selectedScript =
    Number.isInteger(selectedIndex) && selectedIndex >= 0 ? scripts[selectedIndex] : "";
  if (!selectedScript) {
    console.log(chalk.gray("⏹️ Project run aborted"));
    return;
  }

  console.log(chalk.cyan(`Running ${manager} run ${selectedScript}...`));
  setLastRunProject({ path: baseDir, type: projectType });
  runCommandInDir(manager, ["run", selectedScript], baseDir);
}

async function runWorkspace() {
  return runWorkspaceCommand({
    baseDir: process.cwd(),
    inspectRunEnvironment,
    getProjectTypeLabel,
    getPhpVersion,
    getLaravelVersion,
    printRunChecklist,
    waitForTcpPort,
    setLastRunProject,
    runCommandInDir,
    runNodeProjectMenu,
    isExecutableAvailable,
  });
}

function buildSprintDraft({ args = [], title, greeting, intro }) {
  if (process.platform !== "win32") {
    console.log(chalk.red("❌ This command is only available on Windows"));
    process.exit(1);
  }

  const { to: defaultRecipients, cc: defaultCcRecipients } = getSprintMailRecipients();
  const toList = defaultRecipients;
  const to = toList.join(",");
  const cc = defaultCcRecipients.join(",");
  const monthName = formatMonthName();
  const subject = `${title} ( ${monthName} ) for This Week Backend`;
  const body = [
    `<p>${greeting}</p>`,
    `<p>${intro}</p>`,

    `<br>`,
    `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">`,
    `<thead style="background-color: #f2f2f2;"><tr><th align="left">Task</th><th align="left">Status</th></tr></thead>`,
    `<tbody><tr><td>Task 1</td><td>Completed</td></tr></tbody>`,
    `</table>`,
    `<p>Kindly let us know if any additional priorities need to be included.</p>`,
  ].join("");

  return [
    `mailto:${encodeUrlValue(to)}`,
    `?subject=${encodeUrlValue(subject)}`,
    `&body=${encodeUrlValue(body)}`,
    `&cc=${encodeUrlValue(cc)}`,
    "&format=html",
  ].join("");
}

function runSprintReviewMail(args = []) {
  const composeUrl = buildSprintDraft({
    args,
    title: "Sprint Review",
    greeting: "Hi QA,",
    intro: "Please find the sprint update below.",
  });
  runThunderbirdMail(composeUrl);
}

function runSprintPlanMail(args = []) {
  const composeUrl = buildSprintDraft({
    args,
    title: "Sprint Plan",
    greeting: "Hi QA,",
    intro: "Please find the sprint plan below.",
  });
  runThunderbirdMail(composeUrl);
}

function getOptionValue(argv, keys) {
  const index = argv.findIndex((item) => keys.includes(item));
  if (index === -1) return null;

  const value = argv[index + 1];
  return typeof value === "string" && !value.startsWith("-") ? value : null;
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

async function askMysqlDatabaseName(promptText = "🗄️ Enter new database name: ") {
  const databaseName = await askQuestion(chalk.magenta(promptText));
  if (!databaseName) {
    console.log(chalk.yellow("ℹ️ Database create cancelled"));
    process.exit(0);
  }

  return databaseName.trim();
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
    createMysqlDatabase(mysqlPath, args.slice(2).join(" ") || (await askMysqlDatabaseName()));
    return;
  }

  if (databases.length === 0) {
    console.log(chalk.yellow("ℹ️ No MySQL databases found"));
    createMysqlDatabase(mysqlPath, await askMysqlDatabaseName());
    return;
  }

  const databaseName = firstArg && !firstArgIsAction ? firstArg : await askMysqlDatabase(databases);

  if (databaseName === MYSQL_CREATE_DATABASE_ACTION) {
    createMysqlDatabase(mysqlPath, await askMysqlDatabaseName());
    return;
  }

  if (!databases.includes(databaseName)) {
    console.log(chalk.red(`❌ Database not found: ${databaseName}`));
    process.exit(1);
  }

  const action = firstArgIsAction ? firstArg : args[2] || (await askMysqlAction(databaseName));
  const fileArgIndex = firstArgIsAction ? 2 : 3;

  if (action === "import" || action === "inport") {
    if (isProtectedDatabase(databaseName)) {
      console.log(chalk.red(`❌ Refusing to import into protected database: ${databaseName}`));
      process.exit(1);
    }
    const sqlFileInput =
      args.slice(fileArgIndex).join(" ") ||
      (await askQuestion(chalk.magenta("📄 Enter .sql file path: ")));
    if (!sqlFileInput) {
      console.log(chalk.yellow("ℹ️ Import cancelled"));
      process.exit(0);
    }
    importMysqlDatabaseService(mysqlPath, databaseName, resolveSqlFilePath(sqlFileInput));
    return;
  }

  if (action === "export") {
    const defaultExportPath = getMysqlExportDefaultPath(databaseName);
    const outputInput =
      args.slice(fileArgIndex).join(" ") ||
      (await askQuestion(
        chalk.magenta(`💾 Enter export .sql file path [default: ${defaultExportPath}]: `),
      ));
    exportMysqlDatabaseService(
      resolveMysqldumpExecutable(),
      databaseName,
      resolveSqlExportPath(outputInput, databaseName),
    );
    return;
  }

  if (action === "truncate") {
    await dropMysqlTablesService(mysqlPath, databaseName);
    return;
  }

  if (action === "delete" || action === "drop") {
    await deleteMysqlDatabase(mysqlPath, databaseName);
    return;
  }

  if (action === "shell") {
    runMysqlShellService(mysqlPath, databaseName);
    return;
  }

  console.log(chalk.yellow("ℹ️ MySQL action cancelled"));
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

    const portValue = (
      await askQuestion(chalk.magenta("🔌 Enter ADB port [default: 5555]: "))
    ).trim();
    const port = portValue || "5555";

    if (!/^\d+$/.test(port)) {
      console.log(chalk.red("❌ Invalid port"));
      process.exit(1);
    }

    connectTarget = `${ipAddress}:${port}`;
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(connectTarget)) {
    const portValue = (
      await askQuestion(chalk.magenta("🔌 Enter ADB port [default: 5555]: "))
    ).trim();
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
    console.log(
      chalk.yellow(
        String(connectOutput).trim() || "adb connect did not report a successful connection.",
      ),
    );
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
  console.log(
    chalk.gray("Make sure the phone is connected by USB first and USB debugging is authorized."),
  );

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
    console.log(
      chalk.yellow("Connect the device by USB and confirm `adb devices` shows a `device` status."),
    );
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

  const finalIp = (await askQuestion(chalk.magenta("📶 Enter device IP address: "))).trim();

  if (!finalIp) {
    console.log(chalk.red("❌ Invalid or unreachable IP address"));
    console.log(
      chalk.yellow(
        "Run `adb shell ip route` or `adb shell ifconfig` again and try a valid IPv4 address.",
      ),
    );
    process.exit(1);
  }

  console.log(
    chalk.blueBright(
      "Connect the computer and device to the same Wi-Fi network, then disconnect the USB cable when ready.",
    ),
  );
  const connectAnswer = await askQuestion(
    chalk.yellow("👉 Press Enter to continue with wireless connection: "),
  );
  void connectAnswer;

  const connectResult = runAdbCommand(adbPath, ["connect", `${finalIp}:5555`], {
    expectSuccessText: "connected to",
  });

  const connectOutput = `${connectResult.result.stdout || ""}\n${connectResult.result.stderr || ""}`;
  if (!/connected to|already connected to/i.test(connectOutput)) {
    console.log(chalk.red("❌ Wireless connection failed"));
    console.log(
      chalk.yellow(
        String(connectOutput).trim() || "adb connect did not report a successful connection.",
      ),
    );
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
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }

    prev = curr;
  }

  return prev[right.length];
}

function getCommandSuggestions(input, candidates, limit = 5) {
  const value = String(input || "")
    .trim()
    .toLowerCase();
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

  console.log(chalk.yellow(`Did you mean ${label}${suggestions.length > 1 ? "s" : ""}?`));
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
    "dokr",
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
    "sprint-review",
    "sprint-plan",
    "sprint",
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

async function main() {
  const rawArgs = process.argv.slice(2);
  let args = configureOutput([...rawArgs]);
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
    } catch {
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
  if (args.length === 0 || args[0] === "help" || args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  if (args[0] === "--version" || args[0] === "-v") {
    const version = getCliVersion();
    console.log(version || "");
    return;
  }

  if (!isCommandEnabled(args[0])) {
    console.log(chalk.yellow(`The qme ${args[0]} command is not found !`));
    process.exitCode = 1;
    return;
  }

  if (args[0] === "alias") {
    if (!args[1]) {
      while (true) {
        console.log();
        console.log(chalk.blueBright("Alias menu"));
        console.log(chalk.green("  1) Aliases"));
        console.log(chalk.green("  2) Add"));
        console.log(chalk.green("  3) Open"));
        console.log(chalk.green("  4) Remove"));
        console.log(chalk.green("  q) Exit"));

        const choice = (await askQuestion(chalk.yellow("👉 Choose an option: ")))
          .trim()
          .toLowerCase();
        if (!choice || choice === "q" || choice === "quit" || choice === "exit") return;

        if (choice === "1") {
          const aliases = getAliases();
          const names = Object.keys(aliases).sort((a, b) => a.localeCompare(b));
          if (!names.length) {
            console.log(chalk.yellow("ℹ️ No aliases configured"));
          } else {
            console.log(chalk.blueBright("Aliases:"));
            for (const name of names) {
              console.log(
                chalk.green(`  ${name}`),
                chalk.gray("->"),
                chalk.cyan(formatAliasTokens(aliases[name])),
              );
            }
          }
          continue;
        }

        if (choice === "2") {
          const name = (await askQuestion(chalk.yellow("👉 Alias name: "))).trim();
          const target = (await askQuestion(chalk.yellow("👉 Command or URL: "))).trim();
          const tokens = looksLikeUrl(target)
            ? ["open", target]
            : target.split(/\s+/).filter(Boolean);
          if (
            !name ||
            !tokens.length ||
            RESERVED_ALIAS_NAMES.has(name) ||
            !addOrUpdateAlias(name, tokens)
          ) {
            console.log(chalk.red("❌ Invalid alias name or command"));
          } else {
            console.log(chalk.green(`✅ Alias saved: ${name}`));
          }
          continue;
        }

        if (choice === "3") {
          const aliases = getAliases();
          const names = Object.keys(aliases).sort((a, b) => a.localeCompare(b));
          if (!names.length) {
            console.log(chalk.yellow("ℹ️ No aliases configured"));
            continue;
          }

          console.log(chalk.blueBright("Select an alias to open:"));
          names.forEach((name, index) => {
            console.log(chalk.green(`  ${index + 1}) ${name}`));
          });
          const answer = (
            await askQuestion(
              chalk.yellow(`👉 Choose an alias (1-${names.length}) [Enter to cancel]: `),
            )
          ).trim();
          const selectedIndex = Number.parseInt(answer, 10) - 1;
          const name = Number.isInteger(selectedIndex) ? names[selectedIndex] : "";
          const tokens = name ? aliases[name] : [];
          if (!tokens.length) {
            console.log(chalk.gray("⏹️ Alias opening cancelled"));
            continue;
          }

          if (tokens[0] === "open" && tokens[1]) {
            runOpen(tokens[1]);
            console.log(chalk.green(`✅ Opened: ${name}`));
          } else {
            console.log(
              chalk.yellow(`ℹ️ Alias '${name}' is a command: ${formatAliasTokens(tokens)}`),
            );
          }
          continue;
        }

        if (choice === "4") {
          const aliases = getAliases();
          const names = Object.keys(aliases).sort((a, b) => a.localeCompare(b));
          if (!names.length) {
            console.log(chalk.yellow("ℹ️ No aliases configured"));
            continue;
          }

          console.log(chalk.blueBright("Select an alias to remove:"));
          names.forEach((name, index) => {
            console.log(chalk.green(`  ${index + 1}) ${name}`));
          });
          const answer = (
            await askQuestion(
              chalk.yellow(`👉 Choose an alias (1-${names.length}) [Enter to cancel]: `),
            )
          ).trim();
          const selectedIndex = Number.parseInt(answer, 10) - 1;
          const name = Number.isInteger(selectedIndex) ? names[selectedIndex] : "";
          if (!name) {
            console.log(chalk.gray("⏹️ Alias removal cancelled"));
            continue;
          }

          console.log(
            removeAlias(name)
              ? chalk.green(`✅ Alias removed: ${name}`)
              : chalk.yellow(`ℹ️ Alias not found: ${name}`),
          );
          continue;
        }

        console.log(chalk.yellow("⚠️ Choose 1, 2, 3, 4, or q"));
      }
    }

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

      if (
        !name ||
        (!shouldUseUrlShortcut &&
          sepIndex < 0 &&
          directCmdTokens.length === 0 &&
          tokens.length === 0)
      ) {
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
        console.log(chalk.yellow("Alias name must match: [a-zA-Z0-9][a-zA-Z0-9:_-]*"));
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

  if (
    await dispatchCommand(args, {
      run: async () => runWorkspace(),
      pilot: () => runPilotCommand({ inspectRunEnvironment, printRunChecklist }),
      proj: () =>
        runProjectListCommand({
          getSavedProjects,
          formatShortDateOnly,
          askQuestion,
          prepareXamppForLaravelProject,
          tryOpenInVsCode,
          openProjectPicker,
          isWindows: process.platform === "win32",
        }),
      open: (_args) => runOpenCommand(args, runOpen),
      ip: () => runIpCommand(getCurrentIpAddress),
      pa: (_args) => runArtisanCommand(args, runArtisan),
    })
  )
    return;

  if (await dispatchCommand(args, loadPluginCommands())) return;
  if (args[0] === "pem") {
    await runPemCommand({
      args,
      getOptionValue,
      askQuestion,
      parseFileUriToPath,
      fixPemPermissions,
    });
    return;
  }

  if (args[0] === "npm" || args[0] === "npx" || args[0] === "n") {
    runNodeToolCommandHandler(args, (tool, toolArgs) => {
      runSync(tool, toolArgs, { stdio: "inherit" });
    });
    return;
  }

  if (args[0] === "timer") {
    await runTimerCommand(args, runTimer);
    return;
  }

  if (
    args[0] === "gsync" ||
    args[0] === "git" ||
    (args[0] === "add" && args[1] === "git" && args[2] === "user")
  ) {
    const handled = await runGitCommand(args, {
      runGitSync,
      runGitReset,
      runGitOpen,
      runGitRemove,
      runGitUserSwitch,
      runGitUserAdd,
      runGitUserRemove,
      selectGitUserForSsh,
      askQuestion,
      askSshTag,
      generateGitSshKey,
      updateSshConfig,
      getOptionValue,
      getProjectRepoUrl,
      setProjectIdForRepo,
    });
    if (handled) {
      return;
    }
  }

  if (args[0] === "mysql") {
    await runMysqlCommandHandler(args, {
      runMysqlPermission: () => runMysqlPermission(getXamppPath),
      runMysqlMenu,
    });
    return;
  }

  if (args[0] === "config") {
    const handled = await runConfigCommandHandler(args, {
      ensureConfigFile,
      tryOpenInVsCode,
      getConfigPath,
      exportConfig,
      getUpdateCheckSetting,
      setUpdateCheckSetting,
      getXamppPath,
      setXamppPath,
      clearXamppPath,
      getXamppCurrentVersion,
      setXamppCurrentVersion,
      clearXamppCurrentVersion,
      getProjectRepoUrl,
      setRemoteBranchForRepo,
      askQuestion,
      runUpdateFlow,
    });
    if (handled) return;
  }

  if (args[0] === "flutter") {
    await runFlutterCommandHandler(args, {
      runFlutterMenu,
      runFlutterCommand,
      getFlutterSubcommands,
      printSuggestions,
    });
    return;
  }

  if (args[0] === "adb") {
    await runAdbCommandHandler(args, {
      printAdbMenu,
      askQuestion,
      runAdbDevices,
      runAdbConnect,
      runAdbDisconnect,
      runAdbWifiConnect,
      getAdbSubcommands,
      printSuggestions,
    });
    return;
  }

  if (args[0] === "dokr") {
    await runDokrCommand(args, { askQuestion, spawn, spawnSync });
    return;
  }

  if (
    await runLifecycleCommand(args, {
      runUpdateFlow,
      initializeRepo,
      getOptionValue,
      runXamppStop,
      runWindowsCommand,
    })
  )
    return;

  if (runWindowsAliasCommand(args, runWindowsCommand)) return;

  if (
    runNavigationCommand(args, {
      openCurrentPathByPlatform,
      resolveLastVsCodeProjectPath,
      tryOpenInVsCode,
    })
  )
    return;

  if (
    await runDesktopCommand(args, {
      runGoogleChat,
      runHubstaff,
      runMail,
      runSprintReviewMail,
      runSprintPlanMail,
      askQuestion,
      runNotepad,
      getDesktopNotesPath,
      appendNoteText,
    })
  )
    return;

  if (
    await runXamppCommand(args, {
      runXamppStartByPlatform,
      runXamppStopByPlatform,
      runXamppSwitch,
      resolveXamppPhpIniPath,
      tryOpenInVsCode,
      runXamppProjects,
      askQuestion,
      getXamppPath,
      setXamppPath,
      onMysqlReady: () => runMysqlPermission(getXamppPath),
      onBeforeStop: () => {
        const roots = getXamppPathCandidates().map((root) => `${root.toLowerCase()}\\`);
        const paths = getOpenVsCodePaths().filter((targetPath) => {
          const normalized = targetPath.toLowerCase();
          return roots.some((root) => normalized.startsWith(root));
        });

        console.log(chalk.blueBright("VS Code XAMPP paths:"));
        if (paths.length === 0) {
          console.log(chalk.gray("  None found"));
          return;
        }
        paths.forEach((targetPath, index) => {
          console.log(chalk.green(`  ${index + 1}. ${targetPath}`));
        });
      },
    })
  )
    return;

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

main().catch(handleCliError);
// testingx
// git push --set-upstream origin my-pc
