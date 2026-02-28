const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const chalk = require("chalk");
const {
  askFirstMenuAction,
  askCommitMessage,
  askStashMessage,
  askPostCommitAction,
  askAfterPullAction,
  askStashMenuAction,
  askResetMenuAction,
  askGitLogCommitSelection,
  askResetModeForCommit,
} = require("./prompts.js");
const {
  getGitUser,
  getProjectRepoUrl,
  getCurrentBranch,
} = require("./utils.js");
const { loadOrCreateRepoConfig } = require("./config.js");

const REMOTE = "origin";

function askQuestion(questionText) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(questionText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function normalizeRepoToHttpUrl(repoUrl) {
  const input = String(repoUrl || "").trim();
  if (!input) {
    return null;
  }

  let normalized = input;

  const scpLikeMatch = normalized.match(/^git@([^:]+):(.+)$/);
  if (scpLikeMatch) {
    normalized = `https://${scpLikeMatch[1]}/${scpLikeMatch[2]}`;
  }

  const sshProtocolMatch = normalized.match(/^ssh:\/\/git@([^/]+)\/(.+)$/);
  if (sshProtocolMatch) {
    normalized = `https://${sshProtocolMatch[1]}/${sshProtocolMatch[2]}`;
  }

  const gitProtocolMatch = normalized.match(/^git:\/\/([^/]+)\/(.+)$/);
  if (gitProtocolMatch) {
    normalized = `https://${gitProtocolMatch[1]}/${gitProtocolMatch[2]}`;
  }

  if (!/^https?:\/\//i.test(normalized)) {
    return null;
  }

  normalized = normalized.replace(/\.git$/i, "").replace(/\/+$/, "");
  return normalized;
}

function runGitOpen() {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
  } catch {
    console.log(chalk.red("❌ Not a Git repository"));
    process.exit(1);
  }

  const repoUrl = getProjectRepoUrl();
  if (!repoUrl) {
    console.log(chalk.red("❌ Could not determine repository URL"));
    process.exit(1);
  }

  const browserUrl = normalizeRepoToHttpUrl(repoUrl);
  if (!browserUrl) {
    console.log(chalk.red("❌ Unsupported remote URL format"));
    console.log(chalk.yellow(`Remote: ${repoUrl}`));
    process.exit(1);
  }

  try {
    if (process.platform === "win32") {
      execSync(`start "" "${browserUrl}"`, { stdio: "ignore", shell: true });
    } else if (process.platform === "darwin") {
      execSync(`open "${browserUrl.replace(/"/g, '\\"')}"`, {
        stdio: "ignore",
      });
    } else {
      execSync(`xdg-open "${browserUrl.replace(/"/g, '\\"')}"`, {
        stdio: "ignore",
      });
    }
    console.log(chalk.green("✅ Opened repository URL in browser"));
    console.log(chalk.cyan(browserUrl));
  } catch (error) {
    console.log(chalk.red("❌ Failed to open browser"));
    console.log(chalk.yellow(error.message));
    console.log(chalk.cyan(browserUrl));
    process.exit(1);
  }
}

async function runGitRemove() {
  const gitDir = path.join(process.cwd(), ".git");
  if (!fs.existsSync(gitDir)) {
    console.log(chalk.yellow("⚠️ No .git folder found in current project"));
    return;
  }

  const confirm = (
    await askQuestion(
      chalk.yellow(
        "⚠️ This will remove Git history for this project. Type YES to continue: ",
      ),
    )
  ).toUpperCase();

  if (confirm !== "YES") {
    console.log(chalk.gray("⏹️ Git remove aborted"));
    return;
  }

  try {
    fs.rmSync(gitDir, { recursive: true, force: true });
    console.log(chalk.green("✅ Removed .git folder from project"));
  } catch (error) {
    console.log(chalk.red("❌ Failed to remove .git folder"));
    console.log(chalk.yellow(error.message));
    process.exit(1);
  }
}

async function runGitSync() {
  /* ---------- ENSURE GIT REPO ---------- */
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
  } catch {
    console.log(chalk.red("❌ Not a Git repository"));
    process.exit(1);
  }

  const user = getGitUser("--local") ||
    getGitUser("--global") || { name: "Unknown", email: "unknown" };

  console.log(
    chalk.blueBright("📌 Git user:"),
    chalk.green(`${user.name} <${user.email}>`),
  );

  const repoUrl = getProjectRepoUrl();
  if (!repoUrl) {
    console.log(chalk.red("❌ Could not determine repository URL"));
    process.exit(1);
  }

  console.log(chalk.blueBright("🔗 Repo:"), chalk.cyan(repoUrl));

  const repoConfig = loadOrCreateRepoConfig(repoUrl);
  const currentBranch = getCurrentBranch();
  const remoteBranch = repoConfig.remoteBranch;

  console.log(
    chalk.blueBright("🌿 Current branch:"),
    chalk.green(currentBranch),
  );
  console.log(
    chalk.blueBright("⬇️".padEnd(4, " ") + "Pull branch:"),
    chalk.cyan(`${REMOTE}/${remoteBranch}`),
  );

  await maybeShowStashMenu();

  /* ---------- CHECK STATUS ---------- */
  const changes = execSync("git status --porcelain", {
    encoding: "utf8",
  }).trim();

  const localCommitCount = getLocalCommitCount(currentBranch);

  /* ==================================================
       ✅ NO LOCAL CHANGES
    ================================================== */
  if (!changes) {
    console.log();
    console.log(chalk.green("✅ No local changes"));
    console.log(
      chalk.yellow(`📦 ` + `Local commits : ${chalk.cyan(localCommitCount)}`),
    );

    // If commits exist, show pull as an explicit menu option.
    if (localCommitCount > 0) {
      const action = await askFirstMenuAction(false, true);
      await handleFirstMenuAction(action, remoteBranch, currentBranch);
      return;
    }

    // Otherwise show first menu
    const action = await askFirstMenuAction(false);
    await handleFirstMenuAction(action, remoteBranch, currentBranch);
    return;
  }

  /* ==================================================
       ⚠️ LOCAL CHANGES EXIST
    ================================================== */
  console.log();
  console.log(chalk.yellow("⚠️ Local changes detected:"));
  console.log(chalk.cyan(changes));

  const action = await askFirstMenuAction(true);
  await handleFirstMenuAction(action, remoteBranch, currentBranch);
}

/* ================= HELPERS ================= */

async function handleFirstMenuAction(action, remoteBranch, currentBranch) {
  if (action === "abort") {
    console.log(chalk.gray("⏹️".padEnd(4, " ") + "Aborted"));
    process.exit(0);
  }

  if (action === "stash") {
    await stashChanges(currentBranch);
    await showPullMenu(remoteBranch, currentBranch);
    return;
  }

  if (action === "pull") {
    await doPull(remoteBranch, currentBranch);
    return;
  }

  if (action === "log") {
    showLastCommits();
    process.exit(0);
  }

  if (action === "commit") {
    const message = await askCommitMessage();
    const didCommit = commitChanges(message);
    if (didCommit) {
      await showPullMenu(remoteBranch, currentBranch);
    }
  }
}

async function runGitReset() {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
  } catch {
    console.log(chalk.red("❌ Not a Git repository"));
    process.exit(1);
  }

  const action = await askResetMenuAction();

  if (action === "abort") {
    console.log(chalk.gray("⏹️".padEnd(4, " ") + "Aborted"));
    return;
  }

  if (action === "log") {
    showLastCommits();
    return;
  }

  const resetFlag =
    action === "soft" ? "--soft" : action === "mixed" ? "--mixed" : "--hard";
  try {
    execSync(`git reset ${resetFlag} HEAD~1`, { stdio: "inherit" });
    console.log(chalk.green(`✅ Reset complete (${resetFlag} HEAD~1)`));
  } catch (error) {
    console.log(chalk.red(`❌ Reset failed: ${formatGitError(error)}`));
    process.exit(1);
  }
}

async function runGitLogReset() {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
  } catch {
    console.log(chalk.red("❌ Not a Git repository"));
    process.exit(1);
  }

  const pageSize = 20;
  let offset = 0;
  let selectedCommit = null;

  while (!selectedCommit) {
    const page = getRecentCommitsPage(pageSize, offset);
    const commits = page.commits;

    if (commits.length === 0) {
      console.log(chalk.yellow("ℹ️ No commits found"));
      return;
    }

    const pageNumber = Math.floor(offset / pageSize) + 1;
    const pageStartIndex = offset + 1;
    const pageEndIndex = offset + commits.length;
    console.log();
    console.log(chalk.blue(`🧾 Recent commits (page ${pageNumber}):`));
    for (let i = 0; i < commits.length; i += 1) {
      const item = commits[i];
      console.log(
        chalk.green(`  ${offset + i + 1}) ${item.hash} ${item.subject}`),
      );
    }
    if (page.hasNext) {
      console.log(chalk.green("  n) next"));
    }
    if (page.hasPrev) {
      console.log(chalk.green("  p) previous"));
    }

    const selection = await askGitLogCommitSelection(
      pageStartIndex,
      pageEndIndex,
      {
        hasNext: page.hasNext,
        hasPrev: page.hasPrev,
      },
    );

    if (selection.type === "abort") {
      console.log(chalk.gray("⏹️".padEnd(4, " ") + "Aborted"));
      return;
    }

    if (selection.type === "next") {
      offset += pageSize;
      continue;
    }

    if (selection.type === "prev") {
      offset = Math.max(0, offset - pageSize);
      continue;
    }

    selectedCommit = commits[selection.index - pageStartIndex];
  }

  console.log();
  console.log(
    chalk.blue(`🔄 Selected: ${selectedCommit.hash} ${selectedCommit.subject}`),
  );
  const resetMode = await askResetModeForCommit();

  try {
    execSync(`git reset ${resetMode} ${selectedCommit.hash}`, {
      stdio: "inherit",
    });
    console.log(
      chalk.green(`✅ Reset complete (${resetMode} ${selectedCommit.hash})`),
    );
  } catch (error) {
    console.log(chalk.red(`❌ Reset failed: ${formatGitError(error)}`));
    process.exit(1);
  }
}

function getRecentCommitsPage(limit = 20, offset = 0) {
  try {
    const queryLimit = Math.max(1, limit + 1);
    const output = execSync(
      `git --no-pager log -${queryLimit} --skip=${Math.max(0, offset)} --pretty=format:%h%x09%s`,
      { encoding: "utf8" },
    ).trim();

    if (!output) {
      return {
        commits: [],
        hasNext: false,
        hasPrev: offset > 0,
      };
    }

    const all = output
      .split(/\r?\n/)
      .map((line) => {
        const [hash, ...subjectParts] = line.split("\t");
        return {
          hash: (hash || "").trim(),
          subject: subjectParts.join("\t").trim(),
        };
      })
      .filter((item) => Boolean(item.hash));
    return {
      commits: all.slice(0, limit),
      hasNext: all.length > limit,
      hasPrev: offset > 0,
    };
  } catch {
    return {
      commits: [],
      hasNext: false,
      hasPrev: offset > 0,
    };
  }
}

function getStashEntries() {
  try {
    const output = execSync("git stash list", { encoding: "utf8" }).trim();
    if (!output) {
      return [];
    }
    return output.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function hasWorkingTreeChanges() {
  try {
    const output = execSync("git status --porcelain", {
      encoding: "utf8",
    }).trim();
    return Boolean(output);
  } catch {
    return true;
  }
}

async function maybeShowStashMenu() {
  let stashEntries = getStashEntries();

  if (stashEntries.length === 0) {
    return;
  }

  while (stashEntries.length > 0) {
    const action = await askStashMenuAction(stashEntries.length);

    if (action === "continue") {
      return;
    }

    if (action === "list") {
      console.log();
      console.log(chalk.cyan(stashEntries.join("\n")));
      continue;
    }

    if ((action === "apply" || action === "pop") && hasWorkingTreeChanges()) {
      console.log(
        chalk.yellow(
          "⚠️ Cannot apply/pop stash while local changes exist. Commit, stash, or discard changes first.",
        ),
      );
      continue;
    }

    try {
      if (action === "apply") {
        execSync("git stash apply stash@{0}", { stdio: "inherit" });
        console.log(chalk.green("✅ Latest stash applied"));
      } else if (action === "pop") {
        execSync("git stash pop stash@{0}", { stdio: "inherit" });
        console.log(chalk.green("✅ Latest stash popped"));
      } else if (action === "drop") {
        execSync("git stash drop stash@{0}", { stdio: "inherit" });
        console.log(chalk.green("✅ Latest stash dropped"));
      }
    } catch (error) {
      console.log(
        chalk.red(`❌ Stash action failed: ${formatGitError(error)}`),
      );
    }

    stashEntries = getStashEntries();
  }
}

/* ---------- STASH ---------- */
async function stashChanges(currentBranch) {
  try {
    const stamp = new Date().toISOString().replace("T", " ").slice(0, 19);
    const defaultMessage = `mycli: ${currentBranch} @ ${stamp}`;
    const stashMessage = await askStashMessage(defaultMessage);
    execSync(`git stash push -u -m "${stashMessage.replace(/"/g, '\\"')}"`, {
      stdio: "inherit",
    });
    console.log(chalk.green("✅ Changes stashed"));
  } catch {
    console.log(chalk.red("❌ Failed to stash changes"));
    process.exit(1);
  }
}

/* ---------- COMMIT ---------- */
function commitChanges(message) {
  if (!hasWorkingTreeChanges()) {
    console.log(chalk.yellow("ℹ️ No local changes to commit"));
    return false;
  }

  const finalMessage = withTimestampPrefix(message);
  execSync("git add -A", { stdio: "ignore" });
  try {
    execSync(`git commit -m "${finalMessage.replace(/"/g, '\\"')}"`, {
      stdio: "inherit",
    });
    console.log(chalk.green("✅ Changes committed"));
    return true;
  } catch {
    console.log(chalk.red("❌ Commit failed"));
    return false;
  }
}

/* ---------- CHECK LOCAL COMMITS ---------- */
function getLocalCommitCount(currentBranch) {
  const upstreamRef = getUpstreamRef(currentBranch);

  try {
    const out = execSync(`git rev-list --count ${upstreamRef}..HEAD`, {
      encoding: "utf8",
    }).trim();
    return Number(out) || 0;
  } catch {
    return 0;
  }
}

function getUpstreamRef(currentBranch) {
  try {
    const out = execSync(
      `git for-each-ref --format="%(upstream:short)" refs/heads/${currentBranch}`,
      { encoding: "utf8" },
    ).trim();
    if (out) {
      return out;
    }
  } catch {
    // Fallback below.
  }

  return `${REMOTE}/${currentBranch}`;
}

function hasCommitsToPush(currentBranch) {
  try {
    const out = execSync(
      `git rev-list --count ${REMOTE}/${currentBranch}..HEAD`,
      { encoding: "utf8" },
    ).trim();
    return Number(out) > 0;
  } catch {
    return true;
  }
}

function formatGitError(error) {
  const stderr = String(error?.stderr || error?.message || "").trim();
  const text = stderr.toLowerCase();

  if (text.includes("refusing to merge unrelated histories")) {
    return "unrelated histories between local and remote";
  }

  if (
    text.includes("authentication failed") ||
    text.includes("permission denied") ||
    text.includes("could not read from remote repository")
  ) {
    return "authentication/permission issue";
  }

  if (
    text.includes("non-fast-forward") ||
    text.includes("fetch first") ||
    text.includes("rejected")
  ) {
    return "remote rejected (non-fast-forward)";
  }

  if (
    text.includes("could not resolve host") ||
    text.includes("failed to connect") ||
    text.includes("timed out") ||
    text.includes("network is unreachable")
  ) {
    return "network/connectivity issue";
  }

  const line = stderr.split(/\r?\n/).find(Boolean);
  return line || "unknown git error";
}

function withTimestampPrefix(message) {
  const text = String(message || "").trim();
  const existingPrefixPattern =
    /^@?\[[A-Za-z]{3} \d{4}-\d{2}-\d{2} \d{2}:\d{2}\]\s*/;
  if (existingPrefixPattern.test(text)) {
    return text;
  }

  const now = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const day = dayNames[now.getDay()];
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const hour24 = now.getHours();
  const hour12 = hour24 % 12 || 12;
  const hours = String(hour12).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const stamp = `[${day} ${year}-${month}-${date} ${hours}:${minutes}]`;

  return text ? `${stamp} ${text}` : stamp;
}

/* ---------- PULL | SKIP ---------- */
async function showPullMenu(remoteBranch, currentBranch) {
  const action = await askPostCommitAction(currentBranch, remoteBranch);

  if (action === "pull") {
    await doPull(remoteBranch, currentBranch);
  } else {
    console.log(chalk.gray("⏭️".padEnd(4, " ") + "Pull skipped"));
  }
}

/* ---------- PULL → PUSH | SKIP ---------- */
async function doPull(remoteBranch, currentBranch) {
  console.log(
    chalk.cyan(`⬇️`.padEnd(4, " ") + `Pulling ${REMOTE}/${remoteBranch}...`),
  );

  try {
    execSync(`git pull ${REMOTE} ${remoteBranch}`, { stdio: "inherit" });
    console.log(chalk.green("✅ Pull completed"));
  } catch (error) {
    console.log(chalk.red(`❌ Pull failed: ${formatGitError(error)}`));
    console.log(chalk.yellow(`ℹ️ If this is an unrelated history case, run:`));
    console.log(
      chalk.yellow(
        `   git pull ${REMOTE} ${remoteBranch} --allow-unrelated-histories --no-edit`,
      ),
    );
    return;
  }

  if (!hasCommitsToPush(currentBranch)) {
    console.log(chalk.gray("ℹ️ Nothing to push"));
    return;
  }

  const action = await askAfterPullAction(currentBranch);
  if (action !== "push") {
    console.log(chalk.gray("⏭️".padEnd(4, " ") + "Push skipped"));
    return;
  }

  try {
    execSync(`git push ${REMOTE} ${currentBranch}`, {
      stdio: "inherit",
    });
    console.log(chalk.green("✅ Push completed"));
  } catch (error) {
    console.log(chalk.red(`❌ Push failed: ${formatGitError(error)}`));
  }
}

/* ---------- LAST COMMITS TABLE ---------- */
function showLastCommits() {
  try {
    console.log();
    execSync("git --no-pager log -10 --decorate --oneline", {
      stdio: "inherit",
    });
  } catch {
    console.log(chalk.red("❌ Could not read git log"));
  }
}

// stash 1

module.exports = {
  runGitSync,
  runGitReset,
  runGitLogReset,
  runGitOpen,
  runGitRemove,
};
