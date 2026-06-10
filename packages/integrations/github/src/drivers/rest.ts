import type {
  GitHubClient,
  PracticeIssue,
  Repository,
  ListIssuesOptions,
} from "../client.js";
import { GitHubClientError } from "../client.js";
import { createSign } from "node:crypto";

/**
 * Configuration for the REST GitHub driver.
 */
export interface GitHubRestConfig {
  /** GitHub App ID. */
  appId: string;
  /** GitHub App private key (PEM format). */
  privateKey: string;
  /** Default installation ID for single-org setups. */
  installationId?: string;
}

/** Minimal JWT helper for GitHub App auth (RS256). */
function createJwt(appId: string, privateKey: string): string {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,
    exp: now + 600,
    iss: appId,
  };

  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  // Use Node.js crypto for RS256 signing
  const sign = createSign("RSA-SHA256");
  sign.update(unsignedToken);
  const signature = sign
    .sign(privateKey, "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${unsignedToken}.${signature}`;
}

/**
 * GitHub REST API driver.
 * Uses GitHub App authentication with installation tokens.
 */
export class GitHubRestDriver implements GitHubClient {
  private readonly appId: string;
  private readonly privateKey: string;
  private readonly defaultInstallationId?: string;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(config: GitHubRestConfig) {
    this.appId = config.appId;
    this.privateKey = config.privateKey;
    this.defaultInstallationId = config.installationId;
  }

  /**
   * Get a fresh installation access token, caching it for reuse.
   */
  private async getInstallationToken(installationId: string): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now) {
      return this.cachedToken.token;
    }

    const jwt = createJwt(this.appId, this.privateKey);
    const res = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${jwt}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!res.ok) {
      throw new GitHubClientError(
        `Failed to get installation token: ${res.status}`,
        res.status
      );
    }

    const data = (await res.json()) as { token: string; expires_at: string };
    this.cachedToken = {
      token: data.token,
      expiresAt: new Date(data.expires_at).getTime() - 60_000,
    };
    return this.cachedToken.token;
  }

  /**
   * List issues for a repository, excluding pull requests.
   */
  async getPracticeIssues(
    owner: string,
    repo: string,
    options?: ListIssuesOptions
  ): Promise<PracticeIssue[]> {
    const token = await this.getInstallationToken(
      this.defaultInstallationId ?? ""
    );
    const params = new URLSearchParams({
      state: options?.state ?? "open",
      per_page: String(options?.perPage ?? 20),
    });
    if (options?.labels?.length) {
      params.set("labels", options.labels.join(","));
    }

    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?${params}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `token ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!res.ok) {
      throw new GitHubClientError(
        `GitHub API returned ${res.status} for ${owner}/${repo}`,
        res.status
      );
    }

    const data = (await res.json()) as Array<{
      number: number;
      title: string;
      body: string | null;
      html_url: string;
      labels: Array<{ name: string }>;
      state: string;
      created_at: string;
      updated_at: string;
      pull_request?: unknown;
    }>;

    return data
      .filter((item) => !item.pull_request)
      .map((item) => ({
        number: item.number,
        title: item.title,
        body: item.body,
        state: item.state as "open" | "closed",
        labels: item.labels.map((l) => l.name),
        htmlUrl: item.html_url,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
  }

  /**
   * Get an installation access token for a repository.
   */
  async getInstallationTokenForRepo(
    _owner: string,
    _repo: string
  ): Promise<string> {
    return this.getInstallationToken(this.defaultInstallationId ?? "");
  }

  /**
   * List repositories accessible by the installation.
   */
  async listRepositoriesForInstallation(
    installationId: string
  ): Promise<Repository[]> {
    const token = await this.getInstallationToken(installationId);
    const res = await fetch(
      `https://api.github.com/installation/repositories`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `token ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!res.ok) {
      throw new GitHubClientError(
        `Failed to list repositories: ${res.status}`,
        res.status
      );
    }

    const data = (await res.json()) as {
      repositories: Array<{
        id: number;
        name: string;
        full_name: string;
        html_url: string;
      }>;
    };

    return data.repositories.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      htmlUrl: r.html_url,
    }));
  }
}
