const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const chalk = require("chalk");
const { getGitUser } = require("./utils.js");

function detectPlatformHomeDirectory() {
    if (process.platform === "win32") {
        if (process.env.USERPROFILE) {
            return process.env.USERPROFILE;
        }

        if (process.env.HOMEDRIVE && process.env.HOMEPATH) {
            return `${process.env.HOMEDRIVE}${process.env.HOMEPATH}`;
        }
    } else if (process.env.HOME) {
        return process.env.HOME;
    }

    return os.homedir();
}

function resolveHomeDirectory(homeDirInput) {
    const detectedHome = detectPlatformHomeDirectory();

    if (!homeDirInput) {
        return detectedHome;
    }

    if (homeDirInput === "~") {
        return detectedHome;
    }

    if (homeDirInput.startsWith("~/") || homeDirInput.startsWith("~\\")) {
        return path.join(detectedHome, homeDirInput.slice(2));
    }

    return path.resolve(homeDirInput);
}

function getDefaultEmail() {
    const globalUser = getGitUser("--global");
    if (globalUser?.email) {
        return globalUser.email;
    }

    const localUser = getGitUser("--local");
    if (localUser?.email) {
        return localUser.email;
    }

    try {
        return `${os.userInfo().username}@${os.hostname()}`;
    } catch {
        return "user@localhost";
    }
}

function getDefaultSshEmail() {
    return getDefaultEmail();
}

function buildKeyFileName(tagInput) {
    const tag = (tagInput || "").trim();
    if (!tag) {
        return "";
    }

    if (tag.startsWith("id_rsa")) {
        return tag;
    }

    return `id_rsa_${tag}`;
}

function generateGitSshKey(options = {}) {
    const homeDir = resolveHomeDirectory(options.homeDir);
    const email = (options.comment || getDefaultEmail()).trim();
    const keyName = buildKeyFileName(options.fileTag);

    if (!email) {
        console.log(chalk.red("❌ Email/comment cannot be empty"));
        process.exit(1);
    }

    const sshDir = path.join(homeDir, ".ssh");
    const privateKeyPath = path.join(sshDir, keyName);
    const publicKeyPath = `${privateKeyPath}.pub`;

    if (fs.existsSync(privateKeyPath) || fs.existsSync(publicKeyPath)) {
        console.log(chalk.red("❌ SSH key already exists at:"));
        console.log(chalk.yellow(privateKeyPath));
        process.exit(1);
    }

    fs.mkdirSync(sshDir, { recursive: true });

    console.log(chalk.blueBright("🏠 Home directory:"), chalk.cyan(homeDir));
    console.log(chalk.blueBright("🔐 Key path:"), chalk.cyan(privateKeyPath));
    console.log(chalk.blueBright("📧 Comment/email:"), chalk.green(email));
    console.log(chalk.cyan("Generating SSH key..."));

    const result = spawnSync(
        "ssh-keygen",
        ["-t", "rsa", "-b", "4096", "-C", email, "-f", privateKeyPath, "-N", ""],
        { stdio: "inherit" }
    );

    if (result.error) {
        console.log(chalk.red(`❌ Failed to run ssh-keygen: ${result.error.message}`));
        process.exit(1);
    }

    if (result.status !== 0) {
        console.log(chalk.red("❌ ssh-keygen failed"));
        process.exit(1);
    }

    if (!fs.existsSync(publicKeyPath)) {
        console.log(chalk.red("❌ Public key file was not created"));
        process.exit(1);
    }

    const publicKey = fs.readFileSync(publicKeyPath, "utf8").trim();

    console.log(chalk.green("✅ SSH key generated successfully"));
    console.log(chalk.blueBright("📄 Public key file:"), chalk.cyan(publicKeyPath));
    console.log();
    console.log(chalk.yellow("Copy this public key to GitHub/GitLab/Bitbucket:"));
    console.log(chalk.white(publicKey));
}

module.exports = {
    generateGitSshKey,
    getDefaultSshEmail
};
