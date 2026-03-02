const { exec } = require("child_process");
const http = require("http");
const fs = require("fs");
const chalk = require("chalk");
const { getXamppPath } = require("./config");

function normalizePathValue(value) {
    return (value || "").trim().replace(/^"+|"+$/g, "").replace(/[\\\/]+$/, "");
}

function normalizeMessage(value) {
    return (value || "").toLowerCase();
}

function hasAlreadyRunningSignal(message) {
    const normalized = normalizeMessage(message);
    return normalized.includes("already running") || normalized.includes("is running") || normalized.includes("running already");
}

function hasAlreadyStoppedSignal(message) {
    const normalized = normalizeMessage(message);
    return normalized.includes("not running") || normalized.includes("already stopped") || normalized.includes("is not running");
}

function hasRootRequiredSignal(message) {
    const normalized = normalizeMessage(message);
    return normalized.includes("need to be root") || normalized.includes("must be root") || normalized.includes("permission denied");
}

function getMacXamppScriptPath() {
    const configuredPath = normalizePathValue(getXamppPath());
    const normalizedConfigured = configuredPath.replace(/\\/g, "/");
    const candidates = [];

    if (normalizedConfigured) {
        candidates.push(`${normalizedConfigured}/xampp`);
        candidates.push(`${normalizedConfigured}/xamppfiles/xampp`);
        candidates.push(`${normalizedConfigured}/bin/xampp`);
    }

    candidates.push("/Applications/XAMPP/xamppfiles/xampp");
    candidates.push("/Applications/XAMPP/bin/xampp");

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return "";
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

async function waitForHttpUrl(url, timeoutMs = 60000, pollMs = 1500) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        if (await canReachHttpUrl(url)) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, pollMs));
    }

    return false;
}

function openUrlInBrowser(url) {
    exec(`open "${url}"`, { windowsHide: false }, error => {
        if (error) {
            console.log(chalk.yellow(`⚠️ Could not open browser automatically: ${url}`));
            console.log(chalk.yellow(error.message));
            return;
        }

        console.log(chalk.green(`✅ Opened in browser: ${url}`));
    });
}

function runMacXamppStart() {
    if (process.platform !== "darwin") {
        console.log(chalk.red("❌ This command is only available on macOS"));
        process.exit(1);
    }

    const scriptPath = getMacXamppScriptPath();
    if (!scriptPath) {
        console.log(chalk.red("❌ XAMPP script not found on macOS"));
        console.log(chalk.yellow("Set path with: qme config xampp-path \"/Applications/XAMPP\""));
        process.exit(1);
    }

    exec(`"${scriptPath}" start`, { windowsHide: false }, async (error, stdout, stderr) => {
        const details = [stdout, stderr, error && error.message].filter(Boolean).join("\n");
        const phpMyAdminUrl = "http://localhost/phpmyadmin/index.php";

        if (!error) {
            console.log(chalk.green("✅ Start XAMPP"));
        } else {
            const benign = hasAlreadyRunningSignal(details);
            if (benign) {
                console.log(chalk.yellow("ℹ️ XAMPP appears to be already running."));
            }
        }

        const ready = await waitForHttpUrl(phpMyAdminUrl);
        if (!ready) {
            console.log(chalk.red("❌ Failed to start XAMPP"));
            if (details) {
                console.log(chalk.yellow(details.trim()));
            }
            if (hasRootRequiredSignal(details)) {
                console.log(chalk.yellow("Try with elevated privileges: sudo qme xstart"));
            }
            console.log(chalk.yellow(`phpMyAdmin is not reachable: ${phpMyAdminUrl}`));
            process.exit(1);
        }

        if (error && details && !hasAlreadyRunningSignal(details)) {
            console.log(chalk.yellow("⚠️ XAMPP reported a non-zero exit code, but services are reachable."));
            console.log(chalk.yellow(details.trim()));
        }

        console.log(chalk.green(`✅ phpMyAdmin ready: ${phpMyAdminUrl}`));
        openUrlInBrowser(phpMyAdminUrl);
    });
}

function runMacXamppStop() {
    if (process.platform !== "darwin") {
        console.log(chalk.red("❌ This command is only available on macOS"));
        process.exit(1);
    }

    const scriptPath = getMacXamppScriptPath();
    if (!scriptPath) {
        console.log(chalk.red("❌ XAMPP script not found on macOS"));
        console.log(chalk.yellow("Set path with: qme config xampp-path \"/Applications/XAMPP\""));
        process.exit(1);
    }

    exec(`"${scriptPath}" stop`, { windowsHide: false }, async (error, stdout, stderr) => {
        const details = [stdout, stderr, error && error.message].filter(Boolean).join("\n");
        const phpMyAdminUrl = "http://localhost/phpmyadmin/index.php";
        const stillReachable = await waitForHttpUrl(phpMyAdminUrl, 8000, 1000);

        if (stillReachable) {
            console.log(chalk.red("❌ Failed to stop XAMPP"));
            if (details) {
                console.log(chalk.yellow(details.trim()));
            }
            if (hasRootRequiredSignal(details)) {
                console.log(chalk.yellow("Try with elevated privileges: sudo qme xstop"));
            }
            console.log(chalk.yellow(`phpMyAdmin is still reachable: ${phpMyAdminUrl}`));
            process.exit(1);
        }

        if (error) {
            if (hasAlreadyStoppedSignal(details)) {
                console.log(chalk.yellow("ℹ️ XAMPP appears to be already stopped."));
            } else if (details) {
                console.log(chalk.yellow("⚠️ XAMPP stop returned a non-zero exit code, but services are down."));
                console.log(chalk.yellow(details.trim()));
            }
        }

        console.log(chalk.green("✅ Stop XAMPP"));
    });
}

module.exports = {
    runMacXamppStart,
    runMacXamppStop
};
