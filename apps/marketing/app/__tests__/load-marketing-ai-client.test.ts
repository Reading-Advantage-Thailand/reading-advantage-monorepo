// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const whereMock = vi.fn();
  const fromMock = vi.fn(() => ({ where: whereMock }));
  const selectMock = vi.fn(() => ({ from: fromMock }));
  return { whereMock, fromMock, selectMock };
});

vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.selectMock,
  },
}));

import { loadMarketingAIClient } from "@/lib/ai-credentials";
import { encrypt } from "@/lib/encryption";

process.env.ENCRYPTION_KEY ??=
  "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";

beforeEach(() => {
  mocks.selectMock.mockClear();
  mocks.fromMock.mockClear();
  mocks.whereMock.mockReset();
});

describe("loadMarketingAIClient", () => {
  it("reads the persisted llm settings and resolves the adapter configuration", async () => {
    mocks.whereMock.mockResolvedValueOnce([
      { key: "llm.provider", value: "google" },
      { key: "llm.model", value: "gemini-pro" },
      { key: "llm.apiKey", value: encrypt("sk-test-key") },
    ]);

    const config = await loadMarketingAIClient();

    expect(mocks.selectMock).toHaveBeenCalledTimes(1);
    expect(config).toEqual({
      provider: "google",
      model: "gemini-pro",
      apiKey: "sk-test-key",
    });
  });

  it("returns null when no provider key is configured", async () => {
    mocks.whereMock.mockResolvedValueOnce([
      { key: "llm.provider", value: "google" },
      { key: "llm.model", value: "gemini-pro" },
    ]);

    await expect(loadMarketingAIClient()).resolves.toBeNull();
  });

  it("propagates a database failure to the caller", async () => {
    mocks.whereMock.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(loadMarketingAIClient()).rejects.toThrow(
      "database unavailable",
    );
  });
});
