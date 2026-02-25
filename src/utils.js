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
    try {
        const config = fs.readFileSync(
            path.join(process.cwd(), ".git", "config"),
            "utf8"
        );

        const match = config.match(
            /\[remote "origin"\][\s\S]*?url\s*=\s*(.+)/
        );

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
