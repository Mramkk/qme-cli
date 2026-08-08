const chalk = require("chalk");

async function runPemCommand({
  args,
  getOptionValue,
  askQuestion,
  parseFileUriToPath,
  fixPemPermissions,
}) {
  if (process.platform !== "win32") {
    console.log(chalk.red("❌ This command is only available on Windows"));
    process.exit(1);
  }

  let rawTarget = getOptionValue(args, ["--file", "-f"]);
  if (!rawTarget && args[1] && !String(args[1]).startsWith("-")) {
    rawTarget = args[1];
  }

  if (!rawTarget) {
    rawTarget = await askQuestion(chalk.magenta("🔑 Enter PEM file path: "));
  }

  const resolvedPath = parseFileUriToPath(rawTarget);
  if (!resolvedPath) {
    console.log(chalk.red("❌ Invalid PEM file path"));
    console.log(chalk.yellow('Usage: qme pem -f "C:\\path\\to\\file.pem"'));
    process.exit(1);
  }

  fixPemPermissions(resolvedPath);
}

module.exports = { runPemCommand };
