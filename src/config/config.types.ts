export interface SavedProject {
  path: string;
  type: string;
  updatedAt: string;
  phpVersion?: string;
  laravelVersion?: string;
}

export interface GitUser {
  name: string;
  email: string;
}

export interface RepoConfig {
  remoteBranch: string;
  project_id?: string;
}

