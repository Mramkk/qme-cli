import { Injectable } from "@nestjs/common";
import {
  addOrUpdateAlias,
  ensureConfigFile,
  getConfigPath,
  getAliases,
  getGitUsers,
  getRemoteBranchForRepo,
  getSavedProjects,
  loadOrCreateRepoConfig,
  removeAlias,
  setRemoteBranchForRepo,
} from "./config.store";

@Injectable()
export class ConfigService {
  getConfigPath(): string {
    return getConfigPath();
  }

  ensureConfigFile(): string {
    return ensureConfigFile();
  }

  getSavedProjects(): unknown[] {
    return getSavedProjects();
  }

  getAliases(): Record<string, string[]> {
    return getAliases();
  }

  getGitUsers(): unknown[] {
    return getGitUsers();
  }

  setRemoteBranchForRepo(repoUrl: string, branch: string): void {
    setRemoteBranchForRepo(repoUrl, branch);
  }

  getRemoteBranchForRepo(repoUrl: string): string {
    return getRemoteBranchForRepo(repoUrl);
  }

  loadOrCreateRepoConfig(repoUrl: string): unknown {
    return loadOrCreateRepoConfig(repoUrl);
  }

  addOrUpdateAlias(name: string, tokens: string[]): boolean {
    return addOrUpdateAlias(name, tokens);
  }

  removeAlias(name: string): boolean {
    return removeAlias(name);
  }
}
