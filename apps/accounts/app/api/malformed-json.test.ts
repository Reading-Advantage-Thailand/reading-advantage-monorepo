import { beforeEach, describe, expect, it, vi } from "vitest";

const { execute, getIdentityComposition } = vi.hoisted(() => ({
  execute: vi.fn(),
  getIdentityComposition: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })),
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/server/identity", () => ({ getIdentityComposition }));

import { PUT as setCompanyRoles } from "./admin/employees/[accountId]/company-roles/route";
import { PUT as resetCredential } from "./admin/employees/[accountId]/credential/route";
import { PUT as setApplicationRoles } from "./admin/employees/[accountId]/roles/route";
import { DELETE as revokeSessions } from "./admin/employees/[accountId]/sessions/route";
import { PATCH as setStatus } from "./admin/employees/[accountId]/status/route";
import { POST as createEmployee } from "./admin/employees/route";
import { POST as login } from "./session/login/route";

const accountContext = { params: Promise.resolve({ accountId: "employee-1" }) };

function malformedRequest(method: string, body: string): Request {
  return new Request("https://accounts.example.test/api", {
    method,
    body,
    headers: {
      "content-type": "application/json",
      origin: "https://accounts.example.test",
    },
  });
}

describe("Accounts JSON body boundaries", () => {
  beforeEach(() => {
    execute.mockReset();
    getIdentityComposition.mockReset();
    getIdentityComposition.mockResolvedValue({
      cookie: { name: "__Host-ra_company_sso" },
      executor: { execute },
      issuerUrl: "https://accounts.example.test",
      service: { authenticate: vi.fn() },
    });
  });

  it.each([
    ["employee creation", (request: Request) => createEmployee(request)],
    ["application roles", (request: Request) => setApplicationRoles(request, accountContext)],
    ["company roles", (request: Request) => setCompanyRoles(request, accountContext)],
    ["credential reset", (request: Request) => resetCredential(request, accountContext)],
    ["session revocation", (request: Request) => revokeSessions(request, accountContext)],
    ["employee status", (request: Request) => setStatus(request, accountContext)],
    ["login", (request: Request) => login(request)],
  ])("returns 400 for malformed JSON in the %s route", async (_name, invoke) => {
    const response = await invoke(malformedRequest("POST", "{"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "INVALID_INPUT",
      message: "Request body must be valid JSON.",
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-object JSON body", async () => {
    const response = await createEmployee(malformedRequest("POST", "null"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "INVALID_INPUT",
      message: "Request body must be a JSON object.",
    });
  });
});
