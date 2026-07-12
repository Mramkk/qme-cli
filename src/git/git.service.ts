import { Injectable } from "@nestjs/common";
import { execSync } from "child_process";
import { getGitUser, getProjectRepoUrl, getCurrentBranch } from "../utils";

@Injectable()
export class GitService {
  getProjectRepoUrl(): string | null {
    return getProjectRepoUrl();
  }

  getCurrentBranch(): string {
    return getCurrentBranch();
  }

  getGitUser(scope: string): { name: string; email: string } | null {
    return getGitUser(scope);
  }

  isInsideGitRepo(): boolean {
    try {
      return execSync("git rev-parse --is-inside-work-tree", { encoding: "utf8" }).trim() === "true";
    } catch {
      return false;
    }
  }
}
