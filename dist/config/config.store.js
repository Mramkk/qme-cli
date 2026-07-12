"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRawConfig = loadRawConfig;
exports.saveRawConfig = saveRawConfig;
exports.getConfigPath = getConfigPath;
exports.ensureConfigFile = ensureConfigFile;
exports.getSavedProjects = getSavedProjects;
exports.setLastRunProject = setLastRunProject;
exports.loadOrCreateRepoConfig = loadOrCreateRepoConfig;
exports.getRemoteBranchForRepo = getRemoteBranchForRepo;
exports.setRemoteBranchForRepo = setRemoteBranchForRepo;
exports.setProjectIdForRepo = setProjectIdForRepo;
exports.getGitUsers = getGitUsers;
exports.getXamppPath = getXamppPath;
exports.getAliases = getAliases;
exports.addOrUpdateAlias = addOrUpdateAlias;
exports.removeAlias = removeAlias;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const PRIMARY_CONFIG_PATH = path.join(os.homedir(), ".qme-cli.json");
const FALLBACK_CONFIG_PATH = path.join(os.homedir(), ".mycli.json");
const CONFIG_PATH = fs.existsSync(PRIMARY_CONFIG_PATH)
    ? PRIMARY_CONFIG_PATH
    : fs.existsSync(FALLBACK_CONFIG_PATH)
        ? FALLBACK_CONFIG_PATH
        : PRIMARY_CONFIG_PATH;
const DEFAULT_CONFIG = {
    repos: {},
    system: { aliases: {}, projects: [] },
};
function normalizeConfig(config) {
    const raw = config ?? {};
    return {
        repos: raw.repos && typeof raw.repos === "object" ? raw.repos : {},
        system: {
            aliases: raw.system && raw.system.aliases && typeof raw.system.aliases === "object"
                ? raw.system.aliases
                : {},
            projects: Array.isArray(raw.system?.projects) ? raw.system.projects : [],
            lastRunProject: raw.system?.lastRunProject,
            xamppPath: raw.system?.xamppPath,
            xamppCurrentVersion: raw.system?.xamppCurrentVersion,
            gitUsers: Array.isArray(raw.system?.gitUsers) ? raw.system.gitUsers : [],
        },
    };
}
function loadRawConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        return structuredClone(DEFAULT_CONFIG);
    }
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    return normalizeConfig(parsed);
}
function saveRawConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}
function getConfigPath() {
    return CONFIG_PATH;
}
function ensureConfigFile() {
    if (!fs.existsSync(CONFIG_PATH)) {
        saveRawConfig(structuredClone(DEFAULT_CONFIG));
    }
    return CONFIG_PATH;
}
function getSavedProjects() {
    return loadRawConfig().system.projects.filter(Boolean);
}
function setLastRunProject(project) {
    const projectPath = String(project.path || "").trim();
    const projectType = String(project.type || "").trim();
    if (!projectPath || !projectType)
        return false;
    const config = loadRawConfig();
    const nextProject = {
        path: projectPath,
        type: projectType,
        updatedAt: new Date().toISOString(),
    };
    if (project.phpVersion)
        nextProject.phpVersion = String(project.phpVersion).trim();
    if (project.laravelVersion)
        nextProject.laravelVersion = String(project.laravelVersion).trim();
    const projects = config.system.projects.filter((item) => item && typeof item === "object");
    const existingIndex = projects.findIndex((item) => String(item.path || "").trim().toLowerCase() === projectPath.toLowerCase());
    if (existingIndex >= 0)
        projects[existingIndex] = nextProject;
    else
        projects.push(nextProject);
    config.system.projects = projects;
    saveRawConfig(config);
    return true;
}
function loadOrCreateRepoConfig(repoUrl) {
    const config = loadRawConfig();
    if (!config.repos[repoUrl])
        config.repos[repoUrl] = { remoteBranch: "main" };
    if (!config.repos[repoUrl].remoteBranch)
        config.repos[repoUrl].remoteBranch = "main";
    saveRawConfig(config);
    return { repoUrl, ...config.repos[repoUrl] };
}
function getRemoteBranchForRepo(repoUrl) {
    return loadRawConfig().repos[repoUrl]?.remoteBranch || "main";
}
function setRemoteBranchForRepo(repoUrl, branch) {
    const config = loadRawConfig();
    config.repos[repoUrl] = { ...(config.repos[repoUrl] || { remoteBranch: "main" }), remoteBranch: branch };
    saveRawConfig(config);
}
function setProjectIdForRepo(repoUrl, projectId) {
    const config = loadRawConfig();
    config.repos[repoUrl] = { ...(config.repos[repoUrl] || { remoteBranch: "main" }), project_id: projectId };
    saveRawConfig(config);
}
function getGitUsers() {
    return loadRawConfig().system.gitUsers || [];
}
function getXamppPath() {
    return String(loadRawConfig().system.xamppPath || "").trim().replace(/^"+|"+$/g, "").replace(/[\\\/]+$/, "");
}
function normalizeAliasName(name) {
    const trimmed = String(name || "").trim();
    if (!trimmed)
        return "";
    if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]*$/.test(trimmed))
        return "";
    return trimmed;
}
function normalizeAliasTokens(tokens) {
    if (!Array.isArray(tokens))
        return null;
    const cleaned = tokens.map((t) => String(t || "").trim()).filter(Boolean);
    return cleaned.length ? cleaned : null;
}
function getAliases() {
    const raw = loadRawConfig().system.aliases || {};
    const normalized = {};
    for (const [name, value] of Object.entries(raw)) {
        const normalizedName = normalizeAliasName(name);
        const normalizedTokens = normalizeAliasTokens(Array.isArray(value) ? value : null);
        if (normalizedName && normalizedTokens)
            normalized[normalizedName] = normalizedTokens;
    }
    return normalized;
}
function addOrUpdateAlias(name, tokens) {
    const normalizedName = normalizeAliasName(name);
    const normalizedTokens = normalizeAliasTokens(tokens);
    if (!normalizedName || !normalizedTokens)
        return false;
    const config = loadRawConfig();
    config.system.aliases[normalizedName] = normalizedTokens;
    saveRawConfig(config);
    return true;
}
function removeAlias(name) {
    const normalizedName = normalizeAliasName(name);
    if (!normalizedName)
        return false;
    const config = loadRawConfig();
    if (!Object.prototype.hasOwnProperty.call(config.system.aliases, normalizedName))
        return false;
    delete config.system.aliases[normalizedName];
    saveRawConfig(config);
    return true;
}
