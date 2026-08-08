const chalk = require("chalk");

async function runTimerCommand(args, runTimer) {
  const rest = args.slice(1);
  const popup = rest.includes("--popup") || rest.includes("-p");
  const cleaned = rest.filter((arg) => arg !== "--popup" && arg !== "-p");
  const minutes = Number(cleaned[0]);
  const label = cleaned.slice(1).join(" ").trim();

  if (!Number.isFinite(minutes) || minutes <= 0) {
    console.log(chalk.red("❌ Minutes must be a positive number"));
    console.log(chalk.yellow("Usage: qme timer <min> <label> [--popup|-p]"));
    process.exit(1);
  }

  try {
    await runTimer({ minutes, label, popup });
  } catch (error) {
    console.log(chalk.red("❌ Timer failed"));
    console.log(chalk.yellow(error?.message ? String(error.message) : String(error)));
    process.exit(1);
  }
}

module.exports = { runTimerCommand };
