import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac } from "crypto";
import {
  verifyWebhookSignature,
  parsePrUrl,
  generateAppJWT,
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