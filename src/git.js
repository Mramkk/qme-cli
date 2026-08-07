const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const chalk = require("chalk");
const os = require("os");
const {
  askFirstMenuAction,
  askPushAction,
  askCommitMessage,
  askStashMessage,
  askPostCommitAction,
  askAfterPullAction,
  askAfterPushMergeRequestAction,
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
const { loadOrCreateRepoConfig, getGitUsers, addOrUpdateGitUser, removeGitUser, getConfigPath, setRemoteBranchForRepo, setProjectIdForRepo } = require("./config.js");

const REMOTE = "origin";

function isGitLabRepo(repoUrl) {
  const value = String(repoUrl || "").trim().toLowerCase();
  return value.includes("gitlab.") || value.includes("gitlab.com") || value.startsWith("git@gitlab:");
}

async function setGitLabProjectId(repoUrl) {
  while (true) {
    const rawProjectId = await askQuestion(chalk.magenta("🆔 Enter GitLab project ID: "));
    const projectId = Number(rawProjectId);

    if (Number.isInteger(projectId) && projectId > 0) {
      setProjectIdForRepo(repoUrl, projectId);
      return projectId;
    }

    console.log(chalk.red("❌ Valid numeric project ID required"));
  }
}

function normalizePullBranch(branch, currentBranch) {
  let normalized = String(branch || "").trim();

  if (normalized.toLowerCase().startsWith(`${REMOTE}/`)) {
    normalized = normalized.slice(REMOTE.length + 1);
  }

  // A stored value such as origin/origin is a duplicated remote name, not a branch.
  if (!normalized || normalized.toLowerCase() === REMOTE) {
    return currentBranch || "main";
  }

  return normalized;
}

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

async function askYesNo(question, defaultValue = true) {
  const hint = defaultValue ? "Y/n" : "y/N";
  const answer = (await askQuestion(`${question} (${hint}): `)).toLowerCase();

  if (!answer) {
    return defaultValue;
  }

  return answer === "y" || answer === "yes";
}

function getRemoteBranchOptions(remote = REMOTE) {
  try {
    const output = execSync(
      `git for-each-ref --sort=-committerdate --format=%(refname:short)%09%(committerdate:unix) refs/remotes/${remote}`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();

    if (!output) {
      return [];
    }

    const branches = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [refName, dateRaw] = line.split("\t");
        const fullRef = String(refName || "").trim();
        const shortName = fullRef.startsWith(`${remote}/`)
          ? fullRef.slice(remote.length + 1)
          : fullRef;
        return {
          name: shortName,
          label: shortName,
          sortDate: Number.parseInt(dateRaw, 10) || 0,
        };
      })
      .filter((branch) => branch.name && branch.name !== "HEAD");

    const seen = new Set();
    return branches.filter((branch) => {
      const key = branch.name.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  } catch {
    return [];
  }
}

async function askRemoteBranchSelection(branches, currentBranch) {
  if (branches.length === 0) {
    return null;
  }

  console.log();
  console.log(chalk.blue("🌿 Select remote branch:"));
  branches.forEach((branch, index) => {
    const active = branch.name === currentBranch ? " (current)" : "";
    console.log(chalk.green(`  ${index + 1}) ${branch.label}${active}`));
  });
  console.log(chalk.green(`  ${branches.length + 1}) Abort`));

  const answer = await askQuestion(
    chalk.yellow(`👉 Choose an option (1/${branches.length + 1}) [default: abort]: `),
  );
  const selected = Number.parseInt(answer, 10);

  if (!Number.isInteger(selected) || selected < 1 || selected > branches.length) {
    return null;
  }

  return branches[selected - 1];
}

async function changeRemoteBranch(repoUrl, currentBranch, currentRemoteBranch) {
  const branches = getRemoteBranchOptions(REMOTE);

  if (branches.length === 0) {
    console.log(chalk.yellow(`ℹ️ No remote branches found on ${REMOTE}`));
    return currentRemoteBranch;
  }

  const selected = await askRemoteBranchSelection(branches, currentRemoteBranch);
  if (!selected) {
    console.log(chalk.gray("⏹️".padEnd(4, " ") + "Remote branch change aborted"));
    return currentRemoteBranch;
  }

  setRemoteBranchForRepo(repoUrl, selected.name);
  console.log(chalk.green(`✅ Remote pull branch updated to: ${selected.name}`));
  if (currentBranch) {
    console.log(chalk.gray(`ℹ️ Current local branch: ${currentBranch}`));
  }
  return selected.name;
}

// eslint-disable-next-line no-unused-vars -- retained for future guided pull flows
function changePullBranchToSelectedBranch(repoUrl, currentBranch, selectedBranch) {
  const branchName = String(selectedBranch?.name || "").trim();
  if (!branchName) {
    console.log(chalk.yellow("ℹ️ No branch selected"));
    return;
  }

  setRemoteBranchForRepo(repoUrl, branchName);
  console.log(chalk.green(`✅ Remote pull branch updated to: ${branchName}`));
  if (currentBranch) {
    console.log(chalk.gray(`ℹ️ Current local branch: ${currentBranch}`));
  }
}

function getGlobalGitConfigValue(key) {
  try {
    return execSync(`git config --global --get ${key}`, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function setGlobalGitConfigValue(key, value) {
  const safeValue = String(value ?? "").replace(/"/g, '\\"');
  execSync(`git config --global ${key} "${safeValue}"`, { stdio: "ignore" });
}

function isInsideGitRepo() {
  try {
    const out = execSync("git rev-parse --is-inside-work-tree", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return out === "true";
  } catch {
    return false;
  }
}

function parseCredentialTarget(inputRaw) {
  const input = String(inputRaw || "").trim();
  if (!input) {
    return null;
  }

  // URL form
  if (input.includes("://")) {
    try {
      const url = new URL(input);
      const protocol = (url.protocol || "https:").replace(":", "");
      const host = url.hostname;
      if (!host) {
        return null;
      }
      const username = url.username ? decodeURIComponent(url.username) : "";
      const pathFromUrl = url.pathname ? String(url.pathname).replace(/^\/+/, "") : "";
      const pathValue = pathFromUrl && pathFromUrl !== "/" ? pathFromUrl : "";
      return { protocol: protocol || "https", host, username, path: pathValue };
    } catch {
      return null;
    }
  }

  // SCP-like SSH: git@host:owner/repo.git
  const scpMatch = input.match(/^git@([^:]+):(.+)$/);
  if (scpMatch) {
    return { protocol: "https", host: scpMatch[1], username: "", path: scpMatch[2] };
  }

  // ssh://git@host/owner/repo.git
  const sshMatch = input.match(/^ssh:\/\/git@([^/]+)\/(.+)$/);
  if (sshMatch) {
    return { protocol: "https", host: sshMatch[1], username: "", path: sshMatch[2] };
  }

  // Hostname only
  if (/^[a-z0-9.-]+$/i.test(input)) {
    return { protocol: "https", host: input, username: "", path: "" };
  }

  return null;
}

function rejectGitCredential(target) {
  const protocol = String(target?.protocol || "https").trim() || "https";
  const host = String(target?.host || "").trim();
  const username = String(target?.username || "").trim();
  const pathValue = String(target?.path || "").trim();
  if (!host) {
    throw new Error("Missing host for credential reject");
  }

  // Ask git to remove stored creds for this host via the configured credential helper.
  // https://git-scm.com/docs/git-credential
  const parts = [`protocol=${protocol}`, `host=${host}`];
  if (pathValue) {
    parts.push(`path=${pathValue}`);
  }
  if (username) {
    parts.push(`username=${username}`);
  }
  const input = `${parts.join("\n")}\n\n`;
  execSync("git credential reject", {
    input,
    stdio: ["pipe", "ignore", "ignore"],
  });
}

function tryGetStoredCredentialUsername(target) {
  const protocol = String(target?.protocol || "https").trim() || "https";
  const host = String(target?.host || "").trim();
  const pathValue = String(target?.path || "").trim();
  if (!host) {
    return "";
  }

  const parts = [`protocol=${protocol}`, `host=${host}`];
  if (pathValue) {
    parts.push(`path=${pathValue}`);
  }
  const input = `${parts.join("\n")}\n\n`;

  try {
    const output = execSync("git credential fill", {
      input,
      stdio: ["pipe", "pipe", "ignore"],
      encoding: "utf8",
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });

    const parsed = parseGitCredentialFillOutput(output);
    // Only trust username when a secret is present; otherwise it may come from the URL.
    if (!parsed.present) {
      return "";
    }
    return parsed.username || "";
  } catch {
    return "";
  }
}

function parseGitCredentialFillOutput(outputRaw) {
  const lines = String(outputRaw || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const findValue = (prefix) => {
    const line = lines.find((l) => l.toLowerCase().startsWith(prefix));
    return line ? line.slice(prefix.length).trim() : "";
  };

  const username = findValue("username=");
  const password = findValue("password=");
  const credential = findValue("credential=");

  // Consider a credential "present" only if a secret is returned.
  const present = Boolean(password || credential);
  return { present, username, password, credential };
}

function deleteMacKeychainInternetPassword(options = {}) {
  if (process.platform !== "darwin") {
    return { attempted: 0, deleted: 0 };
  }

  const host = String(options?.host || "").trim();
  const username = String(options?.username || "").trim();
  const protocol = String(options?.protocol || "").trim().toLowerCase();
  if (!host) {
    return { attempted: 0, deleted: 0 };
  }

  // `security delete-internet-password` can fail to match unless we include the exact account/protocol.
  // So: find one matching item, delete it, repeat until none remain.
  const protocolHints = [];
  if (protocol === "https") protocolHints.push("htps");
  if (protocol === "http") protocolHints.push("http");
  protocolHints.push("htps", "http", "");

  let attempted = 0;
  let deleted = 0;

  for (const hint of protocolHints) {
    while (true) {
      const findArgs = ["find-internet-password", "-s", host];
      if (username) {
        findArgs.push("-a", username);
      }
      if (hint) {
        findArgs.push("-r", hint);
      }

      attempted += 1;
      let foundOutput = "";
      try {
        foundOutput = execSync(
          `security ${findArgs.map((a) => `"${String(a).replace(/"/g, '\\"')}"`).join(" ")}`,
          { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" },
        );
      } catch {
        break;
      }

      const acctMatch = String(foundOutput).match(/"acct"<blob>="([^"]+)"/);
      const ptclMatch = String(foundOutput).match(/"ptcl"<uint32>="([^"]+)"/);
      const acct = acctMatch ? acctMatch[1] : username;
      const ptcl = ptclMatch ? ptclMatch[1] : (hint || "");

      const delArgs = ["delete-internet-password", "-s", host];
      if (acct) delArgs.push("-a", acct);
      if (ptcl) delArgs.push("-r", ptcl);

      try {
        execSync(
          `security ${delArgs.map((a) => `"${String(a).replace(/"/g, '\\"')}"`).join(" ")}`,
          { stdio: ["inherit", "ignore", "pipe"] },
        );
        deleted += 1;
      } catch {
        break;
      }
    }
  }

  return { attempted, deleted };
}

function deleteMacKeychainGenericPassword(options = {}) {
  if (process.platform !== "darwin") {
    return { attempted: 0, deleted: 0 };
  }

  const service = String(options?.service || "").trim();
  const username = String(options?.username || "").trim();
  if (!service) {
    return { attempted: 0, deleted: 0 };
  }

  // Same idea as internet passwords: find one, delete it, repeat.
  let attempted = 0;
  let deleted = 0;

  while (true) {
    const findArgs = ["find-generic-password", "-s", service];
    if (username) {
      findArgs.push("-a", username);
    }

    attempted += 1;
    let foundOutput = "";
    try {
      foundOutput = execSync(
        `security ${findArgs.map((a) => `"${String(a).replace(/"/g, '\\"')}"`).join(" ")}`,
        { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" },
      );
    } catch {
      break;
    }

    const acctMatch = String(foundOutput).match(/"acct"<blob>="([^"]+)"/);
    const acct = acctMatch ? acctMatch[1] : username;

    const delArgs = ["delete-generic-password", "-s", service];
    if (acct) delArgs.push("-a", acct);

    try {
      execSync(
        `security ${delArgs.map((a) => `"${String(a).replace(/"/g, '\\"')}"`).join(" ")}`,
        { stdio: ["inherit", "ignore", "pipe"] },
      );
      deleted += 1;
    } catch {
      break;
    }
  }

  return { attempted, deleted };
}

function deleteMacKeychainCredentialsBestEffort(options = {}) {
  if (process.platform !== "darwin") {
    return { attempted: 0, deleted: 0 };
  }

  const host = String(options?.host || "").trim();
  const protocol = String(options?.protocol || "").trim();
  if (!host) {
    return { attempted: 0, deleted: 0 };
  }

  const usernames = Array.isArray(options?.usernames)
    ? options.usernames.map((u) => String(u || "").trim()).filter(Boolean)
    : [];

  const uniqueUsernames = [...new Set(usernames)];
  let attempted = 0;
  let deleted = 0;

  // Prefer targeted deletes by username first (safer), then fall back to host-only.
  for (const user of uniqueUsernames) {
    const res = deleteMacKeychainInternetPassword({ host, username: user, protocol });
    attempted += res.attempted;
    deleted += res.deleted;
  }

  const resHostOnly = deleteMacKeychainInternetPassword({ host, protocol });
  attempted += resHostOnly.attempted;
  deleted += resHostOnly.deleted;

  // Also remove common generic-password items used by GCM / GitHub CLI.
  const services = [
    `gh:${host}`,
    `git:https://${host}`,
    `git:http://${host}`,
  ];
  for (const service of services) {
    const res = deleteMacKeychainGenericPassword({ service });
    attempted += res.attempted;
    deleted += res.deleted;
    for (const user of uniqueUsernames) {
      const resUser = deleteMacKeychainGenericPassword({ service, username: user });
      attempted += resUser.attempted;
      deleted += resUser.deleted;
    }
  }

  return { attempted, deleted };
}

function isCommandAvailable(command) {
  const safe = String(command || "").trim();
  if (!safe) {
    return false;
  }
  try {
    execSync(`command -v ${safe}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function isSshRemote(remoteUrl) {
  const raw = String(remoteUrl || "").trim();
  return /^git@/i.test(raw) || /^ssh:\/\//i.test(raw);
}

function gitCredentialEraseViaHelper(options = {}) {
  const helper = String(options?.helper || "").trim();
  const protocol = String(options?.protocol || "https").trim() || "https";
  const host = String(options?.host || "").trim();
  const username = String(options?.username || "").trim();
  const pathValue = String(options?.path || "").trim();
  if (!helper || !host) {
    return false;
  }

  // `git <helper> ...` resolves to `git-<helper>` on PATH.
  if (!isCommandAvailable(`git-${helper}`)) {
    return false;
  }

  const parts = [`protocol=${protocol}`, `host=${host}`];
  if (pathValue) parts.push(`path=${pathValue}`);
  if (username) parts.push(`username=${username}`);
  const input = `${parts.join("\n")}\n\n`;

  try {
    execSync(`git ${helper} erase`, {
      input,
      stdio: ["pipe", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

function getConfiguredCredentialHelpers() {
  // Includes system/global/local stack; we just want to know what may be active.
  try {
    const output = execSync("git config --get-all credential.helper", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const helpers = String(output || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return [...new Set(helpers)];
  } catch {
    return [];
  }
}

function parseStoreHelperFile(helperValue) {
  const raw = String(helperValue || "").trim();
  if (!raw) {
    return null;
  }
  const tokens = raw.split(/\s+/).filter(Boolean);
  if (tokens[0] !== "store") {
    return null;
  }

  // Default store file
  let filePath = path.join(os.homedir(), ".git-credentials");

  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "--file" && tokens[i + 1]) {
      filePath = tokens[i + 1];
      i += 1;
      continue;
    }
    const match = token.match(/^--file=(.+)$/);
    if (match) {
      filePath = match[1];
      continue;
    }
  }

  if (filePath.startsWith("~" + path.sep) || filePath === "~") {
    filePath = path.join(os.homedir(), filePath.slice(1));
  }

  return path.resolve(filePath);
}

function clearStoreCredentialsForHost(hostname) {
  const host = String(hostname || "").trim().toLowerCase();
  if (!host) {
    return { attempted: 0, removed: 0 };
  }

  const helpers = getConfiguredCredentialHelpers();
  const storeFiles = helpers
    .map(parseStoreHelperFile)
    .filter(Boolean);

  // If helper isn't configured, still consider default location (some users set it elsewhere,
  // but this covers the common case).
  if (storeFiles.length === 0) {
    storeFiles.push(path.join(os.homedir(), ".git-credentials"));
  }

  const uniqueFiles = [...new Set(storeFiles)];
  let attempted = 0;
  let removed = 0;

  for (const filePath of uniqueFiles) {
    attempted += 1;
    try {
      if (!fs.existsSync(filePath)) {
        continue;
      }
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");
      const kept = [];
      for (const line of lines) {
        const trimmed = String(line || "").trim();
        if (!trimmed) {
          continue;
        }
        try {
          const url = new URL(trimmed);
          if (String(url.hostname || "").toLowerCase() === host) {
            removed += 1;
          } else {
            kept.push(trimmed);
          }
        } catch {
          // Keep unparseable lines
          kept.push(trimmed);
        }
      }
      fs.writeFileSync(filePath, kept.join("\n") + (kept.length ? "\n" : ""), "utf8");
    } catch {
      // ignore
    }
  }

  return { attempted, removed };
}

function checkCredentialStillPresent(target) {
  const protocol = String(target?.protocol || "https").trim() || "https";
  const host = String(target?.host || "").trim();
  const pathValue = String(target?.path || "").trim();
  if (!host) {
    return { present: false, username: "" };
  }

  const parts = [`protocol=${protocol}`, `host=${host}`];
  if (pathValue) parts.push(`path=${pathValue}`);
  const input = `${parts.join("\n")}\n\n`;

  try {
    const output = execSync("git credential fill", {
      input,
      stdio: ["pipe", "pipe", "ignore"],
      encoding: "utf8",
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
    const parsed = parseGitCredentialFillOutput(output);
    return { present: parsed.present, username: parsed.username || "" };
  } catch {
    return { present: false, username: "" };
  }
}

function tryLogoutGh(host) {
  if (!host || !isCommandAvailable("gh")) {
    return false;
  }
  try {
    execSync(`gh auth logout -h "${String(host).replace(/"/g, '\\"')}" --yes`, {
      stdio: "inherit",
    });
    return true;
  } catch {
    return false;
  }
}

function tryClearSshAgent() {
  if (!isCommandAvailable("ssh-add")) {
    return false;
  }
  if (!process.env.SSH_AUTH_SOCK) {
    return false;
  }
  try {
    execSync("ssh-add -D", { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

function rejectGitCredentialBestEffort(options = {}) {
  const { hostTarget, originTarget } = options;
  const base = hostTarget && hostTarget.host ? hostTarget : null;
  if (!base) {
    throw new Error("Missing host target");
  }

  const discoverUsername = /^(1|true|yes)$/i.test(
    String(process.env.QME_DISCOVER_CREDENTIAL_USERNAME || "").trim(),
  );

  const protocol = String(base.protocol || "https").trim() || "https";
  const host = String(base.host || "").trim();
  const providedUsername = String(base.username || "").trim();
  const providedPath = String(base.path || "").trim();

  const originPath = String(originTarget?.path || "").trim();
  const originUsername = String(originTarget?.username || "").trim();

  // NOTE: `git credential fill` can trigger macOS Keychain "login required" prompts.
  // Keep it opt-in via env var.
  const discoveredHostUsername = discoverUsername
    ? tryGetStoredCredentialUsername({ protocol, host })
    : "";
  const discoveredOriginUsername =
    discoverUsername && originPath && originTarget && originTarget.host === host
      ? tryGetStoredCredentialUsername({ protocol, host, path: originPath })
      : "";

  const candidates = [];
  const add = (t) => {
    if (!t || !t.host) {
      return;
    }
    const key = [
      String(t.protocol || "https"),
      String(t.host || ""),
      String(t.path || ""),
      String(t.username || ""),
    ].join("|");
    if (!candidates.some((c) => c.__key === key)) {
      candidates.push({ ...t, __key: key });
    }
  };

  // Broad → specific.
  add({ protocol, host });
  if (originPath) add({ protocol, host, path: originPath });
  if (providedPath) add({ protocol, host, path: providedPath });
  if (discoveredHostUsername) add({ protocol, host, username: discoveredHostUsername });
  if (originUsername) add({ protocol, host, username: originUsername });
  if (providedUsername) add({ protocol, host, username: providedUsername });
  if (originPath && discoveredOriginUsername)
    add({ protocol, host, path: originPath, username: discoveredOriginUsername });
  if (originPath && discoveredHostUsername)
    add({ protocol, host, path: originPath, username: discoveredHostUsername });
  if (providedPath && discoveredHostUsername)
    add({ protocol, host, path: providedPath, username: discoveredHostUsername });

  let attempted = 0;
  let anyOk = false;
  for (const candidate of candidates) {
    attempted += 1;
    try {
      // eslint-disable-next-line no-unused-vars
      const { __key, ...clean } = candidate;
      rejectGitCredential(clean);
      anyOk = true;
    } catch {
      // keep going
    }
  }

  return {
    attempted,
    anyOk,
    discoveredHostUsername,
    discoveredOriginUsername,
  };
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

function encodeBranchPath(branchName) {
  return String(branchName || "")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildBranchBrowserUrl(repoBaseUrl, branchName) {
  const baseUrl = String(repoBaseUrl || "").trim().replace(/\/+$/, "");
  const branch = String(branchName || "").trim();
  if (!baseUrl || !branch || branch === "unknown") {
    return baseUrl;
  }

  const safeBranch = encodeBranchPath(branch);
  const lowerBase = baseUrl.toLowerCase();

  if (lowerBase.includes("bitbucket.org/")) {
    return `${baseUrl}/src/${safeBranch}`;
  }

  return `${baseUrl}/tree/${safeBranch}`;
}

function normalizeProjectId(projectId) {
  const parsed = Number(projectId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 0;
  }
  return parsed;
}

function buildGitLabMergeRequestUrl(repoUrl, sourceBranch, targetBranch, projectId) {
  const repoBaseUrl = normalizeRepoToHttpUrl(repoUrl);
  if (!repoBaseUrl) {
    return "";
  }

  const source = String(sourceBranch || "").trim();
  const target = String(targetBranch || "").trim();
  const pid = normalizeProjectId(projectId);
  if (!source || !target || !pid) {
    return "";
  }

  let hostname = "";
  try {
    hostname = new URL(repoBaseUrl).hostname.toLowerCase();
  } catch {
    return "";
  }

  if (!hostname.includes("gitlab")) {
    return "";
  }

  const params = new URLSearchParams();
  params.set("utf8", "✓");
  params.set("merge_request[source_project_id]", String(pid));
  params.set("merge_request[source_branch]", source);
  params.set("merge_request[target_project_id]", String(pid));
  params.set("merge_request[target_branch]", target);

  return `${repoBaseUrl}/merge_requests/new?${params.toString()}`;
}

function buildGitHubPullRequestUrl(repoUrl, sourceBranch, targetBranch) {
  const repoBaseUrl = normalizeRepoToHttpUrl(repoUrl);
  if (!repoBaseUrl) {
    return "";
  }

  const source = String(sourceBranch || "").trim();
  const target = String(targetBranch || "").trim();
  if (!source || !target) {
    return "";
  }

  let hostname = "";
  try {
    hostname = new URL(repoBaseUrl).hostname.toLowerCase();
  } catch {
    return "";
  }

  if (!hostname.includes("github.com")) {
    return "";
  }

  const base = encodeURIComponent(target);
  const compare = encodeURIComponent(source);
  return `${repoBaseUrl}/compare/${base}...${compare}?expand=1`;
}

function openUrlInBrowser(url) {
  if (process.platform === "win32") {
    execSync(`start "" "${url}"`, { stdio: "ignore", shell: true });
    return;
  }

  if (process.platform === "darwin") {
    execSync(`open "${url.replace(/"/g, '\\"')}"`, { stdio: "ignore" });
    return;
  }

  execSync(`xdg-open "${url.replace(/"/g, '\\"')}"`, { stdio: "ignore" });
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
  const currentBranch = getCurrentBranch();
  const branchUrl = buildBranchBrowserUrl(browserUrl, currentBranch);

  try {
    if (process.platform === "win32") {
      execSync(`start "" "${branchUrl}"`, { stdio: "ignore", shell: true });
    } else if (process.platform === "darwin") {
      execSync(`open "${branchUrl.replace(/"/g, '\\"')}"`, { stdio: "ignore" });
    } else {
      execSync(`xdg-open "${branchUrl.replace(/"/g, '\\"')}"`, { stdio: "ignore" });
    }
    console.log(chalk.green("✅ Opened repository branch URL in browser"));
    console.log(chalk.blueBright("🌿 Branch:"), chalk.green(currentBranch || "unknown"));
    console.log(chalk.cyan(branchUrl));
  } catch (error) {
    console.log(chalk.red("❌ Failed to open browser"));
    console.log(chalk.yellow(error.message));
    console.log(chalk.cyan(branchUrl));
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
  while (true) {
    await runGitSyncOnce();
  }
}

async function runGitSyncOnce() {
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
  const configuredRemoteBranch = repoConfig.remoteBranch;
  const remoteBranch = normalizePullBranch(configuredRemoteBranch, currentBranch);

  if (remoteBranch !== configuredRemoteBranch) {
    setRemoteBranchForRepo(repoUrl, remoteBranch);
  }

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

    // With a clean working tree, always allow pull from the first menu.
  const action = await askFirstMenuAction(false, true, isGitLabRepo(repoUrl));
  await handleFirstMenuAction(action, remoteBranch, currentBranch, repoUrl, repoConfig.project_id, false);
  return;
  }

  /* ==================================================
       ⚠️ LOCAL CHANGES EXIST
    ================================================== */
  console.log();
  console.log(chalk.yellow("⚠️ Local changes detected:"));
  console.log(chalk.cyan(changes));

  const action = await askFirstMenuAction(true);
  await handleFirstMenuAction(action, remoteBranch, currentBranch, repoUrl, repoConfig.project_id, true);
}

/* ================= HELPERS ================= */

async function handleFirstMenuAction(action, remoteBranch, currentBranch, repoUrl, projectId, hasLocalChanges) {
  if (action === "abort") {
    console.log(chalk.gray("⏹️".padEnd(4, " ") + "Aborted"));
    process.exit(0);
  }

  if (action === "stash") {
    await stashChanges(currentBranch);
    await showPullMenu(remoteBranch, currentBranch, repoUrl, projectId);
    return;
  }

  if (action === "pull") {
    await doPull(remoteBranch, currentBranch, repoUrl, projectId);
    return;
  }

  if (action === "push") {
    const pushAction = await askPushAction();
    try {
      if (pushAction === "force-push") {
        hardResetAndForcePush(currentBranch);
        console.log(chalk.green("✅ Force push completed"));
      } else {
        pushCurrentBranch(currentBranch);
        console.log(chalk.green("✅ Push completed"));
      }
    } catch (error) {
      console.log(chalk.red(`❌ ${pushAction === "force-push" ? "Force push" : "Push"} failed: ${formatGitError(error)}`));
    }
    return;
  }

  if (action === "set-project-id") {
    await setGitLabProjectId(repoUrl);
    return;
  }

  if (action === "log") {
    await showLastCommits();
    return;
  }

  if (action === "checkout") {
    await checkoutBranchFromMenu(currentBranch);
    return;
  }

  if (action === "checkout-new-branch") {
    await createBranchFromMenu(currentBranch);
    return;
  }

  if (action === "merge-branch") {
    await mergeBranchFromMenu(currentBranch);
    return;
  }

  if (action === "delete-branch") {
    await deleteBranchFromMenu(currentBranch);
    return;
  }

  if (action === "reset-hard-hash") {
    await resetHardToCommitHash(currentBranch);
    return;
  }

  if (action === "commit") {
    const message = await askCommitMessage();
    const didCommit = commitChanges(message);
    if (didCommit) {
      await showPullMenu(remoteBranch, currentBranch, repoUrl, projectId);
    }
    return;
  }

  if (action === "change-pull-branch") {
    const updatedBranch = await changeRemoteBranch(repoUrl, currentBranch, remoteBranch);
    await showPullMenu(updatedBranch, currentBranch, repoUrl, projectId);
    return;
  }
}

async function resetHardToCommitHash(currentBranch) {
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
    console.log(chalk.blue(`🧾 Select commit to hard reset ${currentBranch} to (page ${pageNumber}):`));
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

  const confirmed = await askYesNo(
    `⚠️ This will hard reset ${currentBranch} to ${selectedCommit.hash}. Continue?`,
    false,
  );

  if (!confirmed) {
    console.log(chalk.gray("⏹️".padEnd(4, " ") + "Aborted"));
    return;
  }

  try {
    execSync(`git reset --hard ${selectedCommit.hash}`, { stdio: "inherit" });
    console.log(chalk.green(`✅ Hard reset complete (${selectedCommit.hash})`));
  } catch (error) {
    console.log(chalk.red(`❌ Hard reset failed: ${formatGitError(error)}`));
    process.exit(1);
  }
}

function uniqueBranchOptions(options) {
  const seen = new Set();
  const result = [];

  for (const option of options) {
    const key = `${option.type}:${option.name}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(option);
  }

  return result;
}

function getCheckoutBranchOptions(currentBranch) {
  const options = [];

  try {
    const localOutput = execSync("git for-each-ref --sort=-committerdate --format=%(refname:short)%09%(committerdate:unix) refs/heads", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    localOutput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [branch, dateRaw] = line.split("\t");
        return {
          name: String(branch || "").trim(),
          sortDate: Number.parseInt(dateRaw, 10) || 0,
        };
      })
      .filter((branch) => branch.name && branch.name !== currentBranch)
      .forEach((branch) => {
        options.push({
          name: branch.name,
          label: branch.name,
          type: "local",
          sortDate: branch.sortDate,
        });
      });
  } catch {
    // Continue with remote branches if local branch listing fails.
  }

  return uniqueBranchOptions(options).sort((a, b) =>
    (b.sortDate - a.sortDate) ||
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }),
  );
}

async function askCheckoutBranchSelection(branches) {
  if (branches.length === 0) {
    return null;
  }

  console.log();
  console.log(chalk.blue("🌿 Select branch to checkout:"));
  branches.forEach((branch, index) => {
    console.log(chalk.green(`  ${index + 1}) ${branch.label}`));
  });
  console.log(chalk.green(`  ${branches.length + 1}) Abort`));

  const answer = await askQuestion(
    chalk.yellow(`👉 Choose an option (1/${branches.length + 1}) [default: abort]: `),
  );
  const selected = Number.parseInt(answer, 10);

  if (!Number.isInteger(selected) || selected < 1 || selected > branches.length) {
    return null;
  }

  return branches[selected - 1];
}

// eslint-disable-next-line no-unused-vars -- retained for the legacy branch menu
async function askBranchSelectionMenu(currentBranch) {
  const branches = getCheckoutBranchOptions(currentBranch);
  if (branches.length === 0) {
    console.log(chalk.yellow("ℹ️ No other local branches found"));
    return null;
  }

  console.log();
  console.log(chalk.blue("🌿 Local branches:"));
  branches.forEach((branch, index) => {
    console.log(chalk.green(`  ${index + 1}) ${branch.label}`));
  });
  console.log(chalk.green(`  ${branches.length + 1}) Abort`));

  const answer = await askQuestion(
    chalk.yellow(`👉 Choose a branch (1/${branches.length + 1}) [default: abort]: `),
  );
  const selected = Number.parseInt(answer, 10);

  if (!Number.isInteger(selected) || selected < 1 || selected > branches.length) {
    return null;
  }

  return branches[selected - 1];
}

async function askNewBranchName(currentBranch) {
  const answer = await askQuestion(
    chalk.yellow(`🌱 Enter new branch name (from ${currentBranch}): `),
  );
  return String(answer || "").trim();
}

async function checkoutBranchFromMenu(currentBranch) {
  const branches = getCheckoutBranchOptions(currentBranch);

  if (branches.length === 0) {
    console.log(chalk.yellow("ℹ️ No other local branches found"));
    return;
  }

  const selected = await askCheckoutBranchSelection(branches);
  if (!selected) {
    console.log(chalk.gray("⏹️".padEnd(4, " ") + "Checkout aborted"));
    return;
  }

  const args = ["checkout", selected.name];

  const result = spawnSync("git", args, { stdio: "inherit", shell: false });
  if (result.error) {
    console.log(chalk.red("❌ Checkout failed"));
    console.log(chalk.yellow(result.error.message));
    process.exit(1);
  }

  if (typeof result.status === "number" && result.status !== 0) {
    console.log(chalk.red("❌ Checkout failed"));
    process.exit(result.status);
  }

  console.log(chalk.green(`✅ Checked out branch: ${selected.name}`));
}

async function createBranchFromMenu(currentBranch) {
  const branchName = await askNewBranchName(currentBranch);
  if (!branchName) {
    console.log(chalk.gray("⏹️".padEnd(4, " ") + "Branch creation aborted"));
    return;
  }

  const result = spawnSync("git", ["checkout", "-b", branchName], {
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.log(chalk.red("❌ Branch creation failed"));
    console.log(chalk.yellow(result.error.message));
    process.exit(1);
  }

  if (typeof result.status === "number" && result.status !== 0) {
    console.log(chalk.red("❌ Branch creation failed"));
    process.exit(result.status);
  }

  console.log(chalk.green(`✅ Created new branch: ${branchName}`));
}

async function mergeBranchFromMenu(currentBranch) {
  const branches = getCheckoutBranchOptions(currentBranch);
  const selected = await askCheckoutBranchSelection(branches);
  if (!selected) {
    console.log(chalk.gray("⏹️".padEnd(4, " ") + "Merge aborted"));
    return;
  }

  const result = spawnSync("git", ["merge", "--no-edit", selected.name], {
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.log(chalk.red("❌ Merge failed"));
    console.log(chalk.yellow(result.error.message));
    process.exit(1);
  }

  if (typeof result.status === "number" && result.status !== 0) {
    console.log(chalk.red("❌ Merge failed"));
    process.exit(result.status);
  }

  console.log(chalk.green(`✅ Merged branch: ${selected.name}`));
}

async function deleteBranchFromMenu(currentBranch) {
  const branches = getCheckoutBranchOptions(currentBranch);
  const selected = await askCheckoutBranchSelection(branches);
  if (!selected) {
    console.log(chalk.gray("⏹️".padEnd(4, " ") + "Delete aborted"));
    return;
  }

  const result = spawnSync("git", ["branch", "-d", selected.name], {
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.log(chalk.red("❌ Delete failed"));
    console.log(chalk.yellow(result.error.message));
    process.exit(1);
  }

  if (typeof result.status === "number" && result.status !== 0) {
    console.log(chalk.red("❌ Delete failed"));
    process.exit(result.status);
  }

  console.log(chalk.green(`✅ Deleted branch: ${selected.name}`));
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
    await showLastCommits();
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

// eslint-disable-next-line no-unused-vars -- retained for the legacy log-reset flow
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

  const finalMessage = withoutTimestampPrefix(message);
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
      stdio: ["ignore", "pipe", "ignore"],
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

function hasConfiguredUpstream(currentBranch) {
  try {
    const out = execSync(
      `git for-each-ref --format="%(upstream:short)" refs/heads/${currentBranch}`,
      { encoding: "utf8" },
    ).trim();
    return Boolean(out);
  } catch {
    return false;
  }
}

function isMissingUpstreamError(error) {
  const text = String(
    error?.stderr || error?.stdout || error?.message || "",
  ).toLowerCase();

  return (
    text.includes("has no upstream branch") ||
    text.includes("no upstream branch") ||
    text.includes("--set-upstream")
  );
}

function pushCurrentBranch(currentBranch) {
  if (!hasConfiguredUpstream(currentBranch)) {
    console.log(
      chalk.yellow(
        `ℹ️ No upstream configured. Setting ${REMOTE}/${currentBranch} as upstream...`,
      ),
    );
    execSync(`git push --set-upstream ${REMOTE} ${currentBranch}`, {
      stdio: "inherit",
    });
    return;
  }

  try {
    execSync(`git push ${REMOTE} ${currentBranch}`, {
      stdio: ["inherit", "inherit", "pipe"],
    });
  } catch (error) {
    if (!isMissingUpstreamError(error)) {
      throw error;
    }

    console.log(
      chalk.yellow(
        `ℹ️ Push needs an upstream. Retrying with ${REMOTE}/${currentBranch}...`,
      ),
    );
    execSync(`git push --set-upstream ${REMOTE} ${currentBranch}`, {
      stdio: "inherit",
    });
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

function withoutTimestampPrefix(message) {
  const text = String(message || "").trim();
  const existingPrefixPattern =
    /^@?\[[A-Za-z]{3} \d{4}-\d{2}-\d{2} \d{2}:\d{2}\]\s*/;
  if (existingPrefixPattern.test(text)) {
    return text;
  }

  return text;
}

/* ---------- PULL | SKIP ---------- */
async function showPullMenu(remoteBranch, currentBranch, repoUrl, projectId) {
  const action = await askPostCommitAction(currentBranch, remoteBranch);

  if (action === "pull") {
    await doPull(remoteBranch, currentBranch, repoUrl, projectId);
  } else {
    console.log(chalk.gray("⏭️".padEnd(4, " ") + "Pull skipped"));
  }

}

/* ---------- PULL → PUSH | SKIP ---------- */
async function doPull(remoteBranch, currentBranch, repoUrl, projectId) {
  console.log(
    chalk.cyan(`⬇️`.padEnd(4, " ") + `Pulling ${REMOTE}/${remoteBranch}...`),
  );

  try {
    execSync(`git pull ${REMOTE} ${remoteBranch}`, { stdio: "inherit" });
    console.log(chalk.green("✅ Pull completed"));
  } catch (error) {
    console.log(chalk.red(`❌ Pull failed: ${formatGitError(error)}`));
    return;
  }

  const action = await askAfterPullAction(currentBranch);
  if (action === "skip") {
    console.log(chalk.gray("⏭️".padEnd(4, " ") + "Push skipped"));
    return;
  }

  try {
    if (action === "force-push") {
      hardResetAndForcePush(currentBranch);
      console.log(chalk.green("✅ Force push completed"));
    } else {
      pushCurrentBranch(currentBranch);
      console.log(chalk.green("✅ Push completed"));
    }
    await maybeOpenMergeRequestUrl(repoUrl, currentBranch, remoteBranch, projectId);
  } catch (error) {
    console.log(chalk.red(`❌ ${action === "force-push" ? "Force push" : "Push"} failed: ${formatGitError(error)}`));
  }
}

function hardResetAndForcePush(currentBranch) {
  console.log(
    chalk.yellow(
      `⚠️ Force pushing local branch ${currentBranch} without pulling or resetting...`,
    ),
  );
  execSync(`git push --force-with-lease ${REMOTE} ${currentBranch}`, { stdio: "inherit" });
}

async function maybeOpenMergeRequestUrl(repoUrl, sourceBranch, targetBranch, projectId) {
  const action = await askAfterPushMergeRequestAction(sourceBranch, targetBranch);
  if (action !== "open") {
    // console.log(chalk.gray("⏭️".padEnd(4, " ") + "Merge request URL skipped"));
    return;
  }

  const repoBaseUrl = normalizeRepoToHttpUrl(repoUrl);
  if (!repoBaseUrl) {
    console.log(chalk.yellow("⚠️ Could not build merge request URL for this repository."));
    return;
  }

  let hostname = "";
  try {
    hostname = new URL(repoBaseUrl).hostname.toLowerCase();
  } catch {
    return;
  }

  const normalizedProjectId = normalizeProjectId(projectId);
  let mergeRequestUrl = "";
  if (hostname.includes("gitlab")) {
    mergeRequestUrl = buildGitLabMergeRequestUrl(
      repoUrl,
      sourceBranch,
      targetBranch,
      normalizedProjectId,
    );
  } else if (hostname.includes("github.com")) {
    mergeRequestUrl = buildGitHubPullRequestUrl(
      repoUrl,
      sourceBranch,
      targetBranch,
    );
  } else {
    console.log(chalk.yellow("⚠️ Could not build merge request URL for this repository."));
    console.log(chalk.yellow("This flow currently supports GitLab and GitHub remotes."));
    return;
  }

  if (!mergeRequestUrl) {
    console.log(chalk.yellow("⚠️ Could not build merge request URL for this repository."));
    if (hostname.includes("gitlab")) {
      console.log(chalk.yellow("For GitLab, set a valid project_id in repo config."));
    } else {
      console.log(chalk.yellow("This flow currently supports GitLab and GitHub remotes."));
    }
    return;
  }

  try {
    openUrlInBrowser(mergeRequestUrl);
    console.log(chalk.green("✅ Opened merge request URL in browser"));
    console.log(chalk.cyan(mergeRequestUrl));
  } catch (error) {
    console.log(chalk.red("❌ Failed to open merge request URL in browser"));
    console.log(chalk.yellow(error.message));
    console.log(chalk.cyan(mergeRequestUrl));
  }
}

/* ---------- COMMIT LOG ---------- */
async function showLastCommits() {
  try {
    const authorResult = spawnSync("git", ["log", "--date-order", "--format=%an%x09%ae"], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (authorResult.error || authorResult.status !== 0) return;
    const authorOutput = authorResult.stdout;
    const authors = [];
    const seenAuthors = new Set();

    String(authorOutput)
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((line) => {
        const [name, email] = line.split("\t");
        const key = `${name}\t${email}`.toLowerCase();
        if (!seenAuthors.has(key)) {
          seenAuthors.add(key);
          authors.push({ name, email });
        }
      });

    console.log();
    console.log(chalk.blue("👤 Select log author:"));
    console.log(chalk.green("  1) All authors"));
    authors.forEach((author, index) => {
      console.log(chalk.green(`  ${index + 2}) ${author.name} <${author.email}>`));
    });
    console.log(chalk.green("  q) Back"));

    const answer = (await askQuestion("👉 Choose an author: ")).trim().toLowerCase();
    if (!answer || answer === "q" || answer === "back") return;

    const selectedIndex = Number.parseInt(answer, 10);
    if (selectedIndex === 1) {
      renderCommitLog();
      return;
    }

    const selectedAuthor = authors[selectedIndex - 2];
    if (!selectedAuthor) {
      console.log(chalk.yellow("⚠️ Invalid author selection"));
      return;
    }

    renderCommitLog(`${selectedAuthor.name} <${selectedAuthor.email}>`);
  } catch {
    return;
  }
}

function renderCommitLog(author) {
  try {
    const args = [
      "log",
      "--reverse",
      "--date-order",
      "--date=format:%a %b %d %H:%M:%S %Y %z",
      "--pretty=format:%H%x09%an%x09%ae%x09%ad%x09%s%x09%D",
    ];
    if (author) args.push(`--author=${author}`);

    const result = spawnSync(
      "git",
      args,
      { encoding: "utf8", windowsHide: true },
    );

    if (result.error || result.status !== 0) return;

    console.log();
    console.log(chalk.blueBright("📜 Git commit log"));
    console.log(chalk.gray("─".repeat(56)));

    String(result.stdout || "")
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((line, index) => {
        const [hash, author, email, date, subject] = line.split("\t");

        console.log(`${index + 1}) ${chalk.yellow(hash.slice(0, 8))}  ${subject}`);
        console.log(`   👤 ${author} <${email}>`);
        console.log(`   📅 ${date}`);
        console.log();
      });
  } catch {}
}

// stash 1

async function runGitUserAdd() {
  const name = await askQuestion(chalk.yellow("👤 Enter name (git user.name): "));
  const email = await askQuestion(chalk.yellow("📧 Enter email (git user.email): "));

  if (!name || !email) {
    console.log(chalk.red("❌ Name and email are required"));
    process.exit(1);
  }

  const existing = getGitUsers();
  const emailKey = String(email).trim().toLowerCase();
  const already = existing.find(u => String(u.email).trim().toLowerCase() === emailKey);

  if (already) {
    const shouldUpdate = await askYesNo(
      chalk.yellow(`⚠️ A saved user already exists for ${already.email}. Update it?`),
      true,
    );
    if (!shouldUpdate) {
      console.log(chalk.yellow("⚠️ Skipped updating saved git user"));
      return;
    }
  }

  const ok = addOrUpdateGitUser({ name, email });
  if (!ok) {
    console.log(chalk.red("❌ Failed to save git user"));
    process.exit(1);
  }

  console.log(chalk.green("✅ Saved git user"));
  console.log(chalk.blueBright("👤"), chalk.green(`${name} <${email}>`));
  console.log(chalk.blueBright("📄 Config:"), chalk.cyan(getConfigPath()));
}
async function runGitUserRemove() {
  const savedUsers = getGitUsers();

  if (savedUsers.length === 0) {
    console.log(chalk.yellow("ℹ️ No saved git users found."));
    console.log(chalk.blueBright("📄 Config:"), chalk.cyan(getConfigPath()));
    return;
  }

  console.log();
  console.log(chalk.blueBright("👥 Saved git users:"));
  console.log(chalk.green("  0) Cancel"));
  savedUsers.forEach((user, index) => {
    console.log(chalk.green(`  ${index + 1}) ${user.name} <${user.email}>`));
  });

  const answer = await askQuestion(
    chalk.yellow(`🗑️ Choose user to remove (0-${savedUsers.length}) [default: 0]: `),
  );
  const selectedIndex = answer ? Number.parseInt(answer, 10) : 0;

  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > savedUsers.length) {
    console.log(chalk.yellow("⚠️ Invalid selection. Nothing removed."));
    return;
  }

  if (selectedIndex === 0) {
    console.log(chalk.yellow("ℹ️ Cancelled."));
    return;
  }

  const selectedUser = savedUsers[selectedIndex - 1];
  const confirmed = await askYesNo(
    chalk.yellow(`🗑️ Remove ${selectedUser.name} <${selectedUser.email}> from saved users?`),
    false,
  );

  if (!confirmed) {
    console.log(chalk.yellow("⚠️ Skipped removing saved git user"));
    return;
  }

  const ok = removeGitUser(selectedUser.email);
  if (!ok) {
    console.log(chalk.red("❌ Failed to remove saved git user"));
    process.exit(1);
  }

  console.log(chalk.green("✅ Removed saved git user"));
  console.log(chalk.blueBright("👤"), chalk.green(`${selectedUser.name} <${selectedUser.email}>`));
  console.log(chalk.blueBright("📄 Config:"), chalk.cyan(getConfigPath()));
}

async function runGitUserSwitch() {
  let savedUsers = getGitUsers();
  let selectedUser = null;
  const inRepo = isInsideGitRepo();
  const debugCreds = /^(1|true|yes)$/i.test(
    String(process.env.QME_DEBUG_CREDENTIALS || "").trim(),
  );
  const keychainDeleteEnabled = /^(1|true|yes)$/i.test(
    String(process.env.QME_KEYCHAIN_DELETE || "").trim(),
  );
	  const ghLogoutEnabled = /^(1|true|yes)$/i.test(
	    String(process.env.QME_GH_LOGOUT || "").trim(),
	  );

	  while (savedUsers.length > 0) {
	    console.log();
	    console.log(chalk.blueBright("👥 Saved git users:"));
	    console.log(chalk.yellow("  a) Add a new user"));
	    console.log(chalk.yellow("  r) Remove a saved user"));
	    savedUsers.forEach((user, index) => {
	      console.log(chalk.green(`  ${index + 1}) ${user.name} <${user.email}>`));
	    });

	    const answerRaw = await askQuestion(
	      chalk.yellow(`👉 Choose user (1-${savedUsers.length}) (a = add, r = remove, Enter = cancel): `),
	    );
	    const answer = String(answerRaw || "").trim().toLowerCase();

	    if (!answer) {
	      console.log(chalk.yellow("ℹ️ Cancelled."));
	      return;
	    }
	    if (answer === "a" || answer === "add") {
	      await runGitUserAdd();
	      savedUsers = getGitUsers();
	      continue;
	    }
	    if (answer === "r" || answer === "rm" || answer === "remove" || answer === "d" || answer === "del" || answer === "delete") {
	      await runGitUserRemove();
	      savedUsers = getGitUsers();
	      continue;
	    }

	    const selectedIndex = Number.parseInt(answer, 10);
	    if (Number.isInteger(selectedIndex) && selectedIndex >= 1 && selectedIndex <= savedUsers.length) {
	      selectedUser = savedUsers[selectedIndex - 1];
	      console.log(chalk.green(`✅ Selected: ${selectedUser.name} <${selectedUser.email}>`));
	      break;
	    }

	    console.log(chalk.yellow("⚠️ Invalid selection. Try again."));
	  }

  const currentGlobal = getGitUser("--global") || { name: "", email: "" };

  if (currentGlobal.name || currentGlobal.email) {
    console.log(
      chalk.blueBright("👤 Current global user:"),
      chalk.green(`${currentGlobal.name || "(not set)"} <${currentGlobal.email || "(not set)"}>`),
    );
  } else {
    console.log(chalk.yellow("ℹ️ No global git user is set yet."));
  }

  const namePrompt = chalk.yellow(
    `👤 Enter name (git user.name)${currentGlobal.name ? ` [${currentGlobal.name}]` : ""}: `,
  );
  const emailPrompt = chalk.yellow(
    `📧 Enter email (git user.email)${currentGlobal.email ? ` [${currentGlobal.email}]` : ""}: `,
  );

  const nameInput = selectedUser ? "" : await askQuestion(namePrompt);
  const emailInput = selectedUser ? "" : await askQuestion(emailPrompt);

  const name = selectedUser ? selectedUser.name : (nameInput || currentGlobal.name);
  const email = selectedUser ? selectedUser.email : (emailInput || currentGlobal.email);

  if (!name || !email) {
    console.log(chalk.red("❌ Both name and email are required to set global git user"));
    process.exit(1);
  }

  const safeName = String(name).replace(/"/g, '\\"');
  const safeEmail = String(email).replace(/"/g, '\\"');

  try {
    execSync(`git config --global user.name "${safeName}"`, { stdio: "ignore" });
    execSync(`git config --global user.email "${safeEmail}"`, { stdio: "ignore" });
  } catch (error) {
    console.log(chalk.red("❌ Failed to set global git user"));
    console.log(chalk.yellow(error.message));
    process.exit(1);
  }

  console.log(chalk.green("✅ Updated global git user"));
  console.log(chalk.blueBright("👤 Now:"), chalk.green(`${name} <${email}>`));

  // Credential manager handling (helps when switching accounts)
  try {
    const helper = getGlobalGitConfigValue("credential.helper");
    if (process.platform === "win32" && !helper) {
      const shouldSet = await askYesNo(
        chalk.yellow("🔐 credential.helper is not set. Set it to manager-core?"),
        true,
      );
      if (shouldSet) {
        setGlobalGitConfigValue("credential.helper", "manager-core");
        console.log(chalk.green("✅ Set credential.helper = manager-core"));
      }
    }
    if (process.platform === "darwin" && !helper) {
      const shouldSet = await askYesNo(
        chalk.yellow("🔐 credential.helper is not set. Set it to osxkeychain (macOS Keychain)?"),
        true,
      );
      if (shouldSet) {
        setGlobalGitConfigValue("credential.helper", "osxkeychain");
        console.log(chalk.green("✅ Set credential.helper = osxkeychain"));
      }
    }
    if (
      process.platform === "darwin" &&
      helper &&
      /manager/i.test(helper) &&
      !/osxkeychain/i.test(helper)
    ) {
      const shouldSwitch = await askYesNo(
        chalk.yellow(
          `🔐 credential.helper is set to "${helper}". Switch to osxkeychain (macOS Keychain)?`,
        ),
        false,
      );
      if (shouldSwitch) {
        setGlobalGitConfigValue("credential.helper", "osxkeychain");
        console.log(chalk.green("✅ Set credential.helper = osxkeychain"));
      }
    }
  } catch {
    // Non-fatal
  }

  let defaultHost = "";
  let defaultOriginTarget = null;
  let originUrlRaw = "";
  if (inRepo) {
    try {
      const originUrl = getProjectRepoUrl();
      originUrlRaw = originUrl ? String(originUrl).trim() : "";
      const httpUrl = normalizeRepoToHttpUrl(originUrl);
      if (httpUrl) {
        defaultOriginTarget = parseCredentialTarget(httpUrl);
        defaultHost = new URL(httpUrl).hostname;
      }
    } catch {
      // ignore
    }
  }

  // If the remote URL includes credentials, strip them before displaying the URL.
  // Git can keep showing that user even after credentials are cleared.
  if (inRepo && originUrlRaw && originUrlRaw.includes("://")) {
    try {
      const url = new URL(originUrlRaw);
      if (url.username) {
        const embeddedUser = url.username;
        const shouldFixRemote = await askYesNo(
          chalk.yellow(
            `🔧 origin URL has embedded username "${embeddedUser}". Remove it from origin (recommended)?`,
          ),
          true,
        );
        if (shouldFixRemote) {
          url.username = "";
          url.password = "";
          const cleaned = url.toString().replace(/\/$/, "");
          execSync(`git remote set-url origin "${String(cleaned).replace(/"/g, '\\"')}"`, {
            stdio: "ignore",
          });
          originUrlRaw = cleaned;
          const httpUrl = normalizeRepoToHttpUrl(cleaned);
          if (httpUrl) {
            defaultOriginTarget = parseCredentialTarget(httpUrl);
            defaultHost = new URL(httpUrl).hostname;
          }
          console.log(chalk.green("✅ Updated origin URL (removed embedded username)"));
        }
      }
    } catch {
      // ignore
    }
  }

  // After switching users, clear the current credential "session" so the next push/pull
  // prompts for the correct account.
  const shouldRemoveCreds = await askYesNo(
    chalk.yellow("🔐 Remove saved git credentials?"),
    true,
  );
  if (!shouldRemoveCreds) {
    return;
  }

  let target = null;
  // Require explicit host when we can't infer a default (not in a repo or no origin).
  // Allow cancel keywords to exit.
  while (!target) {
    const targetRaw = await askQuestion(
      chalk.yellow(
        `🌐 Enter remote host${defaultHost ? ` [${defaultHost}]` : ""} (Enter = ${defaultHost ? "default" : "cancel"}): `,
      ),
    );
    const raw = String(targetRaw || "").trim();
    if (!raw && !defaultHost) {
      target = null;
      break;
    }
    if (/^(c|cancel|exit|quit)$/i.test(raw)) {
      target = null;
      break;
    }
    target = parseCredentialTarget(raw || defaultHost);
    if (!target) {
      console.log(chalk.yellow("⚠️ Could not parse host. Try again (example: github.com)"));
    }
  }
  if (!target) {
    console.log(chalk.gray("ℹ️ Cancelled clearing saved credentials."));
    return;
  }

  try {
    const originTargetToUse =
      defaultOriginTarget && defaultOriginTarget.host === target.host
        ? defaultOriginTarget
        : null;
    const result = rejectGitCredentialBestEffort({
      hostTarget: target,
      originTarget: originTargetToUse,
    });

    // On macOS, also try deleting Keychain entries directly. Some setups still keep old
    // Internet Password items even after `git credential reject`.
    // Additionally, explicitly call common helpers when present.
    if (process.platform === "darwin") {
      // Keychain deletion can trigger macOS permission prompts (password/Touch ID).
      // Keep it opt-in via env var to avoid "login required" popups.
      if (keychainDeleteEnabled) {
        const keychainUsernames = [
          target.username,
          target.path ? tryGetStoredCredentialUsername({ protocol: target.protocol, host: target.host, path: target.path }) : "",
          result.discoveredHostUsername,
          result.discoveredOriginUsername,
          originTargetToUse?.username,
        ].filter(Boolean);
        const keychainResult = deleteMacKeychainCredentialsBestEffort({
          host: target.host,
          protocol: target.protocol,
          usernames: keychainUsernames,
        });
        if (debugCreds && keychainResult.deleted > 0) {
          console.log(chalk.green(`✅ Keychain: removed ${keychainResult.deleted} item(s)`));
        }
      }

      // Try helper erases explicitly (works even if credential.helper isn't set correctly).
      const helperTargets = [
        { protocol: target.protocol, host: target.host },
        originTargetToUse ? { protocol: originTargetToUse.protocol, host: originTargetToUse.host, path: originTargetToUse.path } : null,
        target.path ? { protocol: target.protocol, host: target.host, path: target.path } : null,
      ].filter(Boolean);

      for (const t of helperTargets) {
        if (!t) continue;
        gitCredentialEraseViaHelper({ helper: "credential-osxkeychain", ...t });
        gitCredentialEraseViaHelper({ helper: "credential-manager", ...t });
        gitCredentialEraseViaHelper({ helper: "credential-manager-core", ...t });
        if (t.path) {
          // Username discovery is opt-in (can trigger Keychain prompts on macOS).
          if (/^(1|true|yes)$/i.test(String(process.env.QME_DISCOVER_CREDENTIAL_USERNAME || "").trim())) {
            const u = tryGetStoredCredentialUsername(t);
            if (u) {
              gitCredentialEraseViaHelper({ helper: "credential-osxkeychain", ...t, username: u });
              gitCredentialEraseViaHelper({ helper: "credential-manager", ...t, username: u });
              gitCredentialEraseViaHelper({ helper: "credential-manager-core", ...t, username: u });
            }
          }
        }
      }
    }

    const storeResult = clearStoreCredentialsForHost(target.host);
    if (debugCreds && storeResult.removed > 0) {
      console.log(chalk.green(`✅ credential-store: removed ${storeResult.removed} entr${storeResult.removed === 1 ? "y" : "ies"}`));
    }

    console.log(chalk.green(`✅ Cleared saved credentials for ${target.host}`));
    if (debugCreds && !result.anyOk) {
      console.log(
        chalk.yellow(
          "⚠️ Credential helper did not confirm clearing. You may still be signed in via another helper (e.g. GitHub CLI / GCM).",
        ),
      );
    }

    // Extra diagnostics only when explicitly enabled.
    if (debugCreds) {
      const checkHost = checkCredentialStillPresent({ protocol: target.protocol, host: target.host });
      const checkOrigin = originTargetToUse
        ? checkCredentialStillPresent({
            protocol: originTargetToUse.protocol,
            host: originTargetToUse.host,
            path: originTargetToUse.path,
          })
        : { present: false, username: "" };
      if (checkHost.present || checkOrigin.present) {
        const u = checkOrigin.username || checkHost.username || "";
        console.log(chalk.yellow("⚠️ Credentials still appear to be stored for this host."));
        const helpers = getConfiguredCredentialHelpers();
        console.log(chalk.gray(`credential.helper: ${helpers.length ? helpers.join(", ") : "(not set)"}`));
        if (process.platform === "darwin") {
          console.log(
            chalk.gray(
              `Try Keychain delete: security delete-internet-password -s ${target.host}${u ? ` -a ${u}` : ""}`,
            ),
          );
        }
      }
    }
  } catch (error) {
    console.log(chalk.red("❌ Failed to clear saved credentials"));
    console.log(chalk.yellow(error.message));
  }

  // Optional: logout GitHub CLI session too (can prompt/revoke depending on setup).
  const host = target.host;
  if (ghLogoutEnabled && isCommandAvailable("gh")) {
    const ok = tryLogoutGh(host);
    if (debugCreds && ok) {
      console.log(chalk.green(`✅ GitHub CLI: logged out for ${host}`));
    }
  }

  // Optional: clear SSH agent keys (can be destructive).
  const sshRemote = isSshRemote(originUrlRaw);
  if (sshRemote) {
    console.log(
      chalk.yellow(
        "⚠️ SSH remote detected. Clearing SSH agent will remove all loaded keys (ssh-add -D).",
      ),
    );
    const shouldClearSsh = await askYesNo(
      chalk.yellow("🧹 Clear SSH agent keys now?"),
      false,
    );
    if (shouldClearSsh) {
      const ok = tryClearSshAgent();
      if (ok) {
        console.log(chalk.green("✅ Cleared SSH agent keys (ssh-add -D)"));
      } else {
        console.log(
          chalk.gray(
            "ℹ️ Skipped clearing SSH agent (ssh-add not available, no SSH_AUTH_SOCK, or command failed).",
          ),
        );
      }
    }
  }

}

async function selectGitUserForSsh() {
  let savedUsers = getGitUsers();

  while (true) {
    console.log();
    console.log(chalk.blueBright("👥 Select Git user for SSH key:"));
    console.log(chalk.yellow("  a) Add a new user"));
    console.log(chalk.yellow("  r) Remove a saved user"));
    savedUsers.forEach((user, index) => {
      console.log(chalk.green(`  ${index + 1}) ${user.name} <${user.email}>`));
    });

    const answer = String(
      await askQuestion(
        chalk.yellow(`👉 Choose user (1-${savedUsers.length}) (a = add, r = remove, Enter = abort): `),
      ),
    ).trim().toLowerCase();

    if (!answer) {
      return null;
    }
    if (answer === "a" || answer === "add") {
      await runGitUserAdd();
      savedUsers = getGitUsers();
      continue;
    }
    if (answer === "r" || answer === "rm" || answer === "remove") {
      await runGitUserRemove();
      savedUsers = getGitUsers();
      continue;
    }

    const selectedIndex = Number.parseInt(answer, 10);
    if (Number.isInteger(selectedIndex) && selectedIndex >= 1 && selectedIndex <= savedUsers.length) {
      return savedUsers[selectedIndex - 1];
    }

    console.log(chalk.yellow("⚠️ Invalid selection. Try again."));
  }
}
module.exports = {
  runGitSync,
  runGitReset,
  runGitOpen,
  runGitRemove,
  runGitUserSwitch,
  selectGitUserForSsh,
  runGitUserAdd,
  runGitUserRemove,
};
