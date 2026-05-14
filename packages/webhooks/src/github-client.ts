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

// ─── Configuration ────────────────────────────────────────

function getAppId(): string {
  return process.env.GITHUB_APP_ID ?? "";
}

function getPrivateKey(): string {
  return process.env.GITHUB_PRIVATE_KEY ?? "";
}

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

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "";
  if (!secret) {
    console.warn("[GitHub Webhook] GITHUB_WEBHOOK_SECRET is not set");
    return false;
  }
  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
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
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
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
    `https://api.github.com/repos/${owner}/${repo}/issues/${pullNumber}/comments`,
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
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
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
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
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
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/reviews/${reviewId}/comments`,
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
 */
export function parsePrUrl(prUrl: string): GitHubPRInfo | null {
  const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    pullNumber: parseInt(match[3], 10),
  };
}
