import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPracticeIssues } from "../codecamp/index";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("getPracticeIssues", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns parsed issues excluding pull requests", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { number: 1, title: "Issue 1", body: "body", html_url: "https://github.com/o/r/issues/1", labels: [{ name: "Easy" }], state: "open" },
        { number: 2, title: "PR 2", body: null, html_url: "https://github.com/o/r/pull/2", labels: [], state: "open", pull_request: {} },
      ],
    });
    const issues = await getPracticeIssues("o", "r");
    expect(issues).toHaveLength(1);
    expect(issues[0].number).toBe(1);
    expect(issues[0].labels).toEqual(["Easy"]);
  });

  it("returns empty array when GitHub API fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
    const issues = await getPracticeIssues("o", "r");
    expect(issues).toEqual([]);
  });

  it("maps label names correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { number: 3, title: "Hard Issue", body: null, html_url: "https://github.com/o/r/issues/3", labels: [{ name: "Hard" }, { name: "feature" }], state: "open" },
      ],
    });
    const issues = await getPracticeIssues("o", "r");
    expect(issues[0].labels).toEqual(["Hard", "feature"]);
  });
});
