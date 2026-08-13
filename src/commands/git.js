const chalk = require("chalk");

async function runGitCommand(
  args,
  {
    runGitSync,
    runGitReset,
    runGitOpen,
    runGitRemove,
    runGitUserSwitch,
    runGitUserAdd,
    runGitUserRemove,
    selectGitUserForSsh,
    askQuestion,
    askSshTag,
    generateGitSshKey,
    updateSshConfig,
    getOptionValue,
    getProjectRepoUrl,
    setProjectIdForRepo,
  },
) {
  if (args[0] === "add" && args[1] === "git" && args[2] === "user") {
    await runGitUserAdd();
    return true;
  }

  if (args[0] === "gsync" || (args[0] === "git" && args[1] === "sync")) {
    await runGitSync();
    return true;
  }

  if (args[0] !== "git") {
    return false;
  }

  if (args[1] === "reset") {
    await runGitReset();
    return true;
  }

  if (args[1] === "open" || args[1] === "-o") {
    runGitOpen();
    return true;
  }

  if (args[1] === "remove") {
    await runGitRemove();
    return true;
  }

  if (
    args[1] === "repo" &&
    ((args[2] === "project" && args[3] === "id") ||
      args[2] === "project-id" ||
      args[2] === "project_id")
  ) {
    const rawProjectId = args[2] === "project" ? args[4] : args[3];
    const projectId = Number(rawProjectId);
    if (!rawProjectId || !Number.isInteger(projectId) || projectId <= 0) {
      console.log(chalk.red("❌ Valid numeric project ID required"));
      console.log(chalk.yellow("Usage: qme git repo project id <project-id>"));
      console.log(chalk.yellow("Alias: qme git repo project-id <project-id>"));
      process.exit(1);
    }
    const repoUrl = getProjectRepoUrl();
    if (!repoUrl) {
      console.log(chalk.red("❌ Not a git repository"));
      process.exit(1);
    }
    setProjectIdForRepo(repoUrl, projectId);
    console.log(
      chalk.green("✅ Project ID for this repository is now set to:"),
      chalk.cyan(String(projectId)),
    );
    return true;
  }

  const userAction = args[1] === "users" ? args[2] || "switch" : args[1] === "user" ? args[2] : "";

  if (userAction === "switch" || userAction === "add" || userAction === "remove") {
    if (userAction !== "switch") {
      await { add: runGitUserAdd, remove: runGitUserRemove }[userAction]();
      return true;
    }

    await runGitUserSwitch(async () => {
      const selectedUser = await selectGitUserForSsh();
      if (!selectedUser) {
        console.log(chalk.gray("⏹️ SSH key setup cancelled"));
        return;
      }

      const homeDir = getOptionValue(args, ["--home", "-H"]);
      const hostName =
        getOptionValue(args, ["--host", "-h"]) ||
        (await askQuestion(chalk.yellow("🌐 Enter SSH host name (for example: github.com): ")));
      let fileTag = getOptionValue(args, ["--tag", "-f"]);

      if (!hostName.trim()) {
        console.log(chalk.red("❌ SSH host name cannot be empty"));
        return;
      }
      if (!fileTag) fileTag = await askSshTag();

      const generatedKey = generateGitSshKey({
        homeDir,
        comment: selectedUser.email,
        fileTag,
        keyType: "ed25519",
      });
      const sshConfigPath = updateSshConfig({
        homeDir: generatedKey.homeDir,
        hostName,
        privateKeyPath: generatedKey.privateKeyPath,
      });
      console.log(
        sshConfigPath.created
          ? chalk.green("✅ SSH config profile created")
          : chalk.yellow("ℹ️ SSH host already exists; config was not changed"),
      );
      console.log(chalk.blueBright("📄 SSH config:"), chalk.cyan(sshConfigPath.configPath));
    });
    return true;
  }

  if (args[1] !== "ssh-key") {
    return false;
  }

  const selectedUser = await selectGitUserForSsh();
  if (!selectedUser) {
    console.log(chalk.gray("⏹️ SSH key setup cancelled"));
    return true;
  }

  const homeDir = getOptionValue(args, ["--home", "-H"]);
  const hostName =
    getOptionValue(args, ["--host", "-h"]) ||
    (await askQuestion(chalk.yellow("🌐 Enter SSH host name (for example: github.com): ")));
  let fileTag = getOptionValue(args, ["--tag", "-f"]);

  if (!hostName.trim()) {
    console.log(chalk.red("❌ SSH host name cannot be empty"));
    return true;
  }

  if (!fileTag) {
    fileTag = await askSshTag();
  }

  const generatedKey = generateGitSshKey({
    homeDir,
    comment: selectedUser.email,
    fileTag,
    keyType: "ed25519",
  });
  const sshConfigPath = updateSshConfig({
    homeDir: generatedKey.homeDir,
    hostName,
    privateKeyPath: generatedKey.privateKeyPath,
  });
  console.log(
    sshConfigPath.created
      ? chalk.green("✅ SSH config profile created")
      : chalk.yellow("ℹ️ SSH host already exists; config was not changed"),
  );
  console.log(chalk.blueBright("📄 SSH config:"), chalk.cyan(sshConfigPath.configPath));
  return true;
}

module.exports = { runGitCommand };
