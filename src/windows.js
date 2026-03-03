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

        return value.trim().replace(/^"+|"+$/g, "").replace(/[\\\/]+$/, "");
    }

    return "";
}

function buildXamppCommand(exeName) {
    const configuredDir = getConfiguredXamppDir();
    const configuredExe = configuredDir ? `${configuredDir}\\${exeName}` : "";
    const defaultExe = `C:\\xampp\\${exeName}`;

    if (configuredExe) {
        return `cmd /c if exist "${configuredExe}" ("${configuredExe}") else if exist "${defaultExe}" ("${defaultExe}") else (${exeName})`;
    }

    return `cmd /c if exist "${defaultExe}" ("${defaultExe}") else (${exeName})`;
}

function buildPostmanCommand() {
    const localAppData = process.env.LOCALAPPDATA || "";
    const programFiles = process.env.ProgramFiles || "";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "";

    const localPostman = localAppData
        ? `${localAppData}\\Postman\\Postman.exe`
        : "";
    const programFilesPostman = programFiles
        ? `${programFiles}\\Postman\\Postman.exe`
        : "";
    const programFilesX86Postman = programFilesX86
        ? `${programFilesX86}\\Postman\\Postman.exe`
        : "";

    const checks = [
        localPostman,
        programFilesPostman,
        programFilesX86Postman
    ].filter(Boolean);

    if (!checks.length) {
        return "cmd /c start \"\" postman";
    }

    const ifChain = checks.map((item, idx) => {
        if (idx === 0) {
            return `if exist "${item}" (start "" "${item}")`;
        }
        return `else if exist "${item}" (start "" "${item}")`;
    }).join(" ");

    return `cmd /c ${ifChain} else (start "" postman)`;
}

function buildGoogleChatCommand() {
    const appData = process.env.APPDATA || "";
    const programData = process.env.ProgramData || "C:\\ProgramData";
    const candidates = [
        `${appData}\\Microsoft\\Windows\\Start Menu\\Programs\\Chrome Apps\\Google Chat.lnk`,
        `${appData}\\Microsoft\\Windows\\Start Menu\\Programs\\Google Chat.lnk`,
        `${programData}\\Microsoft\\Windows\\Start Menu\\Programs\\Chrome Apps\\Google Chat.lnk`,
        `${programData}\\Microsoft\\Windows\\Start Menu\\Programs\\Google Chat.lnk`
    ].filter(Boolean);

    if (!candidates.length) {
        return "cmd /c exit /b 1";
    }

    const ifChain = candidates.map((item, idx) => {
        if (idx === 0) {
            return `if exist "${item}" (start "" "${item}")`;
        }
        return `else if exist "${item}" (start "" "${item}")`;
    }).join(" ");

    return `cmd /c ${ifChain} else (exit /b 1)`;
}

function buildHubstaffCommand() {
    const appData = process.env.APPDATA || "";
    const programData = process.env.ProgramData || "C:\\ProgramData";
    const candidates = [
        `${appData}\\Microsoft\\Windows\\Start Menu\\Programs\\Hubstaff\\Hubstaff.lnk`,
        `${appData}\\Microsoft\\Windows\\Start Menu\\Programs\\Hubstaff.lnk`,
        `${programData}\\Microsoft\\Windows\\Start Menu\\Programs\\Hubstaff\\Hubstaff.lnk`,
        `${programData}\\Microsoft\\Windows\\Start Menu\\Programs\\Hubstaff.lnk`
    ].filter(Boolean);

    if (!candidates.length) {
        return "cmd /c exit /b 1";
    }

    const ifChain = candidates.map((item, idx) => {
        if (idx === 0) {
            return `if exist "${item}" (start "" "${item}")`;
        }
        return `else if exist "${item}" (start "" "${item}")`;
    }).join(" ");

    return `cmd /c ${ifChain} else (exit /b 1)`;
}

function buildBlueMailCommand() {
    return 'cmd /c start "" "BlueMail:"';
}

function buildChromeCommand() {
    const localAppData = process.env.LOCALAPPDATA || "";
    const programFiles = process.env.ProgramFiles || "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    const candidates = [
        `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`,
        `${programFiles}\\Google\\Chrome\\Application\\chrome.exe`,
        `${programFilesX86}\\Google\\Chrome\\Application\\chrome.exe`
    ].filter(Boolean);

    const ifChain = candidates.map((item, idx) => {
        if (idx === 0) {
            return `if exist "${item}" (start "" "${item}")`;
        }
        return `else if exist "${item}" (start "" "${item}")`;
    }).join(" ");

    return `cmd /c ${ifChain} else (start "" chrome)`;
}

function canReachHttpUrl(url) {
    return new Promise(resolve => {
        const req = http.get(url, response => {
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

function isWindowsProcessRunning(imageName) {
    return new Promise(resolve => {
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

async function waitForHttpUrl(url, timeoutMs = 60000, pollMs = 1500) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        // Poll until Apache is serving phpMyAdmin.
        if (await canReachHttpUrl(url)) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, pollMs));
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
        await new Promise(resolve => setTimeout(resolve, pollMs));
    }

    return "";
}

function openUrlInBrowser(url) {
    return new Promise(resolve => {
        exec(`cmd /c start "" "${url}"`, { windowsHide: false }, error => {
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
        description: "Open Task Manager"
    },
    lock: {
        commandLine: "rundll32.exe user32.dll,LockWorkStation",
        description: "Lock current session"
    },
    settings: {
        commandLine: 'cmd /c start "" ms-settings:',
        description: "Open Windows Settings"
    },
    explorer: {
        commandLine: 'cmd /c start "" explorer "."',
        description: "Open current folder in File Explorer"
    },
    postman: {
        commandLine: () => buildPostmanCommand(),
        description: "Open Postman"
    },
    chrome: {
        commandLine: () => buildChromeCommand(),
        description: "Open Google Chrome"
    },
    notepad: {
        commandLine: 'cmd /c start "" notepad',
        description: "Open Notepad"
    },
    quit: {
        commandLine: "shutdown /s /f /t 0",
        description: "Close apps and shut down Windows"
    },
    xamppStart: {
        commandLine: () => buildXamppCommand("xampp_start.exe"),
        description: "Start XAMPP"
    },
    xamppStop: {
        commandLine: () => buildXamppCommand("xampp_stop.exe"),
        description: "Stop XAMPP"
    }
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

        exec(`cmd /c ${rawCommand}`, { windowsHide: false }, error => {
            if (error) {
                console.log(chalk.red(`❌ Failed to run Windows command: ${rawCommand}`));
                console.log(chalk.yellow(error.message));
                process.exit(1);
            }

            console.log(chalk.green(`✅ Ran command: ${rawCommand}`));
        });
        return;
    }

    const commandLine = typeof entry.commandLine === "function"
        ? entry.commandLine()
        : entry.commandLine;

    if (fireAndForget) {
        try {
            const child = spawn(commandLine, {
                shell: true,
                detached: true,
                stdio: "ignore",
                windowsHide: false
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

    exec(commandLine, { windowsHide: false }, error => {
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

    exec(commandLine, { windowsHide: false }, error => {
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
    exec(commandLine, { windowsHide: false }, error => {
        if (error) {
            console.log(chalk.red("❌ Google Chat app not found"));
            console.log(chalk.yellow("Install/open Google Chat desktop app once so its Start Menu shortcut is created."));
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
        const stopCommand = 'powershell -NoProfile -Command "$names=@(\'Hubstaff\',\'HubstaffDesktop\',\'hubstaff\',\'hubstaffdesktop\'); $procs=Get-Process | Where-Object { $names -contains $_.ProcessName }; if($procs){ $procs | Stop-Process -Force; exit 0 } else { exit 1 }"';
        exec(stopCommand, { windowsHide: false }, error => {
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
    exec(commandLine, { windowsHide: false }, error => {
        if (error) {
            console.log(chalk.red("❌ Hubstaff app not found"));
            console.log(chalk.yellow("Install/open Hubstaff desktop app once so its Start Menu shortcut is created."));
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
    exec(commandLine, { windowsHide: false }, error => {
        if (error) {
            console.log(chalk.red("❌ BlueMail email app not found"));
            console.log(chalk.yellow("Install BlueMail or make sure `BlueMail` is available in PATH."));
            process.exit(1);
        }

        console.log(chalk.green("✅ Open BlueMail email app"));
    });
}

function runXamppStart() {
    if (process.platform !== "win32") {
        console.log(chalk.red("❌ This command is only available on Windows"));
        process.exit(1);
    }

    const finishWithPhpMyAdminCheck = async () => {
        const phpMyAdminUrls = [
            "http://localhost/phpmyadmin/index.php",
            "http://localhost:8080/phpmyadmin/index.php"
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

    isWindowsProcessRunning("httpd.exe").then(httpdRunning => {
        if (httpdRunning) {
            console.log(chalk.green("✅ Apache is already running"));
            finishWithPhpMyAdminCheck();
            return;
        }

        const commandLine = buildXamppCommand("xampp_start.exe");
        exec(commandLine, { windowsHide: false }, async error => {
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

function runXamppStop() {
    if (process.platform !== "win32") {
        console.log(chalk.red("❌ This command is only available on Windows"));
        process.exit(1);
    }

    const commandLine = buildXamppCommand("xampp_stop.exe");
    exec(commandLine, { windowsHide: false }, error => {
        if (error) {
            console.log(chalk.yellow("⚠️ XAMPP stop command failed or XAMPP is already stopped."));
            console.log(chalk.yellow(error.message));
        } else {
            console.log(chalk.green("✅ Stop XAMPP"));
        }

        const cleanupCommand = "cmd /c taskkill /F /IM httpd.exe /IM mysqld.exe /IM php.exe /IM xampp-control.exe /IM git.exe /IM node.exe /IM code.exe";
        exec(cleanupCommand, { windowsHide: false }, cleanupError => {
            if (cleanupError) {
                console.log(chalk.yellow("⚠️ XAMPP stopped, but one or more cleanup process kills were skipped."));
                return;
            }

            console.log(chalk.green("✅ Forced cleanup for httpd/mysqld/php/xampp-control/git/node/code"));
        });
    });
}

module.exports = {
    runWindowsCommand,
    runNotepad,
    runGoogleChat,
    runHubstaff,
    runMail,
    runXamppStart,
    runXamppStop
};
