const chalk = require("chalk");

function handleCliError(error) {
  const message = error && error.message ? error.message : String(error);
  console.error(chalk.red(`❌ ${message}`));

  if (process.env.QME_VERBOSE === "1") {
    const stack = error && error.stack ? error.stack : "";
    if (stack) console.error(chalk.gray(stack));
  } else {
    console.error(chalk.gray("Run with QME_VERBOSE=1 for diagnostic details."));
  }

  process.exitCode = 1;
}

module.exports = { handleCliError };
