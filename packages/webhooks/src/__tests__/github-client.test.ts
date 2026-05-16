import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHmac } from "crypto";

vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>();
  return {
    ...actual,
    sign: vi.fn().mockReturnValue(Buffer.from("mocksig")),
  };
});

import {
  verifyWebhookSignature,
  parsePrUrl,
  generateAppJWT,
  getInstallationTokenForRepo,
  fetchPrDiff,
  postPrComment,
  postReviewComment,
} from "../github-client.js";

// ─── parsePrUrl ──────────────────────────────────────────────

describe("parsePrUrl", () => {
  it("parses a standard GitHub PR URL", () => {
    const result = parsePrUrl("https://github.com/owner/repo/pull/123");
    expect(result).toEqual({
      owner: "owner",
      repo: "repo",
      pullNumber: 123,
    });
  });

  it("handles hyphens and dots in owner and repo names", () => {
    const result = parsePrUrl("https://github.com/my-org/my-repo.v2/pull/42");
    expect(result).toEqual({
      owner: "my-org",
      repo: "my-repo.v2",
      pullNumber: 42,
    });
  });

  it("returns null for non-GitHub URLs", () => {
    expect(parsePrUrl("https://gitlab.com/owner/repo/-/merge_requests/1")).toBeNull();
  });

  it("returns null for malformed URLs", () => {
    expect(parsePrUrl("not-a-url")).toBeNull();
    expect(parsePrUrl("https://github.com/owner")).toBeNull();
    expect(parsePrUrl("https://github.com/owner/repo")).toBeNull();
    expect(parsePrUrl("")).toBeNull();
  });

  it("rejects URLs with path traversal in owner/repo (SSRF defense)", () => {
    // The regex only matches alphanumeric, hyphens, underscores, and dots
    // Path traversal attempts like ../ should not match
    expect(parsePrUrl("https://github.com/../etc/passwd/pull/1")).toBeNull();
  });

  it("handles underscores in owner and repo names", () => {
    const result = parsePrUrl("https://github.com/my_org/my_repo/pull/7");
    expect(result).toEqual({
      owner: "my_org",
      repo: "my_repo",
      pullNumber: 7,
    });
  });
});

// ─── verifyWebhookSignature ──────────────────────────────────

describe("verifyWebhookSignature", () => {
  const originalEnv = process.env.GITHUB_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.GITHUB_WEBHOOK_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.GITHUB_WEBHOOK_SECRET = originalEnv;
  });

  it("returns true for valid signature", () => {
    const payload = '{"action":"opened"}';
    const signature = `sha256=${createHmac("sha256", "test-secret").update(payload).digest("hex")}`;
    expect(verifyWebhookSignature(payload, signature)).toBe(true);
  });

  it("returns false for invalid signature", () => {
    expect(verifyWebhookSignature("payload", "sha256=invalid")).toBe(false);
  });

  it("returns false when secret is not set", () => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
    expect(verifyWebhookSignature("payload", "sha256=any")).toBe(false);
  });

  it("returns false for mismatched signature lengths", () => {
    expect(verifyWebhookSignature("payload", "sha256=short")).toBe(false);
  });
});

// ─── generateAppJWT ──────────────────────────────────────────

describe("generateAppJWT", () => {
  it("throws if GITHUB_APP_ID or GITHUB_PRIVATE_KEY is missing", () => {
    delete process.env.GITHUB_APP_ID;
    delete process.env.GITHUB_PRIVATE_KEY;
    expect(() => generateAppJWT()).toThrow("GITHUB_APP_ID and GITHUB_PRIVATE_KEY must be configured");
  });
});

// ─── getInstallationTokenForRepo ─────────────────────────────

describe("getInstallationTokenForRepo", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.GITHUB_APP_ID = "123456";
    process.env.GITHUB_PRIVATE_KEY = "-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJBALr";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.GITHUB_INSTALLATION_ID;
  });

  it("returns undefined when GITHUB_INSTALLATION_ID is not set", async () => {
    delete process.env.GITHUB_INSTALLATION_ID;
    const result = await getInstallationTokenForRepo();
    expect(result).toBeUndefined();
  });

  it("returns a token when GITHUB_INSTALLATION_ID is set", async () => {
    process.env.GITHUB_INSTALLATION_ID = "987654";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ token: "ghs_installation_token" }),
    } as unknown as Response);

    const result = await getInstallationTokenForRepo();
    expect(result).toBe("ghs_installation_token");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/app/installations/987654/access_tokens",
      expect.objectContaining({ method: "POST" })
    );
  });
});

// ─── fetchPrDiff ─────────────────────────────────────────────

describe("fetchPrDiff", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns mock diff when no token is provided", async () => {
    const result = await fetchPrDiff({ owner: "org", repo: "repo", pullNumber: 1 });
    expect(result).toContain("Mock diff");
    expect(result).toContain("org/repo");
  });

  it("fetches diff from GitHub API when token is provided", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue("diff --git a/file.ts b/file.ts\n+const x = 1;"),
    } as unknown as Response);

    const result = await fetchPrDiff({ owner: "org", repo: "repo", pullNumber: 1 }, "token");
    expect(result).toContain("+const x = 1;");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/org/repo/pulls/1",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/vnd.github.v3.diff",
        }),
      })
    );
  });

  it("throws when GitHub API returns an error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue("Not Found"),
    } as unknown as Response);

    await expect(
      fetchPrDiff({ owner: "org", repo: "repo", pullNumber: 1 }, "token")
    ).rejects.toThrow("Failed to fetch PR diff");
  });
});

// ─── postPrComment ───────────────────────────────────────────

describe("postPrComment", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns early when no token is provided", async () => {
    await postPrComment({ owner: "org", repo: "repo", pullNumber: 1 }, "Great work!");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("posts a comment to the GitHub API", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
    } as unknown as Response);

    await postPrComment({ owner: "org", repo: "repo", pullNumber: 1 }, "Great work!", "token");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/org/repo/issues/1/comments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ body: "Great work!" }),
      })
    );
  });

  it("throws when GitHub API returns an error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue("Forbidden"),
    } as unknown as Response);

    await expect(
      postPrComment({ owner: "org", repo: "repo", pullNumber: 1 }, "Great work!", "token")
    ).rejects.toThrow("Failed to post PR comment");
  });
});

// ─── postReviewComment ───────────────────────────────────────

describe("postReviewComment", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns early when no token is provided", async () => {
    await postReviewComment(
      { owner: "org", repo: "repo", pullNumber: 1 },
      { body: "Nice work", path: "file.ts", line: 5 },
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("creates a new review when no existing reviews are found", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
      } as unknown as Response);

    await postReviewComment(
      { owner: "org", repo: "repo", pullNumber: 1 },
      { body: "Nice work", path: "file.ts", line: 5 },
      "token",
    );

    const calls = vi.mocked(global.fetch).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[1][0]).toContain("/pulls/1/reviews");
  });

  it("adds a comment to an existing review", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([{ id: 123 }]),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
      } as unknown as Response);

    await postReviewComment(
      { owner: "org", repo: "repo", pullNumber: 1 },
      { body: "Fix this", path: "file.ts", line: 10, commitId: "abc123" },
      "token",
    );

    const calls = vi.mocked(global.fetch).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[1][0]).toContain("/reviews/123/comments");
  });

  it("throws when fetching reviews fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue("Not Found"),
    } as unknown as Response);

    await expect(
      postReviewComment(
        { owner: "org", repo: "repo", pullNumber: 1 },
        { body: "Nice work" },
        "token",
      )
    ).rejects.toThrow("Failed to fetch PR reviews");
  });
});
