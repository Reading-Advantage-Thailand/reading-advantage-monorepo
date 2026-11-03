import { eq } from "drizzle-orm";
import { users } from "@reading-advantage/db/schema";
import { AuthError } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";

/** GitHub pull request identity parsed from a PR URL. */
export interface GitHubPrRef {
  owner: string;
  repo: string;
  pullNumber: number;
}

/**
 * Looks up the GitHub login that opened a pull request.
 * Resolves null when the author cannot be read.
 */
export type PrAuthorLookup = (pr: GitHubPrRef) => Promise<string | null>;

/**
 * Reads the PR author from the GitHub REST API.
 * Uses the GitHub App installation token when the app is configured, and an
 * anonymous request otherwise.
 * @param pr The pull request to read.
 * @returns The lowercase author login, or null when GitHub does not answer with one.
 */
export const fetchGitHubPrAuthorLogin: PrAuthorLookup = async ({ owner, repo, pullNumber }) => {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  try {
    const { getGitHubClient } = await import("@reading-advantage/integrations-github");
    headers.Authorization = `Bearer ${await getGitHubClient().getInstallationTokenForRepo(owner, repo)}`;
  } catch {
    // GitHub App not configured or not installed on this repo: read anonymously.
  }
  try {
    const res = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}`,
      { headers },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { user?: { login?: unknown } };
    return typeof body.user?.login === "string" ? body.user.login.toLowerCase() : null;
  } catch {
    return null;
  }
};

/**
 * Confirms that the caller's linked GitHub username opened the pull request.
 * @param db Tenant DB; the caller's own `users` row is read unscoped by id.
 * @param userId The caller's user id.
 * @param pr The pull request the caller submits.
 * @param lookupAuthor Reads the PR author from GitHub.
 * @throws AuthError FORBIDDEN when the caller has no linked username, the author is unknown, or the author is someone else.
 */
export async function assertCallerAuthoredPr(
  db: TenantDB,
  userId: string,
  pr: GitHubPrRef,
  lookupAuthor: PrAuthorLookup,
): Promise<void> {
  const rawDb = db.unscoped("codecamp PR author check reads only the caller's own users row by id");
  const [caller] = await rawDb.select({ githubUsername: users.githubUsername }).from(users).where(eq(users.id, userId)).limit(1);
  const callerLogin = caller?.githubUsername?.replace(/^@/, "").toLowerCase();
  if (!callerLogin) throw new AuthError("Link your GitHub username before you submit a PR", "FORBIDDEN");
  const authorLogin = await lookupAuthor(pr);
  if (!authorLogin) throw new AuthError("Could not confirm the PR author on GitHub", "FORBIDDEN");
  if (authorLogin.toLowerCase() !== callerLogin) throw new AuthError("You can only submit a PR that you opened", "FORBIDDEN");
}
