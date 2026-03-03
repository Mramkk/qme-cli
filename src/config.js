const fs = require("fs");
const path = require("path");
const os = require("os");

const CONFIG_PATH = path.join(os.homedir(), ".qme-cli.json");
const DEFAULT_BRANCH = "main";

function loadRawConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        return { repos: {}, system: {} };
    }

    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

    if (!parsed.repos) {
        parsed.repos = {};
    }

    if (!parsed.system) {
        parsed.system = {};
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
        : JSON.stringify({ repos: {}, system: {} }, null, 2);

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

module.exports = {
    getConfigPath,
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
