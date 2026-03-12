#!/usr/bin/env node

const chalk = require("chalk");
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { runGitSync, runGitReset, runGitLogReset, runGitOpen, runGitRemove, runGitUserSwitch, runGitUserAdd } = require("./src/git.js");
const { generateGitSshKey, getDefaultSshEmail } = require("./src/ssh.js");
const { askQuestion, askSshEmail, askSshTag } = require("./src/prompts.js");
const {
    exportConfig,
    setRemoteBranchForRepo,
    setProjectIdForRepo,
    setXamppPath,
    clearXamppPath,
    getXamppPath,
    setXamppCurrentVersion,
    clearXamppCurrentVersion,
    getXamppCurrentVersion
} = require("./src/config.js");
const { getProjectRepoUrl } = require("./src/utils.js");
const { initializeRepo } = require("./src/init.js");
const { runArtisan } = require("./src/laravel");
const { runWindowsCommand, runNotepad, runGoogleChat, runHubstaff, runMail, runXamppStart, runXamppStop } = require("./src/windows");
const { runMacXamppStart, runMacXamppStop } = require("./src/mac");

const args = process.argv.slice(2);

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
        windowsHide: false
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

function getAvailableXamppVersions(baseDir, activeVersion) {
    if (!fs.existsSync(baseDir) || !fs.statSync(baseDir).isDirectory()) {
        return [];
    }

    return fs.readdirSync(baseDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && /^xampp-(.+)$/i.test(entry.name))
        .map(entry => normalizeXamppVersion(entry.name))
        .filter(version => version && version.toLowerCase() !== String(activeVersion || "").toLowerCase())
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
}

async function runXamppSwitch(requestedVersionRaw) {
    if (process.platform !== "win32") {
        console.log(chalk.red("❌ xampp switch is currently supported on Windows"));
        process.exit(1);
    }

    const xamppRoot = getXamppPath() || "D:\\xampp";
    const currentVersion = normalizeXamppVersion(getXamppCurrentVersion());
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
    let requestedVersion = normalizeXamppVersion(requestedVersionRaw);

    if (!requestedVersion) {
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
        availableVersions.forEach((version, index) => {
            console.log(chalk.green(`  ${index + 1}) ${version}`));
        });

        const answer = await askQuestion(
            chalk.yellow(`👉 Choose version (1-${availableVersions.length}) [press Enter to abort]: `)
        );
        if (!answer) {
            console.log(chalk.yellow("ℹ️ Switch cancelled"));
            process.exit(0);
        }

        const selectedIndex = Number.parseInt(answer, 10);
        if (Number.isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > availableVersions.length) {
            console.log(chalk.red("❌ Invalid selection"));
            process.exit(1);
        }

        requestedVersion = availableVersions[selectedIndex - 1];
    }

    if (currentVersion.toLowerCase() === requestedVersion.toLowerCase()) {
        console.log(chalk.yellow(`ℹ️ XAMPP ${requestedVersion} is already active`));
        process.exit(0);
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

    try {
        fs.renameSync(xamppRoot, currentVersionDir);
        try {
            fs.renameSync(requestedVersionDir, xamppRoot);
        } catch (swapError) {
            fs.renameSync(currentVersionDir, xamppRoot);
            throw swapError;
        }
    } catch (error) {
        console.log(chalk.red("❌ Failed to switch XAMPP folders"));
        console.log(chalk.yellow(error.message));
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

function runXamppStartByPlatform() {
    if (process.platform === "darwin") {
        runMacXamppStart();
        return;
    }

    if (process.platform === "win32") {
        runXamppStart();
        return;
    }

    console.log(chalk.red("❌ XAMPP commands are currently supported on Windows and macOS"));
    process.exit(1);
}

function runXamppStopByPlatform() {
    if (process.platform === "darwin") {
        runMacXamppStop();
        return;
    }

    if (process.platform === "win32") {
        runXamppStop();
        return;
    }

    console.log(chalk.red("❌ XAMPP commands are currently supported on Windows and macOS"));
    process.exit(1);
}

function getOptionValue(argv, keys) {
    const index = argv.findIndex(item => keys.includes(item));
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
        shell: process.platform === "win32"
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
        return path.join(homeDir, "Library", "Application Support", "Code", "User", "globalStorage", "storage.json");
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

    const lastWindow = storageData
        && storageData.windowsState
        && storageData.windowsState.lastActiveWindow
        ? storageData.windowsState.lastActiveWindow
        : null;

    const rawTarget = lastWindow && (lastWindow.folder || lastWindow.workspace)
        ? (lastWindow.folder || lastWindow.workspace)
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

function tryOpenInVsCode(targetPath) {
    const codeResult = spawnSync("code", [targetPath], {
        stdio: "inherit",
        shell: process.platform === "win32"
    });

    if (!codeResult.error && codeResult.status === 0) {
        console.log(chalk.green(`✅ Opened recent project in VS Code: ${targetPath}`));
        return;
    }

    if (process.platform === "darwin") {
        const openResult = spawnSync("open", ["-a", "Visual Studio Code", targetPath], { stdio: "inherit" });
        if (!openResult.error && openResult.status === 0) {
            console.log(chalk.green(`✅ Opened recent project in VS Code: ${targetPath}`));
            return;
        }

        console.log(chalk.red("❌ Failed to open VS Code"));
        console.log(chalk.yellow("Install the `code` command in PATH or verify the app is installed."));
        process.exit(1);
    }

    if (process.platform === "win32") {
        const localAppData = process.env.LOCALAPPDATA || "";
        const programFiles = process.env.ProgramFiles || "C:\\Program Files";
        const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";

        const candidates = [
            localAppData ? `${localAppData}\\Programs\\Microsoft VS Code\\Code.exe` : "",
            `${programFiles}\\Microsoft VS Code\\Code.exe`,
            `${programFilesX86}\\Microsoft VS Code\\Code.exe`
        ].filter(Boolean);

        for (const exePath of candidates) {
            if (!fs.existsSync(exePath)) {
                continue;
            }

            const result = spawnSync("cmd", ["/c", `start "" "${exePath}" "${targetPath}"`], {
                stdio: "inherit"
            });

            if (!result.error && result.status === 0) {
                console.log(chalk.green(`✅ Opened recent project in VS Code: ${targetPath}`));
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

async function main() {
    if (args[0] === "npm" || args[0] === "npx" || args[0] === "n") {
        const tool = args[0] === "n" ? "npm" : args[0];
        runNodeToolCommand(tool, args.slice(1));
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

    if (args[0] === "git" && args[1] === "log") {
        await runGitLogReset();
        return;
    }
    if (args[0] === "git" && args[1] === "open") {
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
            fileTag
        });
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
        console.log(chalk.green("✅ Remote branch for this project is now set to:"), chalk.cyan(branch));
        return;
    }

    if (
        args[0] === "git"
        && args[1] === "repo"
        && (
            (args[2] === "project" && args[3] === "id")
            || args[2] === "project-id"
            || args[2] === "project_id"
        )
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
        console.log(chalk.green("✅ Project ID for this repository is now set to:"), chalk.cyan(String(projectId)));
        return;
    }

    if (args[0] === "config" && args[1] === "export") {
        const outputPath = args[2] || null;
        exportConfig(outputPath);
        return;
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
        runWindowsCommand("quit");
        return;
    }

    if (args[0] === "xstart") {
        runXamppStartByPlatform();
        return;
    }

    if (args[0] === "xstop") {
        runXamppStopByPlatform();
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
        runXamppStopByPlatform();
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
}

main();
// testing 




