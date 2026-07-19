import { beforeEach, describe, expect, it, vi } from "vitest";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })),
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/server/identity", () => ({
  getIdentityComposition: vi.fn(async () => ({
    cookie: { name: "__Host-ra_company_sso" },
    executor: { execute },
  })),
}));

import { GET } from "./route";

describe("Accounts employee administration route", () => {
  beforeEach(() => execute.mockReset());

  it("denies an anonymous employee-directory request before returning data", async () => {
    execute.mockRejectedValueOnce(
      Object.assign(new Error("Authentication is required."), {
        code: "UNAUTHENTICATED",
      }),
    );

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "UNAUTHENTICATED",
      message: "Authentication is required.",
    });
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilityId: "company-identity.employees.list",
        evidence: { kind: "anonymous" },
      }),
    );
  });
});
