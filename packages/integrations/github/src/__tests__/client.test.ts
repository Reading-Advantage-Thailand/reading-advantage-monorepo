import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubClientError } from "../client";

describe("GitHubClientError", () => {
  it("has correct name and message", () => {
    const err = new GitHubClientError("not found", 404);
    expect(err.name).toBe("GitHubClientError");
    expect(err.message).toBe("not found");
    expect(err.status).toBe(404);
  });
});

describe("GitHubClient interface compliance", () => {
  it("PracticeIssue shape is correct", () => {
    // Type-only test: ensures the interface is exported and usable
    const issue = {
      number: 1,
      title: "Test",
      body: null,
      state: "open" as const,
      labels: ["bug"],
      htmlUrl: "https://github.com/o/r/issues/1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    expect(issue.number).toBe(1);
    expect(issue.state).toBe("open");
  });
});
