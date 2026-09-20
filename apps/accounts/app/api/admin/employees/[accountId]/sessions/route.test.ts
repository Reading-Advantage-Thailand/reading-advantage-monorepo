import { beforeEach, describe, expect, it, vi } from "vitest";

const { execute, session } = vi.hoisted(() => ({
  execute: vi.fn(),
  session: { token: undefined as string | undefined },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() =>
      session.token === undefined ? undefined : { value: session.token },
    ),
  })),
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/server/identity", () => ({
  getIdentityComposition: vi.fn(async () => ({
    cookie: { name: "__Host-ra_company_sso" },
    issuerUrl: "https://accounts.example.test",
    executor: { execute },
  })),
}));

import { DELETE, OPTIONS } from "./route";

const accountId = "11111111-1111-4111-8111-111111111111";
const origin = "https://accounts.example.test";

function deleteRequest(body: unknown): Request {
  return new Request(`${origin}/api/admin/employees/${accountId}/sessions`, {
    method: "DELETE",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function routeContext() {
  return { params: Promise.resolve({ accountId }) };
}

describe("Accounts session-revocation administration route", () => {
  beforeEach(() => {
    execute.mockReset();
    session.token = undefined;
  });

  it("denies an anonymous session revocation before returning data", async () => {
    execute.mockRejectedValueOnce(
      Object.assign(new Error("Authentication is required."), {
        code: "UNAUTHENTICATED",
      }),
    );

    const response = await DELETE(
      deleteRequest({ idempotencyKey: "key-1" }),
      routeContext(),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "UNAUTHENTICATED",
      message: "Authentication is required.",
    });
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilityId: "company-identity.employees.revoke-sessions",
        evidence: { kind: "anonymous" },
      }),
    );
  });

  it("denies a signed-in employee who is not a company administrator", async () => {
    session.token = "session-token";
    execute.mockRejectedValueOnce(
      Object.assign(new Error("Company administrator access is required."), {
        code: "FORBIDDEN",
      }),
    );

    const response = await DELETE(
      deleteRequest({ idempotencyKey: "key-1" }),
      routeContext(),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "FORBIDDEN",
      message: "Company administrator access is required.",
    });
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        evidence: { kind: "session", opaqueSessionRef: "session-token" },
      }),
    );
  });

  it("applies the URL account even when the body supplies another target", async () => {
    session.token = "session-token";
    execute.mockResolvedValueOnce({ sessionsRevoked: 2 });

    const response = await DELETE(
      deleteRequest({
        targetAccountId: "99999999-9999-4999-8999-999999999999",
        idempotencyKey: "key-1",
      }),
      routeContext(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ sessionsRevoked: 2 });
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ targetAccountId: accountId }),
        idempotencyKey: "key-1",
      }),
    );
  });

  it("answers preflight without a request context", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Allow")).toBe("DELETE, OPTIONS");
  });
});
