const fs = require("fs");
const path = require("path");
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

function initializeRepo(options = {}) {
    ensureGitRepository();
    ensureGitignore();
    ensureHooks();
    ensureBranchConfig(options.branch);
    console.log(chalk.green("✅ mycli init completed"));
}

module.exports = {
    initializeRepo
};
