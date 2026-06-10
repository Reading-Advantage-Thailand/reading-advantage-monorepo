export type { PracticeIssue } from "@reading-advantage/integrations-github";

/**
 * Fetch practice issues from a GitHub repository.
 * Uses the shared GitHubClient adapter — no direct fetch or transport concerns.
 * @param repoOwner Repository owner.
 * @param repoName Repository name.
 * @returns Array of practice issues (excluding pull requests).
 */
export async function getPracticeIssues(
  repoOwner: string,
  repoName: string
): Promise<import("@reading-advantage/integrations-github").PracticeIssue[]> {
  try {
    const { getGitHubClient } = await import(
      "@reading-advantage/integrations-github"
    );
    const client = getGitHubClient();
    return await client.getPracticeIssues(repoOwner, repoName, {
      state: "open",
      perPage: 20,
    });
  } catch (err) {
    console.warn(`[getPracticeIssues] GitHub API error: ${err}`);
    return [];
  }
}
