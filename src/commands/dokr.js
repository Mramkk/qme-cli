const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const { withSpinner } = require("../loading");

const DOCKER_ACTIONS = ["Containers", "Images", "Volumes", "Compose", "View logs", "Open shell"];
const COMPOSE_ACTIONS = ["Up", "Up -d", "Up --build", "Up --build -d", "Down"];

function printDokrMenu() {
  console.log();
  console.log(chalk.blue("🐳 Select Docker action:"));
  DOCKER_ACTIONS.forEach((action, index) => {
    console.log(chalk.green(`  ${index + 1}) ${action}`));
  });
}

function printComposeMenu() {
  console.log();
  console.log(chalk.blue("🐳 Select Compose action:"));
  COMPOSE_ACTIONS.forEach((action, index) => {
    console.log(chalk.green(`  ${index + 1}) ${action}`));
  });
}

function isDockerReady(spawnSync) {
  const result = spawnSync("docker", ["info"], {
    stdio: "ignore",
    shell: false,
  });
  return result.status === 0;
}

function getDockerDesktopPath() {
  const candidates = [
    process.env.ProgramFiles
      ? path.join(process.env.ProgramFiles, "Docker", "Docker", "Docker Desktop.exe")
      : null,
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "Docker", "Docker", "Docker Desktop.exe")
      : null,
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function ensureDockerReady(spawnSync, spawnProcess = spawnSync) {
  if (isDockerReady(spawnSync)) return true;

  if (process.platform !== "win32") {
    console.log(chalk.red("❌ Docker is not running. Start the Docker daemon and try again."));
    return false;
  }

  const dockerDesktopPath = getDockerDesktopPath();
  if (!dockerDesktopPath) {
    console.log(chalk.red("❌ Docker Desktop was not found on this computer."));
    return false;
  }

  console.log(chalk.yellow("🐳 Docker is not running. Starting Docker Desktop..."));
  const dockerDesktopProcess = spawnProcess(dockerDesktopPath, [], {
    stdio: "ignore",
    shell: false,
    detached: true,
    windowsHide: true,
  });
  dockerDesktopProcess?.unref?.();

  const ready = await withSpinner("Waiting for Docker Engine", async () => {
    for (let attempt = 0; attempt < 45; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (isDockerReady(spawnSync)) return true;
    }
    return false;
  });
  if (ready) {
    console.log(chalk.green("✅ Docker Engine is ready"));
    return true;
  }

  console.log(chalk.red("❌ Docker Engine did not become ready in time."));
  return false;
}

async function runDocker(spawnSync, args) {
  console.log(chalk.cyan(`🐳 Running: docker ${args.join(" ")}`));
  const result = spawnSync("docker", args, { stdio: "inherit", shell: false });
  if (result.error) {
    console.log(chalk.red("❌ Docker is not installed or is unavailable"));
  }
  return result;
}

function getRunningContainers(spawnSync) {
  const result = spawnSync("docker", ["ps", "--format", "{{.ID}}|{{.Names}}"], {
    encoding: "utf8",
    shell: false,
    stdio: ["ignore", "pipe", "ignore"],
  });

  if (result.error || result.status !== 0) return [];

  return String(result.stdout || "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [id, name] = line.split("|");
      return { id, name };
    })
    .filter((container) => container.id && container.name);
}

async function selectRunningContainer(askQuestion, spawnSync) {
  const containers = getRunningContainers(spawnSync);
  if (!containers.length) {
    console.log(chalk.yellow("ℹ️ No running containers found"));
    return null;
  }

  console.log();
  console.log(chalk.blue("🐳 Select a running container:"));
  containers.forEach((container, index) => {
    console.log(chalk.green(`  ${index + 1}) ${container.name} (${container.id})`));
  });

  const choice = await askQuestion(
    chalk.yellow(`👉 Choose a container (1/${containers.length}) [Enter to abort]: `),
  );
  const selected = Number.parseInt(choice, 10);
  if (!Number.isInteger(selected) || selected < 1 || selected > containers.length) {
    console.log(chalk.gray("⏹️ Container selection cancelled"));
    return null;
  }

  return containers[selected - 1].id;
}

async function runDokrCommand(args, { askQuestion, spawnSync, spawn }) {
  if (args[1]) {
    console.log(chalk.yellow("Usage: qme dokr"));
    return;
  }

  if (!(await ensureDockerReady(spawnSync, spawn))) return;

  printDokrMenu();
  const choice = await askQuestion(
    chalk.yellow("👉 Choose an option (1/2/3/4/5/6) [Enter to abort]: "),
  );
  const selected = Number.parseInt(choice, 10);

  if (!choice || selected === 0) {
    console.log(chalk.gray("⏹️ Docker menu cancelled"));
    return;
  }
  if (!Number.isInteger(selected) || selected < 1 || selected > DOCKER_ACTIONS.length) {
    console.log(chalk.red("❌ Invalid selection"));
    return;
  }

  if (selected === 1) return runDocker(spawnSync, ["ps", "-a"]);
  if (selected === 2) return runDocker(spawnSync, ["images"]);
  if (selected === 3) return runDocker(spawnSync, ["volume", "ls"]);
  if (selected === 4) {
    printComposeMenu();
    const composeChoice = await askQuestion(
      chalk.yellow("👉 Choose an option (1/2/3/4/5) [Enter to abort]: "),
    );
    const composeSelected = Number.parseInt(composeChoice, 10);

    if (!composeChoice || composeSelected === 0) {
      console.log(chalk.gray("⏹️ Compose menu cancelled"));
      return;
    }
    if (
      !Number.isInteger(composeSelected) ||
      composeSelected < 1 ||
      composeSelected > COMPOSE_ACTIONS.length
    ) {
      console.log(chalk.red("❌ Invalid selection"));
      return;
    }

    const composeArgsByOption = {
      1: ["compose", "up"],
      2: ["compose", "up", "-d"],
      3: ["compose", "up", "--build"],
      4: ["compose", "up", "--build", "-d"],
      5: ["compose", "down"],
    };
    const composeArgs = composeArgsByOption[composeSelected];
    await runDocker(spawnSync, composeArgs);
    return;
  }

  const container = await selectRunningContainer(askQuestion, spawnSync);
  if (!container) return;
  if (selected === 5) return runDocker(spawnSync, ["logs", "--tail", "100", container]);
  if (selected === 6) {
    printShellMenu();
    const shellChoice = await askQuestion(
      chalk.yellow("👉 Choose a shell (1/2) [Enter to abort]: "),
    );
    const shellSelected = Number.parseInt(shellChoice, 10);

    if (!shellChoice || shellSelected === 0) {
      console.log(chalk.gray("⏹️ Shell menu cancelled"));
      return;
    }
    if (shellSelected !== 1 && shellSelected !== 2) {
      console.log(chalk.red("❌ Invalid shell selection"));
      return;
    }

    const shell = shellSelected === 1 ? "bash" : "sh";
    return runDocker(spawnSync, ["exec", "-it", container, shell]);
  }
}

function printShellMenu() {
  console.log();
  console.log(chalk.blue("🐚 Select shell:"));
  console.log(chalk.green("  1) bash"));
  console.log(chalk.green("  2) sh"));
}

module.exports = { runDokrCommand, printDokrMenu };
