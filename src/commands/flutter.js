const chalk = require("chalk");

async function runFlutterCommand(
  args,
  { runFlutterMenu, runFlutterCommand, getFlutterSubcommands, printSuggestions },
) {
  const subcommand = args[1];

  if (!subcommand) {
    await runFlutterMenu();
    return;
  }

  const directCommands = {
    run: ["run"],
    debug: ["run", "--debug"],
    release: ["run", "--release"],
    devices: ["devices"],
    clean: ["clean"],
  };

  if (directCommands[subcommand]) {
    runFlutterCommand(directCommands[subcommand].concat(args.slice(2)));
    return;
  }

  if (subcommand === "build") {
    const target = String(args[2] || "apk").toLowerCase();
    const buildMap = {
      apk: ["build", "apk"],
      appbundle: ["build", "appbundle"],
      web: ["build", "web"],
      windows: ["build", "windows"],
      macos: ["build", "macos"],
      linux: ["build", "linux"],
      ios: ["build", "ios"],
    };

    if (!buildMap[target]) {
      console.log(chalk.red("❌ Unknown Flutter build target"));
      console.log(
        chalk.yellow("Usage: qme flutter build [apk|appbundle|web|windows|macos|linux|ios]"),
      );
      process.exit(1);
    }

    runFlutterCommand(buildMap[target].concat(args.slice(3)));
    return;
  }

  console.log(chalk.red("❌ Unknown Flutter subcommand"));
  console.log(chalk.yellow("Usage: qme flutter [run|debug|release|devices|clean|build]"));
  printSuggestions(subcommand, getFlutterSubcommands(), {
    label: "Flutter subcommand",
    prefix: "qme flutter ",
  });
  process.exit(1);
}

module.exports = { runFlutterCommand };
