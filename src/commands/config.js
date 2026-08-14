const chalk = require("chalk");

async function runConfigCommand(
  args,
  {
    ensureConfigFile,
    tryOpenInVsCode,
    getConfigPath,
    exportConfig,
    getUpdateCheckSetting,
    setUpdateCheckSetting,
    getXamppPath,
    setXamppPath,
    clearXamppPath,
    getXamppCurrentVersion,
    setXamppCurrentVersion,
    clearXamppCurrentVersion,
    getProjectRepoUrl,
    setRemoteBranchForRepo,
    askQuestion,
    runUpdateFlow,
  },
) {
  if (args[0] !== "config") return false;

  if (args[1] === "branch") {
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
    console.log(
      chalk.green("✅ Remote branch for this project is now set to:"),
      chalk.cyan(branch),
    );
    return true;
  }

  if (!args[1]) {
    while (true) {
      console.log();
      console.log("QME Config");
      console.log("  1) Open");
      console.log("  2) Export");
      console.log("  3) Update");
      console.log("  4) Clear terminal");

      const choice = (await askQuestion("👉 Choose an option: ")).trim().toLowerCase();
      if (!choice || choice === "q" || choice === "quit" || choice === "exit") {
        return true;
      }

      if (choice === "1") {
        tryOpenInVsCode(ensureConfigFile(), "qme config file");
        continue;
      }
      if (choice === "2") {
        exportConfig(null);
        continue;
      }
      if (choice === "3") {
        await runUpdateFlow({ force: true });
        continue;
      }
      if (choice === "4") {
        console.clear();
        continue;
      }

      return true;
    }
  }

  if (args[1] === "export") {
    exportConfig(args[2] || null);
    return true;
  }

  if (args[1] === "auto-update" || args[1] === "update-check") {
    const option = String(args[2] || "show").toLowerCase();
    if (option === "show" || option === "--show" || option === "-s") {
      console.log(
        getUpdateCheckSetting()
          ? chalk.green("✅ Automatic updates are enabled")
          : chalk.yellow("ℹ️ Automatic updates are disabled"),
      );
      console.log(chalk.gray(`Config: ${getConfigPath()}`));
      return true;
    }
    if (["enable", "on", "true"].includes(option)) {
      setUpdateCheckSetting(true);
      console.log(chalk.green("✅ Automatic updates enabled"));
      console.log(chalk.gray(`Config: ${getConfigPath()}`));
      return true;
    }
    if (["disable", "off", "false"].includes(option)) {
      setUpdateCheckSetting(false);
      console.log(chalk.yellow("✅ Automatic updates disabled"));
      console.log(chalk.gray(`Config: ${getConfigPath()}`));
      return true;
    }
    console.log(chalk.red("❌ Use enable, disable, or --show"));
    console.log(chalk.yellow("Usage: qme config auto-update [enable|disable|--show]"));
    process.exit(1);
  }

  const isPath = args[1] === "xampp-path";
  const isVersion = args[1] === "xampp-v";
  if (isPath || isVersion) {
    const option = args[2];
    const getValue = isPath ? getXamppPath : getXamppCurrentVersion;
    const setValue = isPath ? setXamppPath : setXamppCurrentVersion;
    const clearValue = isPath ? clearXamppPath : clearXamppCurrentVersion;
    const label = isPath ? "XAMPP path" : "XAMPP current version";

    if (!option || option === "--show" || option === "-s") {
      const current = getValue();
      console.log(
        current
          ? chalk.green(`✅ ${label}: ${current}`)
          : chalk.yellow(`ℹ️ No ${label.toLowerCase()} set in config`),
      );
      return true;
    }
    if (option === "--clear") {
      clearValue();
      return true;
    }
    setValue(option);
    return true;
  }

  return false;
}

module.exports = { runConfigCommand };
