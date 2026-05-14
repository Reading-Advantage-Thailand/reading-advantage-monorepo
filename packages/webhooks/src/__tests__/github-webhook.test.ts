import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { createHmac } from "crypto";
import githubApp from "../github.js";

// Mock domain functions before importing the route
vi.mock("@reading-advantage/domain/codecamp", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/domain/codecamp")>("@reading-advantage/domain/codecamp");
  return {
    ...actual,
    getPrReviewByPrUrl: vi.fn(),
    updatePrReview: vi.fn(),
    createPrReview: vi.fn(),
  };
});

import {
  getPrReviewByPrUrl,
  updatePrReview,
  createPrReview,
} from "@reading-advantage/domain/codecamp";

const WEBHOOK_SECRET = "test-secret";

function signPayload(payload: string): string {
  return `sha256=${createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex")}`;
}

function createRequest(payload: string, options: {
  signature?: string;
  event?: string;
} = {}): Request {
  const sig = options.signature ?? signPayload(payload);
  const event = options.event ?? "pull_request";
  return new Request("http://localhost/pr", {
    method: "POST",
    headers: {
      "x-hub-signature-256": sig,
      "x-github-event": event,
      "content-type": "application/json",
    },
    body: payload,
  });
}

describe("GitHub webhook handler", () => {
  beforeAll(() => {
    process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  afterAll(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  it("returns 401 when signature is missing", async () => {
    const req = new Request("http://localhost/pr", {
      method: "POST",
      headers: { "x-github-event": "pull_request" },
      body: "{}",
    });
    const res = await githubApp.fetch(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Missing signature");
  });

  it("returns 401 when signature is invalid", async () => {
    const payload = JSON.stringify({ action: "opened" });
    const req = createRequest(payload, { signature: "sha256=invalid" });
    const res = await githubApp.fetch(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Invalid signature");
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = createRequest("not json");
    const res = await githubApp.fetch(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid JSON");
  });

  it("returns 200 and ignores non-PR events", async () => {
    const payload = JSON.stringify({ action: "opened" });
    const req = createRequest(payload, { event: "push" });
    const res = await githubApp.fetch(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ignored).toContain("push");
  });

  it("returns 400 when payload fails validation", async () => {
    const payload = JSON.stringify({ action: "opened", pull_request: {} });
    const req = createRequest(payload);
    const res = await githubApp.fetch(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid payload");
  });

  it("returns 200 and re-triggers review for synchronize on existing PR", async () => {
    const existingReview = {
      id: "pr1",
      exerciseRepoId: "r1",
      userId: "u1",
      prUrl: "https://github.com/org/repo/pull/1",
      reviewStatus: "reviewed",
      llmReviewSummary: null,
      reviewedAt: null,
      createdAt: new Date(),
    };
    vi.mocked(getPrReviewByPrUrl).mockResolvedValue(existingReview);
    vi.mocked(updatePrReview).mockResolvedValue({ ...existingReview, reviewStatus: "pending" });

    const payload = JSON.stringify({
      action: "synchronize",
      pull_request: {
        html_url: "https://github.com/org/repo/pull/1",
        head: { ref: "feature-branch", sha: "abc123" },
        base: { ref: "main", repo: { full_name: "org/repo", html_url: "https://github.com/org/repo" } },
        user: { login: "intern1" },
      },
    });

    const req = createRequest(payload);
    const res = await githubApp.fetch(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe("synchronize");
    expect(updatePrReview).toHaveBeenCalled();
  });

  it("returns 200 for opened event on new PR", async () => {
    vi.mocked(getPrReviewByPrUrl).mockResolvedValue(null);

    const payload = JSON.stringify({
      action: "opened",
      pull_request: {
        html_url: "https://github.com/org/repo/pull/2",
        head: { ref: "feature-branch", sha: "def456" },
        base: { ref: "main", repo: { full_name: "org/repo", html_url: "https://github.com/org/repo" } },
        user: { login: "intern2" },
      },
    });

    const req = createRequest(payload);
    const res = await githubApp.fetch(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe("opened");
  });

  it("returns 200 and ignores closed actions", async () => {
    const payload = JSON.stringify({
      action: "closed",
      pull_request: {
        html_url: "https://github.com/org/repo/pull/3",
        head: { ref: "feature-branch", sha: "ghi789" },
        base: { ref: "main", repo: { full_name: "org/repo", html_url: "https://github.com/org/repo" } },
        user: { login: "intern3" },
      },
    });

    const req = createRequest(payload);
    const res = await githubApp.fetch(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ignored).toContain("closed");
  });
});
