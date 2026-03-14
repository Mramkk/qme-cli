const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function getGitUser(scope) {
    try {
        const name = execSync(`git config ${scope} user.name`, { encoding: "utf8" }).trim();
        const email = execSync(`git config ${scope} user.email`, { encoding: "utf8" }).trim();
        return name || email ? { name, email } : null;
    } catch {
        return null;
    }
}

function getProjectRepoUrl() {
    // Prefer git itself (works from any subdirectory and respects worktrees).
    try {
        const url = execSync("git remote get-url origin", { encoding: "utf8" }).trim();
        return url || null;
    } catch {
        // fall through
    }

    // Fallback: parse .git/config if present.
    try {
        let gitDir = "";
        try {
            gitDir = execSync("git rev-parse --git-dir", { encoding: "utf8" }).trim();
        } catch {
            gitDir = path.join(process.cwd(), ".git");
        }

        const configPath = path.isAbsolute(gitDir)
            ? path.join(gitDir, "config")
            : path.join(process.cwd(), gitDir, "config");

        const config = fs.readFileSync(configPath, "utf8");
        const match = config.match(/\[remote "origin"\][\s\S]*?url\s*=\s*(.+)/);
        return match ? match[1].trim() : null;
    } catch {
        return null;
    }
}

function getCurrentBranch() {
    try {
        return execSync("git branch --show-current", {
            encoding: "utf8"
        }).trim();
    } catch {
        return "unknown";
    }
}

module.exports = {
    getGitUser,
    getProjectRepoUrl,
    getCurrentBranch
};
