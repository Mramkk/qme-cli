const { spawnSync } = require("child_process");
const fs = require("fs");
const chalk = require("chalk");

function runIcacls(args) {
    const result = spawnSync("icacls.exe", args, {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        encoding: "utf8"
    });

    if (result.error) {
        console.log(chalk.red("❌ Failed to run icacls.exe"));
        console.log(chalk.yellow(result.error.message));
        process.exit(1);
    }

    if (typeof result.status === "number" && result.status !== 0) {
        const stdout = (result.stdout || "").trim();
        const stderr = (result.stderr || "").trim();
        if (stdout) {
            console.log(stdout);
        }
        if (stderr) {
            console.log(stderr);
        }
        process.exit(result.status);
    }
}

function fixPemPermissions(filePath) {
    if (process.platform !== "win32") {
        console.log(chalk.red("❌ `qme pem` is only available on Windows"));
        process.exit(1);
    }

    const cleanedPath = String(filePath || "")
        .trim()
        .replace(/^"+|"+$/g, "");

    if (!cleanedPath) {
        console.log(chalk.red("❌ Missing PEM file path"));
        process.exit(1);
    }

    if (!fs.existsSync(cleanedPath)) {
        console.log(chalk.red("❌ File not found"));
        console.log(chalk.yellow(cleanedPath));
        process.exit(1);
    }

    const userName =
        (process.env.USERNAME || process.env.UserName || "").trim() || "Administrator";

    runIcacls([cleanedPath, "/c", "/t", "/inheritance:d"]);
    runIcacls([cleanedPath, "/c", "/t", "/grant", `${userName}:F`]);
    runIcacls([
        cleanedPath,
        "/c",
        "/t",
        "/remove",
        "Administrator",
        "Authenticated Users",
        "BUILTIN\\Administrators",
        "BUILTIN",
        "Everyone",
        "System",
        "Users"
    ]);

    console.log(chalk.green("✅ Permission granted successfully"));
}

module.exports = {
    fixPemPermissions
};

