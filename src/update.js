const https = require("https");
const { spawnSync } = require("child_process");
const chalk = require("chalk");
const {
    getLastUpdateCheckTime,
    setLastUpdateCheckTime,
    getUpdateCheckSetting
} = require("./config.js");

function getLocalVersion() {
    try {
        const pkg = require("../package.json");
        return pkg.version || "0.0.0";
    } catch {
        return "0.0.0";
    }
}

function getLatestNpmVersion(timeoutMs = 1500) {
    return new Promise((resolve, reject) => {
        const req = https.get(
            "https://registry.npmjs.org/@ramkumarbedia/xqme/latest",
            { headers: { "User-Agent": "qme-cli-update-checker" } },
            (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Failed with status: ${res.statusCode}`));
                    return;
                }
                let data = "";
                res.on("data", (chunk) => {
                    data += chunk;
                });
                res.on("end", () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json.version);
                    } catch (e) {
                        reject(e);
                    }
                });
            }
        );
        req.on("error", reject);
        req.setTimeout(timeoutMs, () => {
            req.destroy();
            reject(new Error("Timeout"));
        });
    });
}

function isNewerVersion(current, latest) {
    const clean = (v) => String(v || "").replace(/^v/i, "").trim();
    const cParts = clean(current).split(/[.-]/).map(x => parseInt(x, 10) || 0);
    const lParts = clean(latest).split(/[.-]/).map(x => parseInt(x, 10) || 0);
    const maxLen = Math.max(cParts.length, lParts.length);
    for (let i = 0; i < maxLen; i++) {
        const c = cParts[i] || 0;
        const l = lParts[i] || 0;
        if (l > c) return true;
        if (c > l) return false;
    }
    return false;
}

async function runUpdateFlow({ force = false } = {}) {
    if (force) {
        console.log(chalk.cyan("🔍 Checking for updates..."));
    }

    try {
        const current = getLocalVersion();
        const latest = await getLatestNpmVersion(force ? 4000 : 1500);

        if (isNewerVersion(current, latest)) {
            console.log();
            console.log(chalk.green("🔄 A new version of qme is available!"));
            console.log(`${chalk.gray("Current version:")} v${current}`);
            console.log(`${chalk.green("Latest version :")} v${latest}`);
            console.log();

            console.log(chalk.cyan("🚀 Installing the latest version globally..."));
            const result = spawnSync("npm", ["install", "-g", "@ramkumarbedia/xqme"], {
                stdio: "inherit"
            });

            if (result.status === 0) {
                console.log(chalk.green("✅ Successfully updated to the latest version!"));
            } else {
                console.log(chalk.red("❌ Failed to update. Please try running manually: npm i -g @ramkumarbedia/xqme"));
            }
        } else if (force) {
            console.log(chalk.green(`✅ You are already on the latest version (v${current}).`));
        }
    } catch (error) {
        if (force) {
            console.log(chalk.red("❌ Error checking for updates."));
            console.log(chalk.yellow(error.message));
        }
    }
}

async function autoCheckUpdateOnStartup() {
    if (!getUpdateCheckSetting()) {
        return;
    }

    const lastCheck = getLastUpdateCheckTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (Date.now() - lastCheck < twentyFourHours) {
        return;
    }

    // Set the check time immediately to throttle repeated startups
    setLastUpdateCheckTime(Date.now());

    // Run the update flow
    await runUpdateFlow({ force: false });
}

module.exports = {
    runUpdateFlow,
    autoCheckUpdateOnStartup
};
