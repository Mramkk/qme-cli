function createFlutterService({ spawnSync, chalk, askQuestion }) {
  function runFlutterCommand(flutterArgs) {
    const result = spawnSync("flutter", flutterArgs, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    if (result.error) {
      console.log(chalk.red("❌ Failed to run Flutter command"));
      console.log(chalk.yellow(result.error.message));
      process.exit(1);
    }

    process.exit(typeof result.status === "number" ? result.status : 0);
  }

  function printFlutterMenu() {
    console.log(chalk.blueBright("Flutter menu"));
    console.log(chalk.green("  1) App run"));
    console.log(chalk.green("  2) Run debug"));
    console.log(chalk.green("  3) Run release"));
    console.log(chalk.green("  4) List devices"));
    console.log(chalk.green("  5) Clean project"));
    console.log(chalk.green("  6) Build APK"));
    console.log(chalk.green("  7) Build App Bundle"));
    console.log(chalk.green("  8) Build Web"));
    console.log(chalk.green("  9) Build Windows"));
    console.log(chalk.green("  10) Build macOS"));
    console.log(chalk.green("  11) Build Linux"));
    console.log(chalk.green("  12) Build iOS"));
    console.log(chalk.gray("  You can also use: qme flutter run | build | devices | clean"));
  }

  async function runFlutterMenu() {
    printFlutterMenu();
    const choice = String(
      await askQuestion(chalk.yellow("👉 Choose option (1-12) [press Enter to abort]: ")),
    ).trim();

    if (!choice) {
      console.log(chalk.yellow("ℹ️ Flutter menu cancelled"));
      return;
    }

    const commands = {
      1: ["run"],
      2: ["run", "--debug"],
      3: ["run", "--release"],
      4: ["devices"],
      5: ["clean"],
      6: ["build", "apk"],
      7: ["build", "appbundle"],
      8: ["build", "web"],
      9: ["build", "windows"],
      10: ["build", "macos"],
      11: ["build", "linux"],
      12: ["build", "ios"],
    };

    if (!commands[choice]) {
      console.log(chalk.red("❌ Invalid selection"));
      process.exit(1);
    }

    runFlutterCommand(commands[choice]);
  }

  return { printFlutterMenu, runFlutterCommand, runFlutterMenu };
}

module.exports = { createFlutterService };
