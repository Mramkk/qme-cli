const chalk = require("chalk");

async function runLifecycleCommand(
  args,
  { runUpdateFlow, initializeRepo, getOptionValue, runXamppStop, runWindowsCommand },
) {
  if (args[0] === "update") {
    await runUpdateFlow({ force: true });
    return true;
  }
  if (args[0] === "git" && args[1] === "init") {
    await initializeRepo({ branch: getOptionValue(args, ["--branch", "-b"]), fullGitInit: true });
    return true;
  }
  if (args[0] === "init") {
    await initializeRepo({ branch: getOptionValue(args, ["--branch", "-b"]) });
    return true;
  }
  if (args[0] !== "quit") return false;

  if (process.platform !== "win32") {
    console.log(chalk.red("❌ This command is only available on Windows"));
    process.exit(1);
  }
  try {
    await runXamppStop({ strict: true, killDevProcesses: false });
  } catch {
    process.exit(1);
  }
  runWindowsCommand("quit");
  return true;
}

module.exports = { runLifecycleCommand };
