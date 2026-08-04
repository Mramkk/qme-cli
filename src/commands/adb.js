const chalk = require("chalk");

async function runAdbCommand(
  args,
  {
    printAdbMenu,
    askQuestion,
    runAdbDevices,
    runAdbConnect,
    runAdbDisconnect,
    runAdbWifiConnect,
    getAdbSubcommands,
    printSuggestions,
  },
) {
  const subcommand = args[1];

  if (!subcommand) {
    printAdbMenu();
    const choice = (
      await askQuestion(chalk.yellow("👉 Choose an option (1/2/3) [default: abort]: "))
    ).trim();
    if (choice === "1") return runAdbDevices();
    if (choice === "2") return runAdbConnect();
    if (choice === "3") return runAdbDisconnect();
    if (!choice) {
      console.log(chalk.yellow("ℹ️ ADB menu cancelled"));
      return;
    }
    console.log(chalk.red("❌ Invalid selection"));
    return;
  }

  if (subcommand === "devices") return runAdbDevices();
  if (subcommand === "connect") return runAdbConnect(args[2]);
  if (subcommand === "disconnect") return runAdbDisconnect(args[2]);
  if (subcommand === "wifi" || subcommand === "setup") return runAdbWifiConnect();

  printAdbMenu();
  printSuggestions(subcommand, getAdbSubcommands(), {
    label: "ADB subcommand",
    prefix: "qme adb ",
  });
}

module.exports = { runAdbCommand };
