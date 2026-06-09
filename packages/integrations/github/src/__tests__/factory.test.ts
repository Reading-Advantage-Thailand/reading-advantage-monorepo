import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getGitHubClient,
  resetGitHubClient,
  GitHubNotConfiguredError,
} from "../factory";
import { GitHubRestDriver } from "../drivers/rest";

describe("getGitHubClient", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetGitHubClient();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws GitHubNotConfiguredError when env vars are missing", () => {
    delete process.env.GITHUB_APP_ID;
    delete process.env.GITHUB_APP_PRIVATE_KEY;
    expect(() => getGitHubClient()).toThrow(GitHubNotConfiguredError);
  });

  it("returns GitHubRestDriver when env vars are set", () => {
    process.env.GITHUB_APP_ID = "12345";
    process.env.GITHUB_APP_PRIVATE_KEY = "test-key";
    process.env.GITHUB_INSTALLATION_ID = "67890";
    const client = getGitHubClient();
    expect(client).toBeInstanceOf(GitHubRestDriver);
  });

  it("returns the same instance on subsequent calls", () => {
    process.env.GITHUB_APP_ID = "12345";
    process.env.GITHUB_APP_PRIVATE_KEY = "test-key";
    const a = getGitHubClient();
    const b = getGitHubClient();
    expect(a).toBe(b);
  });
});
