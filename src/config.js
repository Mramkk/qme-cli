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
        return { repos: {}, system: { aliases: {}, projects: [] } };
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
    if (!Array.isArray(parsed.system.projects)) {
        parsed.system.projects = [];
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
        saveRawConfig({ repos: {}, system: { aliases: {}, projects: [] } });
    }

    return CONFIG_PATH;
}

function getSprintMailRecipients() {
    const localConfigPath = path.resolve(__dirname, "..", "qme-cli.json");
    let config = loadRawConfig();

    if (fs.existsSync(localConfigPath)) {
        try {
            config = JSON.parse(fs.readFileSync(localConfigPath, "utf8"));
        } catch {
            // Fall back to the existing user config when qme-cli.json is invalid.
        }
    }

    const sprintMail = (config.system && config.system.sprintMail) || config.sprintMail;
    const normalizeRecipients = (value, fallback) => {
        const values = Array.isArray(value)
            ? value
            : (typeof value === "string" ? value.split(/[;,]/) : []);
        const recipients = values
            .map((item) => String(item || "").trim())
            .filter(Boolean);
        return recipients.length ? recipients : fallback;
    };

    return {
        to: normalizeRecipients(sprintMail && sprintMail.to, []),
        cc: normalizeRecipients(sprintMail && sprintMail.cc, []),
    };
}

function setLastRunProject(project) {
    const config = loadRawConfig();
    if (!config.system) {
        config.system = {};
    }

    const projectPath = String(project?.path || "").trim();
    const projectType = String(project?.type || "").trim();
    const phpVersion = String(project?.phpVersion || "").trim();
    const laravelVersion = String(project?.laravelVersion || "").trim();

    if (!projectPath || !projectType) {
        return false;
    }

    const nextProject = {
        path: projectPath,
        type: projectType,
        updatedAt: new Date().toISOString(),
    };

    if (phpVersion) {
        nextProject.phpVersion = phpVersion;
    }

    if (laravelVersion) {
        nextProject.laravelVersion = laravelVersion;
    }

    const projects = Array.isArray(config.system.projects) ? config.system.projects : [];
    const normalizedProjects = projects.filter((item) => item && typeof item === "object");
    const existingIndex = normalizedProjects.findIndex(
        (item) => String(item.path || "").trim().toLowerCase() === projectPath.toLowerCase(),
    );

    if (existingIndex >= 0) {
        normalizedProjects[existingIndex] = nextProject;
    } else {
        normalizedProjects.push(nextProject);
    }

    config.system.projects = normalizedProjects;
    saveRawConfig(config);
    return true;
}

function getLastRunProject() {
    const config = loadRawConfig();
    const projects = config.system && Array.isArray(config.system.projects)
        ? config.system.projects
        : [];

    if (!projects.length) {
        const legacyProject = config.system && config.system.lastRunProject;
        if (!legacyProject || typeof legacyProject !== "object") {
            return null;
        }

        const legacyPath = String(legacyProject.path || "").trim();
        const legacyType = String(legacyProject.type || "").trim();
        if (!legacyPath || !legacyType) {
            return null;
        }

        return {
            path: legacyPath,
            type: legacyType,
            updatedAt: String(legacyProject.updatedAt || "").trim(),
        };
    }

    const project = projects[projects.length - 1];

    if (!project || typeof project !== "object") {
        return null;
    }

    const projectPath = String(project.path || "").trim();
    const projectType = String(project.type || "").trim();

    if (!projectPath || !projectType) {
        return null;
    }

    return {
        path: projectPath,
        type: projectType,
        updatedAt: String(project.updatedAt || "").trim(),
    };
}

function getSavedProjects() {
    const config = loadRawConfig();
    const projects = config.system && Array.isArray(config.system.projects)
        ? config.system.projects
        : [];

    return projects
        .filter((project) => project && typeof project === "object")
        .map((project) => {
            const pathValue = String(project.path || "").trim();
            const typeValue = String(project.type || "").trim();
            const updatedAtValue = String(project.updatedAt || "").trim();
            const phpVersionValue = String(project.phpVersion || "").trim();
            const laravelVersionValue = String(project.laravelVersion || "").trim();

            if (!pathValue || !typeValue) {
                return null;
            }

            return {
                path: pathValue,
                type: typeValue,
                updatedAt: updatedAtValue,
                phpVersion: phpVersionValue,
                laravelVersion: laravelVersionValue,
            };
        })
        .filter(Boolean)
        .sort((a, b) => {
            const aTime = Date.parse(a.updatedAt || "") || 0;
            const bTime = Date.parse(b.updatedAt || "") || 0;

            if (aTime !== bTime) {
                return bTime - aTime;
            }

            return b.path.localeCompare(a.path);
        });
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

function getRemoteBranchForRepo(repoUrl) {
    const config = loadRawConfig();
    const repo = config.repos && config.repos[repoUrl];
    const remoteBranch = String(repo?.remoteBranch || DEFAULT_BRANCH).trim();
    return remoteBranch || DEFAULT_BRANCH;
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
        : path.join(os.homedir(), "Downloads", "mycli-config-backup.json");

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
function getUpdateCheckSetting() {
    const config = loadRawConfig();
    if (config.system && typeof config.system.updateCheck === "boolean") {
        return config.system.updateCheck;
    }
    return true;
}

function setUpdateCheckSetting(value) {
    const config = loadRawConfig();
    if (!config.system) {
        config.system = {};
    }
    config.system.updateCheck = Boolean(value);
    saveRawConfig(config);
}

function getLastUpdateCheckTime() {
    const config = loadRawConfig();
    return config.system && config.system.lastUpdateCheckTime
        ? Number(config.system.lastUpdateCheckTime)
        : 0;
}

function setLastUpdateCheckTime(timestamp) {
    const config = loadRawConfig();
    if (!config.system) {
        config.system = {};
    }
    config.system.lastUpdateCheckTime = Number(timestamp);
    saveRawConfig(config);
}

module.exports = {
    getConfigPath,
    ensureConfigFile,
    setLastRunProject,
    getLastRunProject,
    getSavedProjects,
    getAliases,
    addOrUpdateAlias,
    removeAlias,
    getGitUsers,
    addOrUpdateGitUser,
    removeGitUser,
    loadOrCreateRepoConfig,
    getRemoteBranchForRepo,
    setRemoteBranchForRepo,
    setProjectIdForRepo,
    exportConfig,
    setXamppPath,
    clearXamppPath,
    getXamppPath,
    setXamppCurrentVersion,
    clearXamppCurrentVersion,
    getXamppCurrentVersion,
    getUpdateCheckSetting,
    setUpdateCheckSetting,
    getLastUpdateCheckTime,
    setLastUpdateCheckTime,
    getSprintMailRecipients,
};
