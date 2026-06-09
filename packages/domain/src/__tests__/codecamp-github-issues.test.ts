import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the integrations-github package
const mockGetPracticeIssues = vi.fn();
vi.mock("@reading-advantage/integrations-github", () => ({
  getGitHubClient: () => ({
    getPracticeIssues: mockGetPracticeIssues,
    getInstallationTokenForRepo: vi.fn(),
    listRepositoriesForInstallation: vi.fn(),
  }),
}));

import { getPracticeIssues } from "../codecamp/index";

describe("getPracticeIssues", () => {
  beforeEach(() => {
    mockGetPracticeIssues.mockReset();
  });

  it("returns parsed issues from GitHubClient", async () => {
    mockGetPracticeIssues.mockResolvedValueOnce([
      {
        number: 1,
        title: "Issue 1",
        body: "body",
        state: "open",
        labels: ["Easy"],
        htmlUrl: "https://github.com/o/r/issues/1",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ]);
    const issues = await getPracticeIssues("o", "r");
    expect(issues).toHaveLength(1);
    expect(issues[0].number).toBe(1);
    expect(issues[0].labels).toEqual(["Easy"]);
    expect(mockGetPracticeIssues).toHaveBeenCalledWith("o", "r", {
      state: "open",
      perPage: 20,
    });
  });

  it("returns empty array when GitHubClient throws", async () => {
    mockGetPracticeIssues.mockRejectedValueOnce(new Error("GitHub API 403"));
    const issues = await getPracticeIssues("o", "r");
    expect(issues).toEqual([]);
  });

  it("maps label names correctly", async () => {
    mockGetPracticeIssues.mockResolvedValueOnce([
      {
        number: 3,
        title: "Hard Issue",
        body: null,
        state: "open",
        labels: ["Hard", "feature"],
        htmlUrl: "https://github.com/o/r/issues/3",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ]);
    const issues = await getPracticeIssues("o", "r");
    expect(issues[0].labels).toEqual(["Hard", "feature"]);
  });
});
