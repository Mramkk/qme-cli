import * as readline from "readline";
import chalk from "chalk";

function createRL() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

export function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createRL();
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function askCommitMessage(): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = createRL();
    rl.question(chalk.magenta("💬 Enter commit message: "), (msg) => {
      rl.close();
      if (!msg.trim()) reject(new Error("Commit message cannot be empty"));
      else resolve(msg.trim());
    });
  });
}

export function askFirstMenuAction(allowCommit = true, allowPull = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createRL();
    console.log();
    console.log(chalk.blue("🔹 Select an action:"));
    if (allowCommit) {
      console.log(chalk.green("  0) Commit"));
      console.log(chalk.green("  1) Stash"));
      console.log(chalk.green("  2) Branches"));
      console.log(chalk.green("  3) Abort"));
      rl.question(chalk.yellow("👉 Choose an option (0/1/2/3) [default: 0]: "), (answer) => {
        rl.close();
        const value = answer.trim();
        if (!value || value === "0") resolve("commit");
        else if (value === "1") resolve("stash");
        else if (value === "2") resolve("branches");
        else resolve("abort");
      });
      return;
    }
    if (allowPull) {
      console.log(chalk.green("  0) Pull"));
      console.log(chalk.green("  1) Change pull branch"));
      console.log(chalk.green("  2) Checkout new branch"));
      console.log(chalk.green("  3) Checkout branch"));
      console.log(chalk.green("  4) Reset hard"));
      console.log(chalk.green("  5) Merge branch"));
      console.log(chalk.green("  6) Delete branch"));
      console.log(chalk.green("  7) Abort"));
      rl.question(chalk.yellow("👉 Choose an option (0/1/2/3/4/5/6/7) [default: 0]: "), (answer) => {
        rl.close();
        const value = answer.trim();
        if (!value || value === "0") resolve("pull");
        else if (value === "1") resolve("change-pull-branch");
        else if (value === "2") resolve("checkout-new-branch");
        else if (value === "3") resolve("checkout");
        else if (value === "4") resolve("reset-hard-hash");
        else if (value === "5") resolve("merge-branch");
        else if (value === "6") resolve("delete-branch");
        else resolve("abort");
      });
      return;
    }
    console.log(chalk.green("  1) Stash"));
    console.log(chalk.green("  2) Abort"));
    rl.question(chalk.yellow("👉 Choose an option (1/2) [default: 2]: "), (answer) => {
      rl.close();
      const value = answer.trim();
      if (value === "1") resolve("stash");
      else resolve("abort");
    });
  });
}

export function askStashMessage(defaultMessage: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createRL();
    rl.question(chalk.magenta(`🗂️ Enter stash message [default: ${defaultMessage}]: `), (msg) => {
      rl.close();
      const value = msg.trim();
      resolve(value || defaultMessage);
    });
  });
}

export function askPostCommitAction(currentBranch: string, pullBranchRef: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createRL();
    console.log();
    rl.question(chalk.yellow("⬇️".padEnd(4, " ") + `Do you want to pull from branch (${pullBranchRef})? (y/N): `), (answer) => {
      rl.close();
      const value = answer.trim().toLowerCase();
      resolve(value === "y" || value === "yes" ? "pull" : "skip");
    });
  });
}

export function askAfterPullAction(currentBranch: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createRL();
    console.log();
    rl.question(chalk.yellow("⬆️".padEnd(4, " ") + `Do you want to push current branch (${currentBranch})? (y/N): `), (answer) => {
      const value = answer.trim().toLowerCase();
      if (value === "y" || value === "yes") {
        console.log();
        console.log(chalk.green("  1) Push"));
        console.log(chalk.green("  2) Force push"));
        console.log(chalk.green("  3) Abort"));
        rl.question(chalk.yellow("👉 Choose an option (1/2/3) [default: 1]: "), (choice) => {
          rl.close();
          const selected = choice.trim();
          if (!selected || selected === "1") resolve("push");
          else if (selected === "2") resolve("force-push");
          else resolve("abort");
        });
        return;
      }
      rl.close();
      resolve("skip");
    });
  });
}

export function askAfterPushMergeRequestAction(currentBranch: string, targetBranch: string): Promise<string> {
  const source = String(currentBranch || "").trim();
  const target = String(targetBranch || "").trim();
  if (!source || !target || source === target) return Promise.resolve("skip");
  return new Promise((resolve) => {
    const rl = createRL();
    console.log();
    rl.question(chalk.yellow("🔀".padEnd(4, " ") + `Generate merge request URL (${currentBranch} -> ${targetBranch}) and open in browser? (y/N): `), (answer) => {
      rl.close();
      const value = answer.trim().toLowerCase();
      resolve(value === "y" || value === "yes" ? "open" : "skip");
    });
  });
}

export function askStashMenuAction(stashCount: number): Promise<string> {
  return new Promise((resolve) => {
    const rl = createRL();
    console.log();
    console.log(chalk.blue(`🗂️ Stash entries found: ${stashCount}`));
    console.log(chalk.green("  0) Continue"));
    console.log(chalk.green("  1) Show stash list"));
    console.log(chalk.green("  2) Apply latest stash"));
    console.log(chalk.green("  3) Pop latest stash"));
    console.log(chalk.green("  4) Drop latest stash"));
    rl.question(chalk.yellow("👉 Choose an option (0/1/2/3/4) [default: 0]: "), (answer) => {
      rl.close();
      const value = answer.trim();
      if (!value || value === "0") resolve("continue");
      else if (value === "1") resolve("list");
      else if (value === "2") resolve("apply");
      else if (value === "3") resolve("pop");
      else if (value === "4") resolve("drop");
      else resolve("continue");
    });
  });
}

export function askResetMenuAction(): Promise<string> {
  return new Promise((resolve) => {
    const rl = createRL();
    console.log();
    console.log(chalk.blue("🔄 Reset menu:"));
    console.log(chalk.green("  0) Show git log"));
    console.log(chalk.green("  1) Reset --soft HEAD~1"));
    console.log(chalk.green("  2) Reset --mixed HEAD~1"));
    console.log(chalk.green("  3) Reset --hard HEAD~1"));
    console.log(chalk.green("  4) Abort"));
    rl.question(chalk.yellow("👉 Choose an option (0/1/2/3/4) [default: 4]: "), (answer) => {
      rl.close();
      const value = answer.trim();
      if (!value || value === "0") resolve("log");
      else if (value === "1") resolve("soft");
      else if (value === "2") resolve("mixed");
      else if (value === "3") resolve("hard");
      else resolve("abort");
    });
  });
}

// Keep the rest of the prompt helpers available in TS later; the existing CLI uses them.
export const askGitLogCommitSelection = async () => "";
export const askResetModeForCommit = async () => "";
export const askSshEmail = async () => "";
export const askSshTag = async () => "";
