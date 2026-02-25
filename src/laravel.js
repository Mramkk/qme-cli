const { execSync } = require("child_process");
const chalk = require("chalk");
const fs = require("fs");

function toStudlyModelName(input) {
    return String(input || "").replace(/(^|[\\/])([a-z])/g, (match, prefix, char) => {
        return `${prefix}${char.toUpperCase()}`;
    });
}

function runArtisan(args) {
    if (!fs.existsSync("artisan")) {
        console.log(chalk.red("❌ Laravel artisan file not found"));
        console.log(chalk.red("❌ Please run this cmds inside laravel project"));

        process.exit(1);
    }

    const finalArgs = Array.isArray(args) ? [...args] : [];

    if (finalArgs[0] === "make:model" && finalArgs[1] && !finalArgs[1].startsWith("-")) {
        finalArgs[1] = toStudlyModelName(finalArgs[1]);
    }

    const command = finalArgs.join(" ");

    try {
        console.log(chalk.cyan(`🚀 Running: php artisan ${command}\n`));
        execSync(`php artisan ${command}`, { stdio: "inherit" });
    } catch {
        console.log(chalk.red("❌ Artisan command failed"));
    }
}

module.exports = { runArtisan };
// laravel
