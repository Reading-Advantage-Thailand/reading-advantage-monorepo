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

import { GET, HEAD, OPTIONS, POST } from "./route";

const origin = "https://accounts.example.test";
const employee = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "owner",
  displayName: "Company Owner",
  status: "ACTIVE",
  companyRoles: ["EMPLOYEE"],
  appRoles: {},
  createdAt: "2026-07-18T00:00:00.000Z",
};

function postRequest(body: unknown): Request {
  return new Request(`${origin}/api/admin/employees`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const createBody = {
  username: "new-employee",
  displayName: "New Employee",
  initialPassword: "long-enough-password",
  companyRoles: ["EMPLOYEE"],
  appRoles: {},
  idempotencyKey: "employee-create-1",
};

describe("Accounts employee administration route", () => {
  beforeEach(() => {
    execute.mockReset();
    session.token = undefined;
  });

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

  it("denies a signed-in employee who is not a company administrator", async () => {
    session.token = "session-token";
    execute.mockRejectedValueOnce(
      Object.assign(new Error("Company administrator access is required."), {
        code: "FORBIDDEN",
      }),
    );

    const response = await GET();

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

  it("lists employees for a company administrator", async () => {
    session.token = "session-token";
    execute.mockResolvedValueOnce([employee]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ employees: [employee] });
  });

  it("denies an anonymous identity creation before returning data", async () => {
    execute.mockRejectedValueOnce(
      Object.assign(new Error("Authentication is required."), {
        code: "UNAUTHENTICATED",
      }),
    );

    const response = await POST(postRequest(createBody));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "UNAUTHENTICATED",
      message: "Authentication is required.",
    });
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilityId: "company-identity.employees.create",
        evidence: { kind: "anonymous" },
      }),
    );
  });

  it("denies identity creation to a signed-in employee who is not a company administrator", async () => {
    session.token = "session-token";
    execute.mockRejectedValueOnce(
      Object.assign(new Error("Company administrator access is required."), {
        code: "FORBIDDEN",
      }),
    );

    const response = await POST(postRequest(createBody));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "FORBIDDEN",
      message: "Company administrator access is required.",
    });
  });

  it("creates one employee with the submitted idempotency key", async () => {
    session.token = "session-token";
    execute.mockResolvedValueOnce(employee);

    const response = await POST(postRequest(createBody));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ employee });
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          username: "new-employee",
          companyRoles: ["EMPLOYEE"],
        }),
        idempotencyKey: "employee-create-1",
      }),
    );
  });

  it("answers HEAD factually without the directory body", async () => {
    const response = await HEAD();

    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(execute).not.toHaveBeenCalled();
  });

  it("answers preflight without a request context", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Allow")).toBe("GET, HEAD, POST, OPTIONS");
  });
});
