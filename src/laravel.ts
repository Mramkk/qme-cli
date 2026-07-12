import { execSync } from "child_process";
import * as fs from "fs";
import chalk from "chalk";

function toStudlyModelName(input: string): string {
  return String(input || "").replace(/(^|[\\/])([a-z])/g, (match, prefix, char) => `${prefix}${char.toUpperCase()}`);
}

export function runArtisan(args: string[]): void {
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

