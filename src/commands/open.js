const chalk = require("chalk");

function runOpenCommand(args, openUrl) {
  const url = args[1];
  if (!url) {
    console.log(chalk.red("❌ Usage: qme open <url>"));
    process.exit(1);
  }

  openUrl(url);
}

module.exports = { runOpenCommand };
