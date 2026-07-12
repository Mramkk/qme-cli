import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { GitUser, RepoConfig, SavedProject } from "./config.types";

export interface RawConfig {
  repos: Record<string, RepoConfig>;
  system: {
    aliases: Record<string, string[]>;
    projects: SavedProject[];
    lastRunProject?: SavedProject;
    xamppPath?: string;
    xamppCurrentVersion?: string;
    gitUsers?: GitUser[];
  };
}

const PRIMARY_CONFIG_PATH = path.join(os.homedir(), ".qme-cli.json");
const FALLBACK_CONFIG_PATH = path.join(os.homedir(), ".mycli.json");
const CONFIG_PATH = fs.existsSync(PRIMARY_CONFIG_PATH)
  ? PRIMARY_CONFIG_PATH
  : fs.existsSync(FALLBACK_CONFIG_PATH)
    ? FALLBACK_CONFIG_PATH
    : PRIMARY_CONFIG_PATH;

const DEFAULT_CONFIG: RawConfig = {
  repos: {},
  system: { aliases: {}, projects: [] },
};

function normalizeConfig(config: Partial<RawConfig> | undefined): RawConfig {
  const raw = config ?? {};
  return {
    repos: raw.repos && typeof raw.repos === "object" ? raw.repos : {},
    system: {
      aliases:
        raw.system && raw.system.aliases && typeof raw.system.aliases === "object"
          ? raw.system.aliases
          : {},
      projects: Array.isArray(raw.system?.projects) ? raw.system!.projects : [],
      lastRunProject: raw.system?.lastRunProject,
      xamppPath: raw.system?.xamppPath,
      xamppCurrentVersion: raw.system?.xamppCurrentVersion,
      gitUsers: Array.isArray(raw.system?.gitUsers) ? raw.system!.gitUsers : [],
    },
  };
}

export function loadRawConfig(): RawConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    return structuredClone(DEFAULT_CONFIG);
  }

  const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) as Partial<RawConfig>;
  return normalizeConfig(parsed);
}

export function saveRawConfig(config: RawConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export function ensureConfigFile(): string {
  if (!fs.existsSync(CONFIG_PATH)) {
    saveRawConfig(structuredClone(DEFAULT_CONFIG));
  }

  return CONFIG_PATH;
}

export function getSavedProjects(): SavedProject[] {
  return loadRawConfig().system.projects.filter(Boolean);
}

export function setLastRunProject(project: Partial<SavedProject>): boolean {
  const projectPath = String(project.path || "").trim();
  const projectType = String(project.type || "").trim();
  if (!projectPath || !projectType) return false;

  const config = loadRawConfig();
  const nextProject: SavedProject = {
    path: projectPath,
    type: projectType,
    updatedAt: new Date().toISOString(),
  };
  if (project.phpVersion) nextProject.phpVersion = String(project.phpVersion).trim();
  if (project.laravelVersion) nextProject.laravelVersion = String(project.laravelVersion).trim();

  const projects = config.system.projects.filter((item) => item && typeof item === "object");
  const existingIndex = projects.findIndex(
    (item) => String(item.path || "").trim().toLowerCase() === projectPath.toLowerCase(),
  );
  if (existingIndex >= 0) projects[existingIndex] = nextProject;
  else projects.push(nextProject);

  config.system.projects = projects;
  saveRawConfig(config);
  return true;
}

export function loadOrCreateRepoConfig(repoUrl: string): RepoConfig & { repoUrl: string } {
  const config = loadRawConfig();
  if (!config.repos[repoUrl]) config.repos[repoUrl] = { remoteBranch: "main" };
  if (!config.repos[repoUrl].remoteBranch) config.repos[repoUrl].remoteBranch = "main";
  saveRawConfig(config);
  return { repoUrl, ...config.repos[repoUrl] };
}

export function getRemoteBranchForRepo(repoUrl: string): string {
  return loadRawConfig().repos[repoUrl]?.remoteBranch || "main";
}

export function setRemoteBranchForRepo(repoUrl: string, branch: string): void {
  const config = loadRawConfig();
  config.repos[repoUrl] = { ...(config.repos[repoUrl] || { remoteBranch: "main" }), remoteBranch: branch };
  saveRawConfig(config);
}

export function setProjectIdForRepo(repoUrl: string, projectId: string): void {
  const config = loadRawConfig();
  config.repos[repoUrl] = { ...(config.repos[repoUrl] || { remoteBranch: "main" }), project_id: projectId };
  saveRawConfig(config);
}

export function getGitUsers(): GitUser[] {
  return loadRawConfig().system.gitUsers || [];
}

export function getXamppPath(): string {
  return String(loadRawConfig().system.xamppPath || "").trim().replace(/^"+|"+$/g, "").replace(/[\\\/]+$/, "");
}

function normalizeAliasName(name: string): string {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "";
  if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]*$/.test(trimmed)) return "";
  return trimmed;
}

function normalizeAliasTokens(tokens: string[] | null | undefined): string[] | null {
  if (!Array.isArray(tokens)) return null;
  const cleaned = tokens.map((t) => String(t || "").trim()).filter(Boolean);
  return cleaned.length ? cleaned : null;
}

export function getAliases(): Record<string, string[]> {
  const raw = loadRawConfig().system.aliases || {};
  const normalized: Record<string, string[]> = {};
  for (const [name, value] of Object.entries(raw)) {
    const normalizedName = normalizeAliasName(name);
    const normalizedTokens = normalizeAliasTokens(Array.isArray(value) ? value : null);
    if (normalizedName && normalizedTokens) normalized[normalizedName] = normalizedTokens;
  }
  return normalized;
}

export function addOrUpdateAlias(name: string, tokens: string[]): boolean {
  const normalizedName = normalizeAliasName(name);
  const normalizedTokens = normalizeAliasTokens(tokens);
  if (!normalizedName || !normalizedTokens) return false;

  const config = loadRawConfig();
  config.system.aliases[normalizedName] = normalizedTokens;
  saveRawConfig(config);
  return true;
}

export function removeAlias(name: string): boolean {
  const normalizedName = normalizeAliasName(name);
  if (!normalizedName) return false;

  const config = loadRawConfig();
  if (!Object.prototype.hasOwnProperty.call(config.system.aliases, normalizedName)) return false;
  delete config.system.aliases[normalizedName];
  saveRawConfig(config);
  return true;
}
