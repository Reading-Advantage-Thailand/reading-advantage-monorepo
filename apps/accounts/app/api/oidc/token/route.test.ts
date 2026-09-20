import { beforeEach, describe, expect, it, vi } from "vitest";

const { exchangeCode, getIdentityComposition, warn } = vi.hoisted(() => ({
  exchangeCode: vi.fn(),
  getIdentityComposition: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@/lib/server/identity", () => ({ getIdentityComposition }));

import { POST } from "./route";

describe("Accounts OIDC token route", () => {
  beforeEach(() => {
    exchangeCode.mockReset();
    getIdentityComposition.mockReset();
    warn.mockReset();
    getIdentityComposition.mockResolvedValue({
      logger: { warn },
      service: { exchangeCode },
    });
  });

  it("logs unexpected token failures before returning invalid_request", async () => {
    exchangeCode.mockRejectedValueOnce(new Error("database failure"));

    const response = await POST(
      new Request("https://accounts.example.test/api/oidc/token", {
        method: "POST",
        body: new URLSearchParams({ grant_type: "authorization_code" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_request" });
    expect(warn).toHaveBeenCalledWith("accounts.oidc.token.unexpected_failure");
  });
});
