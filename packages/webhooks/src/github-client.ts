import { createHmac, sign, timingSafeEqual } from "crypto";

// ─── Types ────────────────────────────────────────────────

export interface GitHubComment {
  body: string;
  path?: string;
  line?: number;
  commitId?: string;
}

export interface GitHubPRInfo {
  owner: string;
  repo: string;
  pullNumber: number;
}

/** A bounded, non-authoritative projection of one GitHub Check Run. */
export interface GitHubCheckRunEvidence {
  /** GitHub-authored check name. */
  name: string;
  /** Lifecycle status reported by GitHub. */
  status: "queued" | "in_progress" | "completed";
  /** Terminal conclusion reported by GitHub, when completed. */
  conclusion: "action_required" | "cancelled" | "failure" | "neutral" | "skipped" | "stale" | "success" | "timed_out" | null;
  /** GitHub HTTPS URL for inspecting the check details, when provided. */
  detailsUrl: string | null;
}

/** Bounded check-run context that may be supplied to a PR review prompt. */
export interface GitHubCheckEvidence {
  /** Whether the worker obtained check data from GitHub. */
  availability: "available" | "unavailable";
  /** Stable absence reason; never a raw upstream error message. */
  reason: "github_token_unavailable" | "github_check_runs_unavailable" | "missing_head_sha" | null;
  /** Check-run summaries, capped before entering application context. */
  checkRuns: GitHubCheckRunEvidence[];
}

// ─── Configuration ────────────────────────────────────────

export /**
 * Gets the GitHub App ID from the GITHUB_APP_ID environment variable.
 * @returns The app ID string, or empty string if not configured.
 */
function getAppId(): string {
  return process.env.GITHUB_APP_ID ?? "";
}

export /**
 * Gets the GitHub App private key from the GITHUB_PRIVATE_KEY environment variable.
 * @returns The private key string, or empty string if not configured.
 */
function getPrivateKey(): string {
  return process.env.GITHUB_PRIVATE_KEY ?? "";
}

export /**
 * Gets the GitHub App installation ID from the GITHUB_INSTALLATION_ID environment variable.
 * @returns The installation ID string, or empty string if not configured.
 */
function getInstallationId(): string {
  return process.env.GITHUB_INSTALLATION_ID ?? "";
}

// ─── JWT Auth ─────────────────────────────────────────────

/**
 * Generate a GitHub App JWT for authenticating as the App.
 * The JWT is valid for 10 minutes.
 */
export function generateAppJWT(): string {
  const appId = getAppId();
  const privateKey = getPrivateKey();
  if (!appId || !privateKey) {
    throw new Error("GITHUB_APP_ID and GITHUB_PRIVATE_KEY must be configured");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,
    exp: now + 600,
    iss: appId,
  };

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signingInput = `${header}.${body}`;
  const signature = sign("sha256", Buffer.from(signingInput), privateKey).toString("base64url");

  return `${signingInput}.${signature}`;
}

/**
 * Get an installation access token for a given installation ID.
 * In production, you would look up the installation ID for the repo owner.
 */
export async function getInstallationToken(installationId: string): Promise<string> {
  const jwt = generateAppJWT();
  const res = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to get installation token: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as { token: string };
  return data.token;
}

// ─── Signature Verification ───────────────────────────────

/**
 * Maximum allowed skew between the webhook's timestamp and the
 * server's current time, in seconds. Matches GitHub's documented
 * delivery-time tolerance of 5 minutes.
 */
export const MAX_TIMESTAMP_SKEW_SECONDS = 300;

/**
 * Checks whether a webhook timestamp is finite and within the replay window.
 * @param timestamp The request timestamp in epoch seconds.
 * @returns True when the timestamp is usable and within the allowed skew.
 */
export function isWebhookTimestampFresh(timestamp: number): boolean {
  if (!Number.isFinite(timestamp)) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const skew = Math.abs(nowSeconds - timestamp);
  return skew <= MAX_TIMESTAMP_SKEW_SECONDS;
}

/**
 * Verifies the HMAC signature of a GitHub webhook payload and
 * rejects replay attacks by checking the request timestamp against
 * a tolerance window.
 * @param payload - The raw request body as a string.
 * @param signature - The x-hub-signature-256 header value.
 * @param timestamp - The request timestamp in epoch seconds (from
 *   the x-github-delivery-timestamp or x-hub-timestamp header).
 *   If undefined, the timestamp check is skipped (backward
 *   compatibility with older webhook deliveries).
 * @returns True if the signature is valid and the timestamp is
 *   within the tolerance window, false otherwise.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp?: number,
): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "";
  if (!secret) {
    console.warn("[GitHub Webhook] GITHUB_WEBHOOK_SECRET is not set");
    return false;
  }
  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  let sigValid: boolean;
  try {
    sigValid = timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
  if (!sigValid) return false;
  if (timestamp !== undefined && !isWebhookTimestampFresh(timestamp)) {
    console.warn(
      `[GitHub Webhook] Replay attack detected: timestamp ${timestamp} is outside max skew ${MAX_TIMESTAMP_SKEW_SECONDS}s`,
    );
    return false;
  }
  return true;
}

/**
 * Get a token for the configured installation.
 * Returns undefined if GitHub App credentials are not configured.
 */
export async function getInstallationTokenForRepo(): Promise<string | undefined> {
  const installationId = getInstallationId();
  if (!installationId) {
    return undefined;
  }
  return getInstallationToken(installationId);
}

// ─── PR Diff ──────────────────────────────────────────────

/**
 * Fetch the diff for a pull request.
 * Falls back to a mock diff in development if credentials are not configured.
 */
export async function fetchPrDiff(
  prInfo: GitHubPRInfo,
  token?: string
): Promise<string> {
  const { owner, repo, pullNumber } = prInfo;

  // Fallback for development — return a mock diff so the pipeline can be tested
  if (!token) {
    console.warn("[GitHub Client] No token provided; returning mock diff for development");
    return `diff --git a/README.md b/README.md\n+ Mock diff for PR #${pullNumber} in ${owner}/${repo}`;
  }

  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3.diff",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch PR diff: ${res.status} ${await res.text()}`);
  }

  return res.text();
}

const GITHUB_CHECK_STATUSES = new Set(["queued", "in_progress", "completed"]);
const GITHUB_CHECK_CONCLUSIONS = new Set(["action_required", "cancelled", "failure", "neutral", "skipped", "stale", "success", "timed_out"]);

/**
 * Fetches a bounded, neutral projection of GitHub Check Runs for one PR head.
 * @param prInfo Repository and pull-request identity.
 * @param headSha Git commit SHA whose checks are relevant to the reviewed revision.
 * @param token Optional GitHub App installation token.
 * @returns Check evidence or a stable unavailable state when checks cannot be obtained.
 */
export async function fetchPrCheckEvidence(
  prInfo: GitHubPRInfo,
  headSha: string,
  token?: string,
): Promise<GitHubCheckEvidence> {
  if (!/^[0-9a-f]{40}$/i.test(headSha)) {
    return { availability: "unavailable", reason: "missing_head_sha", checkRuns: [] };
  }
  if (!token) {
    return { availability: "unavailable", reason: "github_token_unavailable", checkRuns: [] };
  }

  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(prInfo.owner)}/${encodeURIComponent(prInfo.repo)}/commits/${headSha}/check-runs?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    },
  );
  if (!res.ok) {
    return { availability: "unavailable", reason: "github_check_runs_unavailable", checkRuns: [] };
  }

  const payload = await res.json() as { check_runs?: unknown };
  const rows = Array.isArray(payload.check_runs) ? payload.check_runs : [];
  const checkRuns: GitHubCheckRunEvidence[] = [];
  for (const row of rows) {
    if (checkRuns.length === 25 || typeof row !== "object" || row === null) break;
    const candidate = row as Record<string, unknown>;
    const name = typeof candidate.name === "string" ? candidate.name.trim().slice(0, 160) : "";
    const status = typeof candidate.status === "string" && GITHUB_CHECK_STATUSES.has(candidate.status) ? candidate.status as GitHubCheckRunEvidence["status"] : null;
    const conclusion = typeof candidate.conclusion === "string" && GITHUB_CHECK_CONCLUSIONS.has(candidate.conclusion)
      ? candidate.conclusion as NonNullable<GitHubCheckRunEvidence["conclusion"]>
      : null;
    const rawDetailsUrl = typeof candidate.details_url === "string" ? candidate.details_url : null;
    let detailsUrl: string | null = null;
    if (rawDetailsUrl) {
      try {
        const parsed = new URL(rawDetailsUrl);
        if (parsed.protocol === "https:" && (parsed.hostname === "github.com" || parsed.hostname.endsWith(".github.com"))) detailsUrl = parsed.toString();
      } catch {
        // Invalid or non-GitHub URLs never enter the trusted context.
      }
    }
    if (name && status) checkRuns.push({ name, status, conclusion, detailsUrl });
  }
  return { availability: "available", reason: null, checkRuns };
}

// ─── PR Comments ──────────────────────────────────────────

/**
 * Post a general comment on a pull request (not tied to a specific line).
 */
export async function postPrComment(
  prInfo: GitHubPRInfo,
  body: string,
  token?: string
): Promise<void> {
  const { owner, repo, pullNumber } = prInfo;

  if (!token) {
    console.warn("[GitHub Client] No token provided; skipping PR comment");
    return;
  }

  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${pullNumber}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to post PR comment: ${res.status} ${await res.text()}`);
  }
}

/**
 * Post a review comment on a specific line of a pull request.
 */
export async function postReviewComment(
  prInfo: GitHubPRInfo,
  comment: GitHubComment,
  token?: string
): Promise<void> {
  const { owner, repo, pullNumber } = prInfo;

  if (!token) {
    console.warn("[GitHub Client] No token provided; skipping review comment");
    return;
  }

  // Get the latest review ID or create a new review
  const reviewsRes = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/reviews`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!reviewsRes.ok) {
    throw new Error(`Failed to fetch PR reviews: ${reviewsRes.status} ${await reviewsRes.text()}`);
  }

  const reviews = (await reviewsRes.json()) as Array<{ id: number }>;
  const reviewId = reviews[0]?.id;

  if (!reviewId) {
    // Create a new review first
    const createRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/reviews`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: comment.body,
          event: "COMMENT",
          comments: comment.path && comment.line
            ? [{
                path: comment.path,
                line: comment.line,
                body: comment.body,
              }]
            : [],
        }),
      }
    );

    if (!createRes.ok) {
      throw new Error(`Failed to create PR review: ${createRes.status} ${await createRes.text()}`);
    }
    return;
  }

  // Add comment to existing review
  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/reviews/${reviewId}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: comment.path,
        line: comment.line,
        body: comment.body,
        commit_id: comment.commitId,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to post review comment: ${res.status} ${await res.text()}`);
  }
}

/**
 * Parse a GitHub PR URL into owner, repo, and pull number.
 * Validates owner and repo to prevent SSRF via crafted URL segments.
 */
export function parsePrUrl(prUrl: string): GitHubPRInfo | null {
  const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;

  const owner = match[1];
  const repo = match[2];
  const pullNumber = parseInt(match[3], 10);

  // Validate owner and repo match safe GitHub name patterns to prevent SSRF
  const safeNamePattern = /^[a-zA-Z0-9\-_.]+$/;
  if (!safeNamePattern.test(owner) || !safeNamePattern.test(repo)) {
    return null;
  }

  return { owner, repo, pullNumber };
}
