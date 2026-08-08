const chalk = require("chalk");

async function runWorkspace({
  baseDir,
  inspectRunEnvironment,
  getProjectTypeLabel,
  getPhpVersion,
  getLaravelVersion,
  printRunChecklist,
  waitForTcpPort,
  setLastRunProject,
  runCommandInDir,
  runNodeProjectMenu,
  isExecutableAvailable,
}) {
  const info = inspectRunEnvironment(baseDir);
  const projectType = getProjectTypeLabel(info.profile);
  const phpVersion = info.profile === "laravel" ? getPhpVersion(baseDir) : "";
  const laravelVersion = info.profile === "laravel" ? getLaravelVersion(baseDir) : "";

  console.log();
  console.log(chalk.blueBright("qme run"));
  console.log(chalk.gray(`Workspace: ${baseDir}`));
  console.log(chalk.green(`Detected: ${projectType}`));
  printRunChecklist(info.checks);

  if (info.profile === "laravel") {
    if (!isExecutableAvailable("php")) {
      console.log(chalk.red("❌ PHP was not found in PATH"));
      console.log(chalk.yellow("Install PHP or add it to PATH, then try again."));
      return;
    }

    const dbConnection = String(info.envValues.DB_CONNECTION || "mysql").toLowerCase();
    const dbHost = String(info.envValues.DB_HOST || "127.0.0.1").trim() || "127.0.0.1";
    const dbPort = Number.parseInt(info.envValues.DB_PORT || "3306", 10) || 3306;

    if (dbConnection === "mysql") {
      console.log(chalk.cyan(`Waiting for database ${dbHost}:${dbPort}...`));
      const dbReady = await waitForTcpPort(dbHost, dbPort, 45000, 1500);
      if (!dbReady) {
        console.log(chalk.red("❌ Database is not reachable yet"));
        console.log(chalk.yellow(`Expected MySQL on ${dbHost}:${dbPort}`));
        console.log(chalk.yellow("Start MySQL separately, or fix DB_HOST / DB_PORT in .env"));
        return;
      }
    }

    console.log(chalk.cyan("Starting Laravel server..."));
    setLastRunProject({ path: baseDir, type: projectType, phpVersion, laravelVersion });
    runCommandInDir("php", ["artisan", "serve"], baseDir);
    return;
  }

  if (info.profile === "flutter") {
    if (!isExecutableAvailable("flutter")) {
      console.log(chalk.red("❌ Flutter was not found in PATH"));
      console.log(chalk.yellow("Install Flutter or add it to PATH, then try again."));
      return;
    }
    console.log(chalk.cyan("Starting Flutter app..."));
    setLastRunProject({ path: baseDir, type: projectType });
    runCommandInDir("flutter", ["run"], baseDir);
    return;
  }

  if (["node", "nestjs", "angular", "react", "vite", "next"].includes(info.profile)) {
    await runNodeProjectMenu(info, baseDir, projectType);
    return;
  }

  console.log(chalk.yellow("ℹ️ Unknown project type"));
}

module.exports = { runWorkspace };
