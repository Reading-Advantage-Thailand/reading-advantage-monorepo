import { githubConfigSchema, type GitHubClient } from "./client.js";
import { GitHubRestDriver } from "./drivers/rest.js";

/** Error thrown when GitHub integration is accessed but not configured. */
export class GitHubNotConfiguredError extends Error {
  constructor() {
    super(
      "GitHub integration is not configured. Set GITHUB_APP_ID, GITHUB_PRIVATE_KEY (or GITHUB_APP_PRIVATE_KEY), and optionally GITHUB_INSTALLATION_ID environment variables."
    );
    this.name = "GitHubNotConfiguredError";
  }
}

let cachedClient: GitHubClient | null = null;

/**
 * Create a GitHubClient from explicit configuration.
 * @param config The GitHub configuration.
 * @returns A new GitHubClient instance.
 */
export function createGitHubClient(config: {
  appId: string;
  privateKey: string;
  installationId?: string;
}): GitHubClient {
  return new GitHubRestDriver(config);
}

/**
 * Get or create the lazily-initialized GitHubClient singleton.
 * Reads environment variables on first call only.
 * @returns The GitHubClient singleton.
 * @throws {GitHubNotConfiguredError} If env vars are missing.
 */
export function getGitHubClient(): GitHubClient {
  if (cachedClient) return cachedClient;

  const raw = {
    appId: process.env.GITHUB_APP_ID,
    privateKey: process.env.GITHUB_PRIVATE_KEY ?? process.env.GITHUB_APP_PRIVATE_KEY,
    installationId: process.env.GITHUB_INSTALLATION_ID,
  };

  const result = githubConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new GitHubNotConfiguredError();
  }

  cachedClient = new GitHubRestDriver({
    appId: result.data.appId,
    privateKey: result.data.privateKey,
    installationId: result.data.installationId,
  });
  return cachedClient;
}

/**
 * Reset the memoized singleton. Intended for testing only.
 */
export function resetGitHubClient(): void {
  cachedClient = null;
}
