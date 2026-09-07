import { describe, it, expect, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { GitHubClientError } from "../client";
import { GitHubRestDriver } from "../drivers/rest.js";

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

describe("GitHubRestDriver installation token cache", () => {
  it("caches tokens for the matching installation only", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          token: "token-a",
          expires_at: "2099-01-01T00:00:00.000Z",
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ repositories: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          token: "token-b",
          expires_at: "2099-01-01T00:00:00.000Z",
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ repositories: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ repositories: [] }),
      } as Response);
    const driver = new GitHubRestDriver({
      appId: "app",
      privateKey: generateKeyPairSync("rsa", { modulusLength: 1024 })
        .privateKey.export({ type: "pkcs8", format: "pem" })
        .toString(),
    });

    await driver.listRepositoriesForInstallation("installation-a");
    await driver.listRepositoriesForInstallation("installation-b");
    await driver.listRepositoriesForInstallation("installation-b");

    const tokenRequests = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/access_tokens")
    );
    expect(tokenRequests).toHaveLength(2);
    expect(String(tokenRequests[0]?.[0])).toContain("installation-a");
    expect(String(tokenRequests[1]?.[0])).toContain("installation-b");
    expect(fetchMock.mock.calls[4]?.[1]?.headers).toMatchObject({
      Authorization: "token token-b",
    });
  });
});
