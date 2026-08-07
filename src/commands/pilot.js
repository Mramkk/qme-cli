const { execSync } = require("child_process");
const chalk = require("chalk");

function runPilotCommand({ inspectRunEnvironment, printRunChecklist }) {
  const baseDir = process.cwd();
  const info = inspectRunEnvironment(baseDir);

  console.log();
  console.log(chalk.blueBright("qme pilot"));
  console.log(chalk.gray(`Workspace: ${baseDir}`));
  console.log();
  console.log(chalk.green(`Project: ${info.profile}`));

  let gitBranch = "";
  try {
    gitBranch = execSync("git branch --show-current", {
      cwd: baseDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    // Git branch information is optional.
  }

  if (gitBranch) console.log(chalk.green(`Git branch: ${gitBranch}`));
  printRunChecklist(info.checks);

  const scripts = info.pkg?.scripts ? Object.keys(info.pkg.scripts) : [];
  if (scripts.length) {
    console.log(
      chalk.green(`Scripts: ${scripts.slice(0, 6).join(", ")}${scripts.length > 6 ? "..." : ""}`),
    );
  }
  console.log(
    chalk.green(
      `Env: ${info.hasEnv ? ".env found" : info.hasEnvExample ? ".env.example only" : "missing"}`,
    ),
  );
  if (info.nextStep) console.log(chalk.cyan(`Suggested start: ${info.nextStep}`));
  console.log();
}

module.exports = { runPilotCommand };
