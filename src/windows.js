const { exec, spawn } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");
const chalk = require("chalk");
const { getXamppPath } = require("./config");

function getConfiguredXamppDir() {
  const configPathValue = getXamppPath();
  if (configPathValue) {
    return configPathValue;
  }

  const candidates = ["XAMPP_HOME", "XAMPP_PATH", "XAMPP_DIR"];
  for (const key of candidates) {
    const value = process.env[key];
    if (!value || !value.trim()) {
      continue;
    }

    return value
      .trim()
      .replace(/^"+|"+$/g, "")
      .replace(/[\\\/]+$/, "");
  }

  return "";
}

// eslint-disable-next-line no-unused-vars -- retained for legacy XAMPP launchers
function buildXamppCommand(exeName) {
  const configuredDir = getConfiguredXamppDir();
  const configuredExe = configuredDir ? `${configuredDir}\\${exeName}` : "";
  const defaultExe = `C:\\xampp\\${exeName}`;

  if (configuredExe) {
    return `cmd /c if exist "${configuredExe}" ("${configuredExe}") else if exist "${defaultExe}" ("${defaultExe}") else (${exeName})`;
  }

  return `cmd /c if exist "${defaultExe}" ("${defaultExe}") else (${exeName})`;
}

function resolveXamppExecutable(exeName) {
  const configuredDir = getConfiguredXamppDir();
  const candidates = [];

  if (configuredDir) {
    candidates.push(path.join(configuredDir, exeName));
  }

  candidates.push(path.join("C:\\xampp", exeName));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return "";
}

function buildPostmanCommand() {
  const localAppData = process.env.LOCALAPPDATA || "";
  const programFiles = process.env.ProgramFiles || "";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "";

  const localPostman = localAppData ? `${localAppData}\\Postman\\Postman.exe` : "";
  const programFilesPostman = programFiles ? `${programFiles}\\Postman\\Postman.exe` : "";
  const programFilesX86Postman = programFilesX86 ? `${programFilesX86}\\Postman\\Postman.exe` : "";

  const checks = [localPostman, programFilesPostman, programFilesX86Postman].filter(Boolean);

  if (!checks.length) {
    return 'cmd /c start "" postman';
  }

  const ifChain = checks
    .map((item, idx) => {
      if (idx === 0) {
        return `if exist "${item}" (start "" "${item}")`;
      }
      return `else if exist "${item}" (start "" "${item}")`;
    })
    .join(" ");

  return `cmd /c ${ifChain} else (start "" postman)`;
}

function buildGoogleChatCommand() {
  const appData = process.env.APPDATA || "";
  const programData = process.env.ProgramData || "C:\\ProgramData";
  const candidates = [
    `${appData}\\Microsoft\\Windows\\Start Menu\\Programs\\Chrome Apps\\Google Chat.lnk`,
    `${appData}\\Microsoft\\Windows\\Start Menu\\Programs\\Google Chat.lnk`,
    `${programData}\\Microsoft\\Windows\\Start Menu\\Programs\\Chrome Apps\\Google Chat.lnk`,
    `${programData}\\Microsoft\\Windows\\Start Menu\\Programs\\Google Chat.lnk`,
  ].filter(Boolean);

  if (!candidates.length) {
    return "cmd /c exit /b 1";
  }

  const ifChain = candidates
    .map((item, idx) => {
      if (idx === 0) {
        return `if exist "${item}" (start "" "${item}")`;
      }
      return `else if exist "${item}" (start "" "${item}")`;
    })
    .join(" ");

  return `cmd /c ${ifChain} else (exit /b 1)`;
}

function buildHubstaffCommand() {
  const appData = process.env.APPDATA || "";
  const programData = process.env.ProgramData || "C:\\ProgramData";
  const candidates = [
    `${appData}\\Microsoft\\Windows\\Start Menu\\Programs\\Hubstaff\\Hubstaff.lnk`,
    `${appData}\\Microsoft\\Windows\\Start Menu\\Programs\\Hubstaff.lnk`,
    `${programData}\\Microsoft\\Windows\\Start Menu\\Programs\\Hubstaff\\Hubstaff.lnk`,
    `${programData}\\Microsoft\\Windows\\Start Menu\\Programs\\Hubstaff.lnk`,
  ].filter(Boolean);

  if (!candidates.length) {
    return "cmd /c exit /b 1";
  }

  const ifChain = candidates
    .map((item, idx) => {
      if (idx === 0) {
        return `if exist "${item}" (start "" "${item}")`;
      }
      return `else if exist "${item}" (start "" "${item}")`;
    })
    .join(" ");

  return `cmd /c ${ifChain} else (exit /b 1)`;
}

function buildBlueMailCommand() {
  return 'cmd /c start "" "BlueMail:"';
}

function getMailtoComposeFields(composeUrl) {
  const parsed = new URL(composeUrl);
  const normalizeRecipients = (value) =>
    decodeURIComponent(value || "")
      .split(/[;,]/)
      .map((recipient) => recipient.trim())
      .filter(Boolean)
      .join(",");
  const fields = {
    to: normalizeRecipients(parsed.pathname),
    cc: normalizeRecipients(parsed.searchParams.get("cc")),
    subject: parsed.searchParams.get("subject") || "",
    body: parsed.searchParams.get("body") || "",
    format: parsed.searchParams.get("format") || "",
  };

  return fields;
}

function escapeThunderbirdComposeValue(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, "\\n");
}

function buildThunderbirdCommand(composeUrl) {
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const localAppData = process.env.LOCALAPPDATA || "";

  const candidates = [
    `${programFiles}\\Mozilla Thunderbird\\thunderbird.exe`,
    `${programFilesX86}\\Mozilla Thunderbird\\thunderbird.exe`,
    `${localAppData}\\Mozilla Thunderbird\\thunderbird.exe`,
  ].filter(Boolean);

  let fields;
  try {
    fields = getMailtoComposeFields(composeUrl);
  } catch {
    throw new Error("Invalid sprint mail compose URL");
  }

  const composeArgs = Object.entries(fields)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}='${escapeThunderbirdComposeValue(value)}'`)
    .join(",");

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return `cmd /c start "" "${candidate}" -compose "${composeArgs}"`;
    }
  }

  return `cmd /c start "" thunderbird.exe -compose "${composeArgs}"`;
}

function buildChromeCommand() {
  const localAppData = process.env.LOCALAPPDATA || "";
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const candidates = [
    `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`,
    `${programFiles}\\Google\\Chrome\\Application\\chrome.exe`,
    `${programFilesX86}\\Google\\Chrome\\Application\\chrome.exe`,
  ].filter(Boolean);

  const ifChain = candidates
    .map((item, idx) => {
      if (idx === 0) {
        return `if exist "${item}" (start "" "${item}")`;
      }
      return `else if exist "${item}" (start "" "${item}")`;
    })
    .join(" ");

  return `cmd /c ${ifChain} else (start "" chrome)`;
}

function canReachHttpUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (response) => {
      const ok = response.statusCode >= 200 && response.statusCode < 500;
      response.resume();
      resolve(ok);
    });

    req.setTimeout(2500, () => {
      req.destroy();
      resolve(false);
    });

    req.on("error", () => resolve(false));
  });
}

function canReachTcpPort(host, port) {
  return new Promise((resolve) => {
    const socket = require("net").connect({ host, port });

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });

    socket.setTimeout(2000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function isWindowsProcessRunning(imageName) {
  return new Promise((resolve) => {
    const command = `tasklist /FI "IMAGENAME eq ${imageName}"`;
    exec(command, { windowsHide: true }, (error, stdout) => {
      if (error) {
        resolve(false);
        return;
      }

      resolve(stdout.toLowerCase().includes(imageName.toLowerCase()));
    });
  });
}

async function isAnyWindowsProcessRunning(imageNames) {
  for (const imageName of imageNames) {
    if (await isWindowsProcessRunning(imageName)) {
      return true;
    }
  }

  return false;
}

async function forceStopWindowsProcess(imageName, attempts = 3) {
  let foundProcess = false;
  let lastResult = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    foundProcess = (await isWindowsProcessRunning(imageName)) || foundProcess;
    // /IM matches every instance of this image name, while /T also closes
    // any child processes owned by it.
    lastResult = await execAsync(`taskkill /F /T /IM ${imageName}`, { windowsHide: false });
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return {
    foundProcess,
    stopped: foundProcess && !(await isWindowsProcessRunning(imageName)),
    result: lastResult,
  };
}

async function stopWindowsService(serviceName) {
  const query = await execAsync(`sc.exe query ${serviceName}`, { windowsHide: true });
  const queryOutput = `${query.stdout || ""}\n${query.stderr || ""}`;

  // Do not print noise for service names that are not registered. XAMPP can
  // run perfectly well without installing Apache/MySQL as Windows services.
  if (query.error || /1060|does not exist|failed 1060/i.test(queryOutput)) {
    return { exists: false, stopped: true };
  }

  const result = await execAsync(`sc.exe stop ${serviceName}`, { windowsHide: false });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`.toLowerCase();

  // 1060 = service does not exist, and 1062 = service is not running. Both
  // are expected for installations that do not register XAMPP services.
  if (result.error && !/1060|1062|does not exist|not been started|not running/i.test(output)) {
    console.log(chalk.yellow(`⚠️ Could not stop Windows service ${serviceName}`));
    console.log(chalk.gray(String(result.stderr || result.error.message).trim()));
  }

  return {
    exists: true,
    stopped: !result.error || /1062|not been started|not running/i.test(output),
  };
}

async function forceStopXamppProcessesElevated() {
  // Apache/MySQL are often started by an elevated XAMPP control panel. A
  // normal taskkill from qme then returns Access Denied. Use one UAC prompt for
  // both processes instead of silently leaving them running.
  const command =
    "Get-Process -Name httpd,apache,mysqld,mariadbd -ErrorAction SilentlyContinue | Stop-Process -Force";
  const encodedCommand = Buffer.from(command, "utf16le").toString("base64");
  return execAsync(
    `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell.exe -Verb RunAs -Wait -ArgumentList '-NoProfile','-EncodedCommand','${encodedCommand}'"`,
    { windowsHide: false },
  );
}

// eslint-disable-next-line no-unused-vars -- retained for legacy readiness checks
async function waitForHttpUrl(url, timeoutMs = 60000, pollMs = 1500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    // Poll until Apache is serving phpMyAdmin.
    if (await canReachHttpUrl(url)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  return false;
}

async function waitForAnyHttpUrl(urls, timeoutMs = 60000, pollMs = 1500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const url of urls) {
      if (await canReachHttpUrl(url)) {
        return url;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  return "";
}

async function waitForMysqlReady(timeoutMs = 60000, pollMs = 1500) {
  const host = "127.0.0.1";
  const ports = [3306, 3307];
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (await isWindowsProcessRunning("mysqld.exe")) {
      for (const port of ports) {
        if (await canReachTcpPort(host, port)) {
          return { host, port };
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  return null;
}

function openUrlInBrowser(url) {
  return new Promise((resolve) => {
    exec(`cmd /c start "" "${url}"`, { windowsHide: false }, (error) => {
      if (error) {
        console.log(chalk.yellow(`⚠️ Could not open browser automatically: ${url}`));
        console.log(chalk.yellow(error.message));
        resolve(false);
        return;
      }

      console.log(chalk.green(`✅ Opened in browser: ${url}`));
      resolve(true);
    });
  });
}

const COMMANDS = {
  taskmgr: {
    commandLine: 'cmd /c start "" taskmgr',
    description: "Open Task Manager",
  },
  lock: {
    commandLine: "rundll32.exe user32.dll,LockWorkStation",
    description: "Lock current session",
  },
  settings: {
    commandLine: 'cmd /c start "" ms-settings:',
    description: "Open Windows Settings",
  },
  explorer: {
    commandLine: 'cmd /c start "" explorer "."',
    description: "Open current folder in File Explorer",
  },
  postman: {
    commandLine: () => buildPostmanCommand(),
    description: "Open Postman",
  },
  chrome: {
    commandLine: () => buildChromeCommand(),
    description: "Open Google Chrome",
  },
  notepad: {
    commandLine: 'cmd /c start "" notepad',
    description: "Open Notepad",
  },
  quit: {
    commandLine: "shutdown /s /f /t 0",
    description: "Close apps and shut down Windows",
  },
  xamppStart: {
    commandLine: () => resolveXamppExecutable("xampp_start.exe") || "cmd /c exit /b 1",
    description: "Start XAMPP",
  },
  xamppStop: {
    commandLine: () => resolveXamppExecutable("xampp_stop.exe") || "cmd /c exit /b 1",
    description: "Stop XAMPP",
  },
};

function runWindowsCommand(action, passthroughArgs = [], options = {}) {
  const { fireAndForget = false } = options;
  if (process.platform !== "win32") {
    console.log(chalk.red("❌ This command is only available on Windows"));
    process.exit(1);
  }

  const entry = COMMANDS[action];
  if (!entry) {
    const rawCommand = [action, ...passthroughArgs].filter(Boolean).join(" ").trim();
    if (!rawCommand) {
      const available = Object.keys(COMMANDS).join(", ");
      console.log(chalk.red(`❌ Unknown action: ${action || "(empty)"}`));
      console.log(chalk.yellow(`Available actions: ${available}`));
      console.log(chalk.yellow("Usage: qme win <action|cmd...>"));
      process.exit(1);
    }

    exec(`cmd /c ${rawCommand}`, { windowsHide: false }, (error) => {
      if (error) {
        console.log(chalk.red(`❌ Failed to run Windows command: ${rawCommand}`));
        console.log(chalk.yellow(error.message));
        process.exit(1);
      }

      console.log(chalk.green(`✅ Ran command: ${rawCommand}`));
    });
    return;
  }

  const commandLine =
    typeof entry.commandLine === "function" ? entry.commandLine() : entry.commandLine;

  if (fireAndForget) {
    try {
      const child = spawn(commandLine, {
        shell: true,
        detached: true,
        stdio: "ignore",
        windowsHide: false,
      });
      child.unref();
      console.log(chalk.green(`✅ ${entry.description}`));
      return;
    } catch (error) {
      console.log(chalk.red(`❌ Failed to run "${action}"`));
      console.log(chalk.yellow(error.message));
      process.exit(1);
    }
  }

  exec(commandLine, { windowsHide: false }, (error) => {
    if (error) {
      console.log(chalk.red(`❌ Failed to run "${action}"`));
      console.log(chalk.yellow(error.message));
      process.exit(1);
    }

    console.log(chalk.green(`✅ ${entry.description}`));
  });
}

function runNotepad(targetFile, options = {}) {
  const { exitOnSuccess = false } = options;
  if (process.platform !== "win32") {
    console.log(chalk.red("❌ This command is only available on Windows"));
    process.exit(1);
  }

  if (!targetFile) {
    runWindowsCommand("notepad");
    return;
  }

  const fullPath = path.resolve(process.cwd(), targetFile);
  const dirPath = path.dirname(fullPath);

  try {
    fs.mkdirSync(dirPath, { recursive: true });
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, "", "utf8");
    }
  } catch (error) {
    console.log(chalk.red("❌ Failed to prepare notes file"));
    console.log(chalk.yellow(error.message));
    process.exit(1);
  }

  const commandLine = `cmd /c start "" notepad "${fullPath}"`;

  exec(commandLine, { windowsHide: false }, (error) => {
    if (error) {
      console.log(chalk.red("❌ Failed to open notepad file"));
      console.log(chalk.yellow(error.message));
      process.exit(1);
    }

    console.log(chalk.green(`✅ Open Notepad: ${fullPath}`));
    if (exitOnSuccess) {
      process.exit(0);
    }
  });
}

function runGoogleChat() {
  if (process.platform !== "win32") {
    console.log(chalk.red("❌ This command is only available on Windows"));
    process.exit(1);
  }

  const commandLine = buildGoogleChatCommand();
  exec(commandLine, { windowsHide: false }, (error) => {
    if (error) {
      console.log(chalk.red("❌ Google Chat app not found"));
      console.log(
        chalk.yellow(
          "Install/open Google Chat desktop app once so its Start Menu shortcut is created.",
        ),
      );
      process.exit(1);
    }

    console.log(chalk.green("✅ Open Google Chat app"));
  });
}

function runHubstaff(action = "start") {
  if (process.platform !== "win32") {
    console.log(chalk.red("❌ This command is only available on Windows"));
    process.exit(1);
  }

  if (action === "stop") {
    const stopCommand =
      "powershell -NoProfile -Command \"$names=@('Hubstaff','HubstaffDesktop','hubstaff','hubstaffdesktop'); $procs=Get-Process | Where-Object { $names -contains $_.ProcessName }; if($procs){ $procs | Stop-Process -Force; exit 0 } else { exit 1 }\"";
    exec(stopCommand, { windowsHide: false }, (error) => {
      if (error) {
        console.log(chalk.red("❌ Hubstaff app is not running"));
        process.exit(1);
      }

      console.log(chalk.green("✅ Stopped Hubstaff app"));
    });
    return;
  }

  if (action !== "start") {
    console.log(chalk.red(`❌ Unknown hub action: ${action}`));
    console.log(chalk.yellow("Usage: qme hub [start|stop]"));
    process.exit(1);
  }

  const commandLine = buildHubstaffCommand();
  exec(commandLine, { windowsHide: false }, (error) => {
    if (error) {
      console.log(chalk.red("❌ Hubstaff app not found"));
      console.log(
        chalk.yellow(
          "Install/open Hubstaff desktop app once so its Start Menu shortcut is created.",
        ),
      );
      process.exit(1);
    }

    console.log(chalk.green("✅ Open Hubstaff app"));
  });
}

function runMail() {
  if (process.platform !== "win32") {
    console.log(chalk.red("❌ This command is only available on Windows"));
    process.exit(1);
  }

  const commandLine = buildBlueMailCommand();
  exec(commandLine, { windowsHide: false }, (error) => {
    if (error) {
      console.log(chalk.red("❌ BlueMail email app not found"));
      console.log(chalk.yellow("Install BlueMail or make sure `BlueMail` is available in PATH."));
      process.exit(1);
    }

    console.log(chalk.green("✅ Open BlueMail email app"));
  });
}

function runThunderbirdMail(composeUrl) {
  if (process.platform !== "win32") {
    console.log(chalk.red("❌ This command is only available on Windows"));
    process.exit(1);
  }

  const commandLine = buildThunderbirdCommand(composeUrl);
  exec(commandLine, { windowsHide: false }, (error) => {
    if (error) {
      console.log(chalk.red("❌ Thunderbird desktop app not found"));
      console.log(
        chalk.yellow("Install Thunderbird or make sure `thunderbird.exe` is available in PATH."),
      );
      process.exit(1);
    }

    console.log(chalk.green("✅ Opened Thunderbird compose window"));
  });
}

function runXamppStart({ onMysqlReady } = {}) {
  if (process.platform !== "win32") {
    console.log(chalk.red("❌ This command is only available on Windows"));
    process.exit(1);
  }

  const finishWithPhpMyAdminCheck = async () => {
    const mysqlReady = await waitForMysqlReady();
    const apacheRunning = await isWindowsProcessRunning("httpd.exe");
    const mysqlRunning = await isWindowsProcessRunning("mysqld.exe");

    console.log(chalk.blueBright("Running services:"));
    console.log(chalk.green(`1. Apache ${apacheRunning ? "running" : "not running"}`));
    console.log(chalk.green(`2. MySQL ${mysqlRunning ? "running" : "not running"}`));

    if (!mysqlReady) {
      console.log(chalk.yellow("⚠️ XAMPP started, but MySQL is not reachable yet."));
      console.log(
        chalk.yellow("phpMyAdmin may load with a database connection error until MySQL comes up."),
      );
      console.log(
        chalk.yellow("Check that MySQL is enabled in XAMPP and that port 3306 or 3307 is free."),
      );
      return;
    }

    if (typeof onMysqlReady === "function") {
      await onMysqlReady();
    }

    const phpMyAdminUrls = [
      "http://localhost/phpmyadmin/index.php",
      "http://localhost:8080/phpmyadmin/index.php",
    ];
    const readyUrl = await waitForAnyHttpUrl(phpMyAdminUrls);

    if (!readyUrl) {
      console.log(chalk.yellow("⚠️ XAMPP started, but phpMyAdmin is still not reachable."));
      console.log(chalk.yellow(`Try manually after a moment: ${phpMyAdminUrls[0]}`));
      console.log(chalk.yellow(`Or if Apache is configured for 8080: ${phpMyAdminUrls[1]}`));
      return;
    }

    console.log(chalk.green(`✅ phpMyAdmin ready: ${readyUrl}`));
    await openUrlInBrowser(readyUrl);
  };

  isWindowsProcessRunning("httpd.exe").then((httpdRunning) => {
    if (httpdRunning) {
      console.log(chalk.green("✅ Apache is already running"));
      finishWithPhpMyAdminCheck();
      return;
    }

    const commandLine = resolveXamppExecutable("xampp_start.exe");
    if (!commandLine) {
      console.log(chalk.red("❌ XAMPP start executable not found"));
      console.log(
        chalk.yellow(
          "Set the XAMPP path with `qme config xampp-path <path>` or install XAMPP in `C:\\xampp`.",
        ),
      );
      process.exit(1);
    }

    exec(commandLine, { windowsHide: false }, async (error) => {
      if (error) {
        console.log(chalk.red("❌ Failed to start XAMPP"));
        console.log(chalk.yellow(error.message));
        process.exit(1);
      }

      console.log(chalk.green("✅ Start XAMPP"));
      finishWithPhpMyAdminCheck();
    });
  });
}

function execAsync(commandLine, options = {}) {
  return new Promise((resolve) => {
    exec(commandLine, options, (error, stdout, stderr) => {
      resolve({ error, stdout: stdout || "", stderr: stderr || "" });
    });
  });
}

async function runXamppStop(options = {}) {
  const { strict = false, killDevProcesses = false, killCodeFirst = false, onBeforeStop } = options;

  if (process.platform !== "win32") {
    console.log(chalk.red("❌ This command is only available on Windows"));
    process.exit(1);
  }

  let codeClosed = false;
  if (killCodeFirst) {
    // Do not use /T here: qme may be running inside VS Code's terminal, and
    // killing the process tree would terminate qme before XAMPP is stopped.
    const codeStopResult = await execAsync("taskkill /F /IM code.exe", { windowsHide: false });
    codeClosed = !codeStopResult.error;
  }

  const apacheRunningBefore = await isWindowsProcessRunning("httpd.exe");
  const mysqlRunningBefore = await isWindowsProcessRunning("mysqld.exe");
  if (!killCodeFirst && typeof onBeforeStop === "function") {
    onBeforeStop();
  }
  if (!killCodeFirst) {
    console.log(chalk.blueBright("Services before stop:"));
    console.log(chalk.gray(`1. Apache ${apacheRunningBefore ? "running" : "not running"}`));
    console.log(chalk.gray(`2. MySQL ${mysqlRunningBefore ? "running" : "not running"}`));
  }

  const commandLine = resolveXamppExecutable("xampp_stop.exe");
  if (!commandLine) {
    if (!killCodeFirst) {
      console.log(chalk.yellow("⚠️ XAMPP stop executable not found."));
      console.log(chalk.yellow("If XAMPP is already stopped, there is nothing to do."));
      console.log(chalk.yellow("Otherwise set the XAMPP path with `qme config xampp-path <path>`."));
      return;
    }
  }

  const stopResult = commandLine
    ? await execAsync(commandLine, { windowsHide: false })
    : { error: null };

  if (!killCodeFirst) {
    if (stopResult.error) {
      if (!apacheRunningBefore && !mysqlRunningBefore) {
        console.log(chalk.green("✅ XAMPP is already stopped"));
      } else {
        console.log(chalk.yellow("⚠️ XAMPP stop command failed."));
        console.log(chalk.yellow(stopResult.error.message));
      }
    } else {
      console.log(chalk.green("✅ Stop XAMPP"));
    }
  }

  // Stop the two XAMPP services separately and retry. XAMPP's stop executable
  // can fail while the actual child processes are still alive.
  const coreStopResults = [];
  // Apache/MySQL are commonly installed as Windows services by XAMPP. Stop
  // those registrations first so the Service Control Manager cannot restart
  // the processes immediately after taskkill succeeds.
  for (const serviceName of ["Apache2.4", "mysql", "MySQL", "MariaDB"]) {
    coreStopResults.push(await stopWindowsService(serviceName));
  }
  for (const imageName of ["xampp-control.exe", "httpd.exe", "apache.exe", "mysqld.exe", "mariadbd.exe"]) {
    coreStopResults.push(await forceStopWindowsProcess(imageName));
  }

  let apacheAfterTaskkill = await isAnyWindowsProcessRunning(["httpd.exe", "apache.exe"]);
  let mysqlAfterTaskkill = await isAnyWindowsProcessRunning(["mysqld.exe", "mariadbd.exe"]);
  if (apacheAfterTaskkill || mysqlAfterTaskkill) {
    const elevatedResult = await forceStopXamppProcessesElevated();
    if (elevatedResult.error) {
      console.log(chalk.yellow("⚠️ Could not stop elevated XAMPP processes."));
      console.log(chalk.gray("Run qme from an Administrator terminal and try `qme xstop` again."));
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    apacheAfterTaskkill = await isAnyWindowsProcessRunning(["httpd.exe", "apache.exe"]);
    mysqlAfterTaskkill = await isAnyWindowsProcessRunning(["mysqld.exe", "mariadbd.exe"]);
  }

  const cleanupImages = ["php.exe"];
  if (killDevProcesses) {
    cleanupImages.push("git.exe", "node.exe", "code.exe");
  }
  const cleanupResults = await Promise.all(
    cleanupImages.map((imageName) =>
      execAsync(`taskkill /F /T /IM ${imageName}`, { windowsHide: false }),
    ),
  );
  const cleanupSucceeded =
    coreStopResults.some((result) => result && (result.foundProcess || result.stopped)) ||
    cleanupResults.some((result) => !result.error);

  if (!killCodeFirst) {
    if (!cleanupSucceeded) {
      console.log(
        chalk.yellow("⚠️ XAMPP stopped, but one or more cleanup process kills were skipped."),
      );
    } else {
      console.log(chalk.green("✅ Forced cleanup for XAMPP processes"));
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const apacheRunning = await isAnyWindowsProcessRunning(["httpd.exe", "apache.exe"]);
  const mysqlRunning = await isAnyWindowsProcessRunning(["mysqld.exe", "mariadbd.exe"]);

  if (killCodeFirst) {
    console.log(chalk.green(`1. VS Code ${codeClosed ? "closed" : "already closed"}`));
    console.log(chalk.green(`2. Apache ${apacheRunning ? "still running" : "stopped"}`));
    console.log(chalk.green(`3. MySQL ${mysqlRunning ? "still running" : "stopped"}`));
  } else {
    console.log(chalk.blueBright("Services after stop:"));
    const stoppedServices = [
      !apacheRunning && "Apache stopped",
      !mysqlRunning && "MySQL stopped",
    ].filter(Boolean);

    if (stoppedServices.length === 0) {
      console.log(chalk.yellow("None"));
    } else {
      stoppedServices.forEach((service, index) => {
        console.log(chalk.green(`${index + 1}. ${service}`));
      });
    }
  }

  if (strict && (apacheRunning || mysqlRunning)) {
    console.log(chalk.red("❌ XAMPP services still appear to be running"));
    console.log(
      chalk.yellow(
        `Still running: ${[apacheRunning && "httpd.exe", mysqlRunning && "mysqld.exe"].filter(Boolean).join(", ")}`,
      ),
    );
    throw new Error("XAMPP stop verification failed");
  }
}

module.exports = {
  runWindowsCommand,
  runNotepad,
  runGoogleChat,
  runHubstaff,
  runMail,
  runThunderbirdMail,
  runXamppStart,
  runXamppStop,
};
