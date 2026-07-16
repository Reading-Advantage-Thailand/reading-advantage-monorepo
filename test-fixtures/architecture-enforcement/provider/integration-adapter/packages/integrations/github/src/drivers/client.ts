import { Octokit } from "@octokit/rest";

/**
 * Constructs an Octokit client inside the exact integration driver root.
 * @returns Fixture GitHub client.
 */
export function createGitHubAdapterClient() {
  return new Octokit({ auth: "fixture" });
}
