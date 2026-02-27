#!/usr/bin/env node

const chalk = require("chalk");
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { runGitSync, runGitReset, runGitLogReset, runGitOpen, runGitRemove } = require("./src/git.js");
const { generateGitSshKey, getDefaultSshEmail } = require("./src/ssh.js");
const { askSshEmail, askSshTag } = require("./src/prompts.js");
const {
    exportConfig,
    setRemoteBranchForRepo,
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
const { runWindowsCommand, runNotepad, runGoogleChat, runHubstaff, runMail, runXamppStart } = require("./src/windows");
const { runMacXamppStart, runMacXamppStop } = require("./src/mac");

const args = process.argv.slice(2);

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
        runWindowsCommand("xamppStop");
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
    } else if (args[0] === "pa") {
        runArtisan(args.slice(1));
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

    if (args[0] === "config" && args[1] === "xampp-current") {
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
    // console.log(chalk.green("  qme config xampp-current [version|--show|--clear]"));
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
    // console.log(chalk.green("  qme xstart|xstop      # Shortcut for xampp start/stop"));
}

main();
// testing 


