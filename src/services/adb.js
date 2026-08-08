function createAdbService({ spawnSync, chalk }) {
  function resolveAdbExecutable() {
    const candidates = process.platform === "win32" ? ["adb.exe", "adb"] : ["adb"];
    for (const candidate of candidates) {
      const result = spawnSync(candidate, ["--version"], {
        stdio: "ignore",
        shell: process.platform === "win32",
      });
      if (!result.error && result.status === 0) return candidate;
    }
    console.log(chalk.red("❌ adb not found"));
    console.log(
      chalk.yellow("Install Android platform-tools and make sure `adb` is available in PATH."),
    );
    process.exit(1);
  }

  function runAdbCommand(adbPath, adbArgs, options = {}) {
    const { allowFailure = false, input = undefined, expectSuccessText = "" } = options;
    console.log(chalk.cyan(`▶ ${["adb", ...adbArgs].join(" ")}`));
    const result = spawnSync(adbPath, adbArgs, {
      encoding: "utf8",
      input,
      shell: process.platform === "win32",
      windowsHide: false,
    });

    if (result.stdout && String(result.stdout).trim()) console.log(String(result.stdout).trimEnd());
    if (result.stderr && String(result.stderr).trim())
      console.log(chalk.yellow(String(result.stderr).trimEnd()));

    const combinedOutput = `${result.stdout || ""}\n${result.stderr || ""}`;
    const hasExpectedSuccessText =
      !expectSuccessText || combinedOutput.toLowerCase().includes(expectSuccessText.toLowerCase());
    const outputIndicatesFailure =
      /failed|unable to|cannot|error:/i.test(combinedOutput) && !hasExpectedSuccessText;

    if (
      result.error ||
      (typeof result.status === "number" && result.status !== 0) ||
      outputIndicatesFailure
    ) {
      if (allowFailure) return { ok: false, result };
      const message = result.error
        ? result.error.message
        : `adb exited with status ${result.status}`;
      console.log(chalk.red(`❌ ${message}`));
      process.exit(typeof result.status === "number" ? result.status : 1);
    }

    return { ok: true, result };
  }

  function getAdbDeviceList(adbPath) {
    const { result } = runAdbCommand(adbPath, ["devices"]);
    return String(result.stdout || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(1)
      .map((line) => {
        const [serial = "", status = ""] = line.split(/\s+/);
        return { serial, status };
      })
      .filter((device) => device.serial);
  }

  return { getAdbDeviceList, resolveAdbExecutable, runAdbCommand };
}

module.exports = { createAdbService };
