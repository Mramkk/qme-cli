const { runSync } = require("../process");
const fs = require("fs");
const path = require("path");

function normalizeXamppVersion(version) {
  return String(version || "")
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/^xampp-/i, "");
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
  if (!normalized) return "";

  const parts = normalizePhpVersionParts(normalized);
  return parts.majorMinor || parts.value || normalized;
}

function getAvailableXamppVersions(baseDir, activeVersion, fsModule = require("fs")) {
  if (!fsModule.existsSync(baseDir) || !fsModule.statSync(baseDir).isDirectory()) {
    return [];
  }

  return fsModule
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^xampp-(.+)$/i.test(entry.name))
    .map((entry) => normalizeXamppVersion(entry.name))
    .filter(
      (version) => version && version.toLowerCase() !== String(activeVersion || "").toLowerCase(),
    )
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
}

function isProcessRunningOnWindows(imageName) {
  if (process.platform !== "win32") return false;

  const result = runSync("tasklist", ["/FI", `IMAGENAME eq ${imageName}`], {
    allowFailure: true,
    windowsHide: true,
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`.toLowerCase();
  return output.includes(String(imageName || "").toLowerCase());
}

async function isXamppRunning() {
  if (process.platform === "win32") {
    return isProcessRunningOnWindows("httpd.exe") || isProcessRunningOnWindows("mysqld.exe");
  }
  if (process.platform === "darwin") {
    return runSync("pgrep", ["-f", "xampp"], { allowFailure: true }).status === 0;
  }
  return false;
}

async function waitForReady(waitForTcpPort) {
  if (process.platform === "win32") {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 60000) {
      for (const port of [80, 8080]) {
        if (await waitForTcpPort("127.0.0.1", port, 500, 100)) return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    return false;
  }

  if (process.platform === "darwin") {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 45000) {
      if (await isXamppRunning()) return true;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    return false;
  }
  return true;
}

async function waitForStopped() {
  if (process.platform !== "win32") return true;

  const startedAt = Date.now();
  while (Date.now() - startedAt < 45000) {
    if (!isProcessRunningOnWindows("httpd.exe") && !isProcessRunningOnWindows("mysqld.exe")) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return false;
}

function createXamppPlatformOperations({
  runMacXamppStart,
  runMacXamppStop,
  runWindowsXamppStart,
  runWindowsXamppStop,
  chalk,
}) {
  function runXamppStartByPlatform(options = {}) {
    if (process.platform === "darwin") {
      runMacXamppStart();
      return;
    }

    if (process.platform === "win32") {
      runWindowsXamppStart(options);
      return;
    }

    console.log(chalk.red("❌ XAMPP commands are currently supported on Windows and macOS"));
    process.exit(1);
  }

  async function runXamppStopByPlatform(options = {}) {
    if (process.platform === "darwin") {
      await runMacXamppStop();
      return;
    }

    if (process.platform === "win32") {
      await runWindowsXamppStop(options);
      return;
    }

    console.log(chalk.red("❌ XAMPP commands are currently supported on Windows and macOS"));
    process.exit(1);
  }

  return { runXamppStartByPlatform, runXamppStopByPlatform };
}

function createXamppSwitch({
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
}) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  async function closeVsCodeForXamppSwitch() {
    try {
      console.log(chalk.cyan("Closing VS Code before switching XAMPP..."));
      execSync("cmd /c taskkill /F /T /IM code.exe", {
        stdio: "inherit",
        windowsHide: false,
      });
      console.log(chalk.green("✅ Closed VS Code"));
    } catch {
      console.log(chalk.yellow("⚠️ VS Code was not running or could not be closed automatically"));
    }
  }

  async function forceCloseXamppLockers() {
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
      { encoding: "utf8", windowsHide: true },
    );
    if (result.error) {
      console.log(
        chalk.yellow(`⚠️ Could not force-close XAMPP helper processes: ${result.error.message}`),
      );
      return;
    }
    const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    if (output) console.log(chalk.gray(output));
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
    const normalizedRequested = normalizeXamppVersion(requestedVersionRaw);
    const requestedVersionCandidates = normalizedRequested
      ? [normalizedRequested, normalizePhpVersionParts(normalizedRequested).majorMinor].filter(
          (version, index, values) => version && values.indexOf(version) === index,
        )
      : [];
    let requestedVersion = "";

    if (requestedVersionCandidates.length === 0) {
      const availableVersions = getAvailableXamppVersions(baseDir, currentVersion);
      if (availableVersions.length === 0) {
        console.log(chalk.red(`❌ No switch targets found in: ${baseDir}`));
        console.log(chalk.yellow("Expected folders like: xampp-7.4, xampp-8.1"));
        process.exit(1);
      }
      console.log(chalk.blue(`📁 Active path: ${xamppRoot}`));
      console.log(chalk.blue(`📂 Searching switch targets in: ${baseDir}`));
      console.log(chalk.green(`🟢 Current active version: ${currentVersion}`));
      console.log(chalk.blue("🔹 Available XAMPP versions:"));
      availableVersions.forEach((version, index) =>
        console.log(chalk.green(`  ${index + 1}) ${version}`)),
      );
      const answer = await askQuestion(
        chalk.yellow(`👉 Choose version (1-${availableVersions.length}) [press Enter to abort]: `),
      );
      if (!answer) {
        console.log(chalk.yellow("ℹ️ Switch cancelled"));
        return;
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
            (availableVersion) => availableVersion.toLowerCase() === candidate.toLowerCase(),
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
    if (!fs.existsSync(requestedVersionDir) || !fs.statSync(requestedVersionDir).isDirectory()) {
      console.log(chalk.red(`❌ Requested XAMPP folder not found: ${requestedVersionDir}`));
      process.exit(1);
    }
    if (fs.existsSync(currentVersionDir)) {
      console.log(chalk.red(`❌ Destination already exists: ${currentVersionDir}`));
      console.log(chalk.yellow("Update xampp-v or rename/remove that folder first."));
      process.exit(1);
    }

    const performSwap = async () => {
      await renameFolderWithRetry(xamppRoot, currentVersionDir, "active XAMPP folder");
      try {
        await renameFolderWithRetry(requestedVersionDir, xamppRoot, "requested XAMPP folder");
      } catch (swapError) {
        await renameFolderWithRetry(currentVersionDir, xamppRoot, "original XAMPP folder rollback");
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
      console.log(
        chalk.yellow("⚠️ XAMPP folder looks busy. Stopping services and retrying once..."),
      );
      await runXamppStopByPlatform();
      const stopped = await waitForXamppStopped();
      if (!stopped)
        console.log(
          chalk.yellow(
            "⚠️ XAMPP services still appear to be stopping. Retrying folder swap anyway...",
          ),
        );
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
    console.log(chalk.green(`✅ Switched XAMPP from ${currentVersion} to ${requestedVersion}`));
    console.log(chalk.green(`✅ Active folder: ${xamppRoot}`));
    console.log(chalk.green(`✅ Previous active folder renamed as: ${currentVersionDir}`));
    console.log(chalk.green("✅ Starting XAMPP with switched version..."));
    runXamppStart();
  }

  return runXamppSwitch;
}

function createXamppPathResolver({ getXamppPath, chalk }) {
  function getDefaultXamppPathsByPlatform() {
    if (process.platform === "win32") return ["C:\\xampp", "D:\\xampp"];
    if (process.platform === "darwin") return ["/Applications/XAMPP"];
    return [];
  }

  function getXamppPathCandidates() {
    const candidates = [];
    const configuredPath = getXamppPath();
    if (configuredPath) candidates.push(configuredPath);

    if (process.platform === "win32") {
      ["XAMPP_HOME", "XAMPP_PATH", "XAMPP_DIR"].forEach((key) => {
        const value = process.env[key];
        if (value && value.trim()) candidates.push(value.trim());
      });
    }

    candidates.push(...getDefaultXamppPathsByPlatform());
    return [
      ...new Set(
        candidates
          .map((value) =>
            String(value || "")
              .trim()
              .replace(/^"+|"+$/g, "")
              .replace(/[\\/]+$/g, ""),
          )
          .filter(Boolean),
      ),
    ];
  }

  function resolveXamppPath(type) {
    const xamppRoots = getXamppPathCandidates();
    if (xamppRoots.length === 0) {
      console.log(chalk.red(`❌ XAMPP ${type} lookup is supported on Windows and macOS`));
      process.exit(1);
    }

    const candidates = xamppRoots.flatMap((xamppRoot) =>
      type === "php.ini"
        ? process.platform === "darwin"
          ? [
              path.join(xamppRoot, "xamppfiles", "etc", "php.ini"),
              path.join(xamppRoot, "etc", "php.ini"),
              path.join(xamppRoot, "php", "php.ini"),
            ]
          : [path.join(xamppRoot, "php", "php.ini")]
        : process.platform === "darwin"
          ? [path.join(xamppRoot, "xamppfiles", "htdocs"), path.join(xamppRoot, "htdocs")]
          : [path.join(xamppRoot, "htdocs")],
    );
    const matches = candidates.filter((candidate) =>
      type === "php.ini"
        ? fs.existsSync(candidate) && fs.statSync(candidate).isFile()
        : fs.existsSync(candidate) && fs.statSync(candidate).isDirectory(),
    );
    if (matches.length > 0) return matches[0];

    console.log(chalk.red(`❌ XAMPP ${type} file not found`));
    console.log(chalk.yellow(`XAMPP paths: ${xamppRoots.join(", ")}`));
    console.log(chalk.yellow(`Checked: ${candidates.join(", ")}`));
    console.log(chalk.yellow("Set path with: qme config xampp-path <path>"));
    process.exit(1);
  }

  return {
    getDefaultXamppPathsByPlatform,
    getXamppPathCandidates,
    resolveXamppHtdocsPath: () => resolveXamppPath("htdocs"),
    resolveXamppPhpIniPath: () => resolveXamppPath("php.ini"),
  };
}

function createXamppProjectBrowser({
  resolveXamppHtdocsPath,
  askQuestion,
  tryOpenInVsCode,
  chalk,
}) {
  const skippedFolders = new Set(["dashboard", "img", "webalizer", "xampp"]);

  return async function runXamppProjects() {
    const htdocsPath = resolveXamppHtdocsPath();
    const projects = fs
      .readdirSync(htdocsPath, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          !entry.name.startsWith(".") &&
          !skippedFolders.has(entry.name.toLowerCase()),
      )
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

    if (projects.length === 0) {
      console.log(chalk.yellow("ℹ️ No project folders found in XAMPP htdocs"));
      return;
    }

    console.log(chalk.blueBright("XAMPP projects:"));
    projects.forEach((project, index) => {
      console.log(chalk.green(`  ${index + 1}) ${project}`));
      console.log(chalk.gray(`     ${path.join(htdocsPath, project)}`));
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
    if (Number.isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > projects.length) {
      console.log(chalk.red("❌ Invalid project selection"));
      process.exit(1);
    }

    tryOpenInVsCode(path.join(htdocsPath, projects[selectedIndex - 1]), "XAMPP project", {
      newWindow: true,
    });
  };
}

module.exports = {
  createXamppPlatformOperations,
  createXamppPathResolver,
  createXamppProjectBrowser,
  createXamppSwitch,
  getAvailableXamppVersions,
  getXamppSwitchVersionCandidate,
  isXamppRunning,
  normalizePhpVersionParts,
  normalizeXamppVersion,
  waitForReady,
  waitForStopped,
};
