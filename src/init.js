const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync } = require("child_process");
const chalk = require("chalk");
const { getCurrentBranch, getProjectRepoUrl } = require("./utils.js");
const { setRemoteBranchForRepo } = require("./config.js");

const DEFAULT_BRANCH = "main";

const DEFAULT_GITIGNORE_LINES = [
    "node_modules/",
    ".env",
    ".DS_Store",
    "dist/",
    "build/"
];

const PRE_COMMIT_HOOK = `#!/bin/sh
# Block commits with whitespace errors in staged changes.
git diff --cached --check
status=$?
if [ $status -ne 0 ]; then
  echo "Fix whitespace errors before commit."
  exit $status
fi
exit 0
`;

function ensureGitRepository() {
    try {
        execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
    } catch {
        console.log(chalk.red("❌ Not a Git repository"));
        process.exit(1);
    }
}

function isGitRepository() {
    try {
        execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

function hasHeadCommit() {
    try {
        execSync("git rev-parse --verify HEAD", { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

function escapeDoubleQuotes(value) {
    return String(value || "").replace(/"/g, '\\"');
}

function formatGitError(error) {
    const stderr = String(error?.stderr || error?.message || "").trim();
    const text = stderr.toLowerCase();

    if (
        text.includes("non-fast-forward") ||
        text.includes("fetch first") ||
        text.includes("rejected")
    ) {
        return "remote rejected (non-fast-forward). Pull/rebase remote changes first, then push again.";
    }

    if (
        text.includes("authentication failed") ||
        text.includes("permission denied") ||
        text.includes("could not read from remote repository")
    ) {
        return "authentication/permission issue";
    }

    if (
        text.includes("could not resolve host") ||
        text.includes("failed to connect") ||
        text.includes("timed out")
    ) {
        return "network/connectivity issue";
    }

    const line = stderr.split(/\r?\n/).find(Boolean);
    return line || "unknown git error";
}

function askQuestion(question) {
    return new Promise(resolve => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(question, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function askYesNo(question, defaultValue = false) {
    const defaultHint = defaultValue ? "Y/n" : "y/N";
    const answer = (await askQuestion(`${question} (${defaultHint}): `)).toLowerCase();

    if (!answer) {
        return defaultValue;
    }
    return answer === "y" || answer === "yes";
}

function ensureGitignore() {
    const gitignorePath = path.join(process.cwd(), ".gitignore");
    const existing = fs.existsSync(gitignorePath)
        ? fs.readFileSync(gitignorePath, "utf8")
        : "";

    const normalizeIgnoreLine = line => line.replace(/^[./\\]+/, "").replace(/\/+$/, "");

    const existingLines = new Set(
        existing
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean)
            .map(normalizeIgnoreLine)
    );

    const missing = DEFAULT_GITIGNORE_LINES.filter(
        line => !existingLines.has(normalizeIgnoreLine(line))
    );
    if (missing.length === 0) {
        console.log(chalk.gray("ℹ️ .gitignore already has default entries"));
        return;
    }

    let output = existing;
    if (output && !output.endsWith("\n")) {
        output += "\n";
    }
    output += `${missing.join("\n")}\n`;

    fs.writeFileSync(gitignorePath, output, "utf8");
    console.log(chalk.green("✅ .gitignore updated with defaults"));
}

function ensureHooks() {
    const hooksDir = path.join(process.cwd(), ".githooks");
    const preCommitPath = path.join(hooksDir, "pre-commit");

    fs.mkdirSync(hooksDir, { recursive: true });

    if (!fs.existsSync(preCommitPath)) {
        fs.writeFileSync(preCommitPath, PRE_COMMIT_HOOK, "utf8");
        try {
            fs.chmodSync(preCommitPath, 0o755);
        } catch {
            // Git on Windows can still execute hooks through sh.
        }
        console.log(chalk.green("✅ Created .githooks/pre-commit"));
    } else {
        console.log(chalk.gray("ℹ️ pre-commit hook already exists"));
    }

    execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
    console.log(chalk.green("✅ Git hooks path set to .githooks"));
}

function ensureBranchConfig(branchInput) {
    const repoUrl = getProjectRepoUrl();
    if (!repoUrl) {
        console.log(chalk.yellow("⚠️ No origin remote found. Skipped branch config in .mycli.json"));
        return;
    }

    const detectedBranch = getCurrentBranch();
    const branch =
        (branchInput || "").trim() ||
        (detectedBranch && detectedBranch !== "unknown" ? detectedBranch : DEFAULT_BRANCH);

    setRemoteBranchForRepo(repoUrl, branch);
}

function ensureGitInitialized(branchInput) {
    if (isGitRepository()) {
        return;
    }

    const branch = (branchInput || "").trim() || DEFAULT_BRANCH;
    try {
        execSync(`git init -b ${branch}`, { stdio: "inherit" });
    } catch {
        execSync("git init", { stdio: "inherit" });
        execSync(`git checkout -b ${branch}`, { stdio: "ignore" });
    }
}

function commitFirstTime(defaultMessage = "Initial commit") {
    if (hasHeadCommit()) {
        console.log(chalk.gray("ℹ️ Repository already has commits. Skipped initial commit"));
        return;
    }

    execSync("git add -A", { stdio: "ignore" });
    const staged = execSync("git diff --cached --name-only", { encoding: "utf8" }).trim();
    if (!staged) {
        console.log(chalk.gray("ℹ️ No files to commit yet. Skipped initial commit"));
        return;
    }

    execSync(`git commit -m "${escapeDoubleQuotes(defaultMessage)}"`, { stdio: "inherit" });
    console.log(chalk.green("✅ Created initial commit"));
}

async function configureOriginAndPush(branchInput) {
    const branch = (branchInput || "").trim() || DEFAULT_BRANCH;
    const shouldConfigureOrigin = await askYesNo(
        chalk.yellow("🔗 Do you want to add remote origin and push now?"),
        true
    );
    if (!shouldConfigureOrigin) {
        console.log(chalk.yellow("⚠️ Skipped origin setup and push"));
        return;
    }

    const remoteInput = await askQuestion(chalk.magenta("🔗 Enter remote URL for origin: "));
    if (!remoteInput) {
        console.log(chalk.yellow("⚠️ Empty remote URL. Skipped origin setup and push"));
        return;
    }

    const existingOrigin = getProjectRepoUrl();
    if (existingOrigin && existingOrigin !== remoteInput) {
        const replace = await askYesNo(chalk.yellow("⚠️ origin already exists. Replace it?"), false);
        if (!replace) {
            console.log(chalk.yellow("⚠️ Kept existing origin. Skipped push"));
            return;
        }
    }

    if (!existingOrigin) {
        execSync(`git remote add origin "${escapeDoubleQuotes(remoteInput)}"`, { stdio: "inherit" });
    } else if (existingOrigin !== remoteInput) {
        execSync(`git remote set-url origin "${escapeDoubleQuotes(remoteInput)}"`, { stdio: "inherit" });
    }
    console.log(chalk.green("✅ origin configured"));

    if (!hasHeadCommit()) {
        console.log(chalk.yellow("⚠️ No commit found. Skipped push"));
        return;
    }

    try {
        execSync(`git push -u origin ${branch}`, { stdio: "inherit" });
        console.log(chalk.green(`✅ Pushed to origin/${branch}`));
    } catch (error) {
        console.log(chalk.red(`❌ Push failed: ${formatGitError(error)}`));
        console.log(chalk.yellow(`ℹ️ You can run: git pull --rebase origin ${branch}`));
        console.log(chalk.yellow(`ℹ️ Then run: git push -u origin ${branch}`));
    }
}

async function initializeRepo(options = {}) {
    const {
        branch,
        fullGitInit = false
    } = options;

    if (fullGitInit) {
        if (isGitRepository()) {
            console.log(chalk.yellow("⚠️ Git repository already exists. Skipping `git init` and continuing setup."));
        } else {
            ensureGitInitialized(branch);
        }
        ensureGitignore();
        ensureHooks();
        commitFirstTime("Initial commit");
        await configureOriginAndPush(branch);
        ensureBranchConfig(branch);
        console.log(chalk.green("✅ qme git init completed"));
        return;
    } else {
        ensureGitRepository();
    }

    ensureGitignore();
    ensureHooks();
    ensureBranchConfig(branch);

    console.log(chalk.green("✅ qme init completed"));
}

module.exports = {
    initializeRepo
};
