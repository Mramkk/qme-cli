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

function updateSshConfig({ homeDir, hostName, privateKeyPath }) {
    const normalizedHost = String(hostName || "").trim();
    if (!normalizedHost) {
        throw new Error("SSH host name is required");
    }

    const sshDir = path.join(homeDir, ".ssh");
    const configPath = path.join(sshDir, "config");
    const existing = fs.existsSync(configPath)
        ? fs.readFileSync(configPath, "utf8")
        : "";
    const lines = existing ? existing.split(/\r?\n/) : [];
    const output = [];
    const identityFile = `~/.ssh/${path.basename(privateKeyPath).replace(/\\/g, "/")}`;
    let currentBlock = [];
    let hostExists = false;

    const flushBlock = () => {
        if (!currentBlock.length) {
            return;
        }

        const hostIndex = currentBlock.findIndex((line) => /^\s*Host\s+/i.test(line));
        const hostLine = hostIndex >= 0 ? currentBlock[hostIndex] : "";
        const hosts = hostLine
            ? hostLine.replace(/^\s*Host\s+/i, "").trim().split(/\s+/)
            : [];

        if (hosts.includes(normalizedHost)) {
            hostExists = true;
            output.push(...currentBlock);
        } else {
            output.push(...currentBlock);
        }

        currentBlock = [];
    };

    lines.forEach((line) => {
        if (/^\s*Host\s+/i.test(line) && currentBlock.length) {
            flushBlock();
        }
        currentBlock.push(line);
    });
    flushBlock();

    if (hostExists) {
        return { configPath, created: false };
    }

    while (output.length && !output[output.length - 1].trim()) {
        output.pop();
    }
    if (output.length) {
        output.push("");
    }
    output.push(
        `Host ${normalizedHost}`,
        `  HostName ${normalizedHost}`,
        "  User git",
        `  IdentityFile ${identityFile}`,
        "  IdentitiesOnly yes",
        "",
    );

    fs.mkdirSync(sshDir, { recursive: true });
    fs.writeFileSync(configPath, output.join("\n"), "utf8");
    return { configPath, created: true };
}

function buildKeyFileName(tagInput, keyType = "rsa") {
    const tag = (tagInput || "").trim();
    if (!tag) {
        return "";
    }

    if (tag.startsWith("id_rsa") || tag.startsWith("id_ed25519")) {
        return tag;
    }

    return `${keyType === "ed25519" ? "id_ed25519" : "id_rsa"}_${tag}`;
}

function generateGitSshKey(options = {}) {
    const homeDir = resolveHomeDirectory(options.homeDir);
    const email = (options.comment || getDefaultEmail()).trim();
    const keyType = options.keyType === "ed25519" ? "ed25519" : "rsa";
    const keyName = buildKeyFileName(options.fileTag, keyType);

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

    const sshKeygenArgs = ["-t", keyType];
    if (keyType === "rsa") {
        sshKeygenArgs.push("-b", "4096");
    }
    sshKeygenArgs.push("-C", email, "-f", privateKeyPath, "-N", "");

    const result = spawnSync(
        "ssh-keygen",
        sshKeygenArgs,
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

    return { homeDir, privateKeyPath, publicKeyPath };
}

module.exports = {
    generateGitSshKey,
    getDefaultSshEmail,
    updateSshConfig,
};
