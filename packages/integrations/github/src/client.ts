import { z } from "zod";

/**
 * A GitHub issue returned by the REST API.
 */
export interface PracticeIssue {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  labels: string[];
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * A GitHub repository.
 */
export interface Repository {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
}

/**
 * Options for listing practice issues.
 */
export interface ListIssuesOptions {
  state?: "open" | "closed" | "all";
  labels?: string[];
  perPage?: number;
}

/**
 * Provider-agnostic GitHub client interface.
 */
export interface GitHubClient {
  /**
   * List issues for a repository (excluding pull requests).
   * @param owner Repository owner.
   * @param repo Repository name.
   * @param options Optional filters.
   * @returns Array of practice issues.
   */
  getPracticeIssues(
    owner: string,
    repo: string,
    options?: ListIssuesOptions
  ): Promise<PracticeIssue[]>;

  /**
   * Get an installation access token for a repository.
   * @param owner Repository owner.
   * @param repo Repository name.
   * @returns The installation access token.
   */
  getInstallationTokenForRepo(owner: string, repo: string): Promise<string>;

  /**
   * List repositories accessible by the current installation.
   * @param installationId The installation ID.
   * @returns Array of repositories.
   */
  listRepositoriesForInstallation(installationId: string): Promise<Repository[]>;
}

/** Error thrown when a GitHub API call fails. */
export class GitHubClientError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "GitHubClientError";
  }
}

/**
 * Configuration for creating a GitHubClient instance.
 */
export const githubConfigSchema = z.object({
  appId: z.string().min(1),
  privateKey: z.string().min(1),
  installationId: z.string().optional(),
});

export type GitHubConfig = z.infer<typeof githubConfigSchema>;
