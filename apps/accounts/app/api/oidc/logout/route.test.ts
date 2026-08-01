import { beforeEach, describe, expect, it, vi } from "vitest";

const { getIdentityComposition, localLogout } = vi.hoisted(() => ({
  getIdentityComposition: vi.fn(),
  localLogout: vi.fn(),
}));

vi.mock("@/lib/server/identity", () => ({ getIdentityComposition }));

import { POST } from "./route";

describe("Accounts OIDC local logout route", () => {
  beforeEach(() => {
    localLogout.mockReset();
    getIdentityComposition.mockReset();
    getIdentityComposition.mockResolvedValue({ service: { localLogout } });
  });

  it.each([
    ["missing", undefined],
    ["empty", "Bearer "],
    ["malformed", "Bearer malformed token"],
    ["oversized", `Bearer ${"a".repeat(4_096)}`],
    ["wrong scheme", `Basic ${"a".repeat(43)}`],
  ])("rejects a %s authorization header before composition", async (_case, authorization) => {
    const headers = new Headers();
    if (authorization !== undefined) headers.set("authorization", authorization);

    const response = await POST(new Request("https://accounts.example/api/oidc/logout", {
      method: "POST",
      headers,
    }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "invalid_token" });
    expect(getIdentityComposition).not.toHaveBeenCalled();
    expect(localLogout).not.toHaveBeenCalled();
  });

  it("passes one strictly validated opaque session token to the backend", async () => {
    const token = "a".repeat(43);
    localLogout.mockResolvedValue(true);

    const response = await POST(new Request("https://accounts.example/api/oidc/logout", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ revoked: true });
    expect(localLogout).toHaveBeenCalledExactlyOnceWith(token);
  });
});
