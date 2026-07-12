import { Injectable } from "@nestjs/common";
import { getCurrentBranch, getCurrentIpAddress, getProjectRepoUrl } from "../utils";

@Injectable()
export class SystemService {
  getCurrentIpAddress(): string {
    return getCurrentIpAddress();
  }

  getProjectRepoUrl(): string | null {
    return getProjectRepoUrl();
  }

  getCurrentBranch(): string {
    return getCurrentBranch();
  }
}
