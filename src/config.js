const fs = require("fs");
const path = require("path");
const os = require("os");

const PRIMARY_CONFIG_PATH = path.join(os.homedir(), ".qme-cli.json");
const FALLBACK_CONFIG_PATH = path.join(os.homedir(), ".mycli.json");
const CONFIG_PATH = fs.existsSync(PRIMARY_CONFIG_PATH)
    ? PRIMARY_CONFIG_PATH
    : (fs.existsSync(FALLBACK_CONFIG_PATH) ? FALLBACK_CONFIG_PATH : PRIMARY_CONFIG_PATH);
const DEFAULT_BRANCH = "main";

function loadRawConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        return { repos: {}, system: { aliases: {} } };
    }

    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

    if (!parsed.repos) {
        parsed.repos = {};
    }

    if (!parsed.system) {
        parsed.system = {};
    }

    if (!parsed.system.aliases || typeof parsed.system.aliases !== "object" || Array.isArray(parsed.system.aliases)) {
        parsed.system.aliases = {};
    }
    return parsed;
}

function saveRawConfig(config) {
    fs.writeFileSync(
        CONFIG_PATH,
        JSON.stringify(config, null, 2),
        "utf8"
    );
}

function getConfigPath() {
    return CONFIG_PATH;
}

function ensureConfigFile() {
    if (!fs.existsSync(CONFIG_PATH)) {
        saveRawConfig({ repos: {}, system: { aliases: {} } });
    }

    return CONFIG_PATH;
}

function loadOrCreateRepoConfig(repoUrl) {
    const config = loadRawConfig();

    if (!config.repos) {
        config.repos = {};
    }

    if (!config.repos[repoUrl]) {
        config.repos[repoUrl] = {
            remoteBranch: DEFAULT_BRANCH
        };
        saveRawConfig(config);
    }

    if (!config.repos[repoUrl].remoteBranch) {
        config.repos[repoUrl].remoteBranch = DEFAULT_BRANCH;
        saveRawConfig(config);
    }

    return {
        repoUrl,
        remoteBranch: config.repos[repoUrl].remoteBranch,
        project_id: config.repos[repoUrl].project_id
    };
}

function setRemoteBranchForRepo(repoUrl, branch) {
    const config = loadRawConfig();

    if (!config.repos) {
        config.repos = {};
    }

    if (!config.repos[repoUrl]) {
        config.repos[repoUrl] = {};
    }

    config.repos[repoUrl].remoteBranch = branch;

    saveRawConfig(config);

    console.log(`✅ Remote pull branch set to: ${branch}`);
    console.log(`🔗 Repo: ${repoUrl}`);
    console.log(`📄 Config updated: ${CONFIG_PATH}`);
}

function setProjectIdForRepo(repoUrl, projectId) {
    const config = loadRawConfig();

    if (!config.repos) {
        config.repos = {};
    }

    if (!config.repos[repoUrl]) {
        config.repos[repoUrl] = {};
    }

    config.repos[repoUrl].project_id = projectId;
    saveRawConfig(config);

    console.log(`✅ Project ID set to: ${projectId}`);
    console.log(`🔗 Repo: ${repoUrl}`);
    console.log(`📄 Config updated: ${CONFIG_PATH}`);
}

function exportConfig(destinationPath) {
    const outputPath = destinationPath
        ? path.resolve(destinationPath)
        : path.resolve(process.cwd(), "mycli-config-backup.json");

    const sourceExists = fs.existsSync(CONFIG_PATH);
    const content = sourceExists
        ? fs.readFileSync(CONFIG_PATH, "utf8")
        : JSON.stringify({ repos: {}, system: { aliases: {} } }, null, 2);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, content, "utf8");

    console.log(`✅ Config exported to: ${outputPath}`);
    if (!sourceExists) {
        console.log(`ℹ️ No existing config found at ${CONFIG_PATH}; exported empty template.`);
    } else {
        console.log(`📄 Source config: ${CONFIG_PATH}`);
    }
}

function normalizePathValue(value) {
    return value.trim().replace(/^"+|"+$/g, "").replace(/[\\\/]+$/, "");
}

function normalizeVersionValue(value) {
    return String(value || "").trim().replace(/^"+|"+$/g, "");
}

function setXamppPath(xamppPath, options = {}) {
    const { silent = false } = options;
    const config = loadRawConfig();
    const normalizedPath = normalizePathValue(xamppPath);

    if (!normalizedPath) {
        console.log("❌ XAMPP path cannot be empty");
        process.exit(1);
    }

    config.system.xamppPath = normalizedPath;
    saveRawConfig(config);

    if (!silent) {
        console.log(`✅ XAMPP path saved: ${normalizedPath}`);
        console.log(`📄 Config updated: ${CONFIG_PATH}`);
    }
}

function clearXamppPath() {
    const config = loadRawConfig();

    if (config.system && config.system.xamppPath) {
        delete config.system.xamppPath;
        saveRawConfig(config);
    }

    console.log(`✅ XAMPP path cleared from config: ${CONFIG_PATH}`);
}

function getXamppPath() {
    const config = loadRawConfig();
    const value = config.system && config.system.xamppPath
        ? normalizePathValue(config.system.xamppPath)
        : "";

    return value;
}

function setXamppCurrentVersion(version, options = {}) {
    const { silent = false } = options;
    const config = loadRawConfig();
    const normalizedVersion = normalizeVersionValue(version);

    if (!normalizedVersion) {
        console.log("❌ XAMPP current version cannot be empty");
        process.exit(1);
    }

    config.system.xamppCurrentVersion = normalizedVersion;
    saveRawConfig(config);

    if (!silent) {
        console.log(`✅ XAMPP current version saved: ${normalizedVersion}`);
        console.log(`📄 Config updated: ${CONFIG_PATH}`);
    }
}

function clearXamppCurrentVersion() {
    const config = loadRawConfig();

    if (config.system && config.system.xamppCurrentVersion) {
        delete config.system.xamppCurrentVersion;
        saveRawConfig(config);
    }

    console.log(`✅ XAMPP current version cleared from config: ${CONFIG_PATH}`);
}

function getXamppCurrentVersion() {
    const config = loadRawConfig();
    const value = config.system && config.system.xamppCurrentVersion
        ? normalizeVersionValue(config.system.xamppCurrentVersion)
        : "";

    return value;
}


function normalizeGitUserEntry(entry) {
    const name = String(entry?.name || "").trim();
    const email = String(entry?.email || "").trim();

    if (!name || !email) {
        return null;
    }

    return { name, email };
}

function getGitUsers() {
    const config = loadRawConfig();
    const list = config.system && Array.isArray(config.system.gitUsers)
        ? config.system.gitUsers
        : [];

    return list
        .map(normalizeGitUserEntry)
        .filter(Boolean);
}

function addOrUpdateGitUser(user) {
    const normalized = normalizeGitUserEntry(user);
    if (!normalized) {
        return false;
    }

    const config = loadRawConfig();
    if (!config.system) {
        config.system = {};
    }

    const users = Array.isArray(config.system.gitUsers) ? config.system.gitUsers : [];
    const emailKey = normalized.email.toLowerCase();

    const index = users.findIndex(item => String(item?.email || "").trim().toLowerCase() === emailKey);
    if (index >= 0) {
        users[index] = normalized;
    } else {
        users.push(normalized);
    }

    config.system.gitUsers = users;
    saveRawConfig(config);
    return true;
}
function removeGitUser(email) {
    const emailKey = String(email || "").trim().toLowerCase();
    if (!emailKey) {
        return false;
    }

    const config = loadRawConfig();
    if (!config.system) {
        config.system = {};
    }

    const users = Array.isArray(config.system.gitUsers) ? config.system.gitUsers : [];
    const nextUsers = users.filter(item => String(item?.email || "").trim().toLowerCase() !== emailKey);

    if (nextUsers.length === users.length) {
        return false;
    }

    config.system.gitUsers = nextUsers;
    saveRawConfig(config);
    return true;
}
function normalizeAliasName(name) {
    const trimmed = String(name || "").trim();
    if (!trimmed) {
        return "";
    }

    // Keep it simple: one "word" that can be typed as a CLI token.
    // Allow letters/numbers plus common CLI separators.
    if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]*$/.test(trimmed)) {
        return "";
    }

    return trimmed;
}

function normalizeAliasTokens(tokens) {
    if (!Array.isArray(tokens)) {
        return null;
    }

    const cleaned = tokens
        .map((t) => String(t || "").trim())
        .filter(Boolean);

    return cleaned.length ? cleaned : null;
}

function getAliases() {
    const config = loadRawConfig();
    const raw = config.system && config.system.aliases ? config.system.aliases : {};

    const entries = Object.entries(raw);
    const normalized = {};

    for (const [name, value] of entries) {
        const normalizedName = normalizeAliasName(name);
        if (!normalizedName) {
            continue;
        }

        const tokens = Array.isArray(value) ? value : (typeof value === "string" ? [value] : null);
        const normalizedTokens = normalizeAliasTokens(tokens);
        if (!normalizedTokens) {
            continue;
        }

        normalized[normalizedName] = normalizedTokens;
    }

    return normalized;
}

function addOrUpdateAlias(name, tokens) {
    const normalizedName = normalizeAliasName(name);
    const normalizedTokens = normalizeAliasTokens(tokens);

    if (!normalizedName || !normalizedTokens) {
        return false;
    }

    const config = loadRawConfig();
    if (!config.system) {
        config.system = {};
    }
    if (!config.system.aliases || typeof config.system.aliases !== "object" || Array.isArray(config.system.aliases)) {
        config.system.aliases = {};
    }

    config.system.aliases[normalizedName] = normalizedTokens;
    saveRawConfig(config);
    return true;
}

function removeAlias(name) {
    const normalizedName = normalizeAliasName(name);
    if (!normalizedName) {
        return false;
    }

    const config = loadRawConfig();
    if (!config.system) {
        config.system = {};
    }
    if (!config.system.aliases || typeof config.system.aliases !== "object" || Array.isArray(config.system.aliases)) {
        config.system.aliases = {};
    }

    if (!Object.prototype.hasOwnProperty.call(config.system.aliases, normalizedName)) {
        return false;
    }

    delete config.system.aliases[normalizedName];
    saveRawConfig(config);
    return true;
}
module.exports = {
    getConfigPath,
    ensureConfigFile,
    getAliases,
    addOrUpdateAlias,
    removeAlias,
    getGitUsers,
    addOrUpdateGitUser,
    removeGitUser,
    loadOrCreateRepoConfig,
    setRemoteBranchForRepo,
    setProjectIdForRepo,
    exportConfig,
    setXamppPath,
    clearXamppPath,
    getXamppPath,
    setXamppCurrentVersion,
    clearXamppCurrentVersion,
    getXamppCurrentVersion
};


