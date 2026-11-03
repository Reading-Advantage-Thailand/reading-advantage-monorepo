import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { currentEmployee, execute, getIdentityComposition } = vi.hoisted(() => ({
  currentEmployee: vi.fn(),
  execute: vi.fn(),
  getIdentityComposition: vi.fn(),
}));

vi.mock("@/lib/server/http", () => ({
  currentEmployee,
  identityAuthenticationEvidence: vi.fn(async () => ({
    kind: "session",
    opaqueSessionRef: "opaque-token",
  })),
}));

vi.mock("@/lib/server/identity", () => ({ getIdentityComposition }));

import { AccountsConsole } from "./accounts-console";
import AccountsPage from "./page";
import { SignInPanel } from "./sign-in-panel";

type Search = { returnTo?: string; application?: string; role?: string };

function findElement(node: ReactNode, type: unknown): ReactElement<Record<string, unknown>> | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, type);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement<{ children?: ReactNode }>(node)) return undefined;
  if (node.type === type) return node as ReactElement<Record<string, unknown>>;
  return findElement(node.props.children, type);
}

async function renderPage(search: Search) {
  return AccountsPage({ searchParams: Promise.resolve(search) });
}

async function signInReturnTo(returnTo: string | undefined): Promise<unknown> {
  const page = await renderPage(returnTo === undefined ? {} : { returnTo });
  return findElement(page, SignInPanel)?.props.returnTo;
}

describe("Accounts page sign-in return path", () => {
  beforeEach(() => {
    currentEmployee.mockReset();
    execute.mockReset();
    getIdentityComposition.mockReset();
    currentEmployee.mockResolvedValue(null);
    getIdentityComposition.mockResolvedValue({ executor: { execute } });
  });

  it.each([
    ["the authorize path with its query", "/api/oidc/authorize?client_id=sales-lms&state=xyz"],
    ["a local path", "/admin"],
  ])("keeps %s", async (_name, returnTo) => {
    await expect(signInReturnTo(returnTo)).resolves.toBe(returnTo);
  });

  it.each([
    ["a missing value", undefined],
    ["an absolute URL", "https://evil.example.test/"],
    ["a protocol-relative URL", "//evil.example.test"],
    ["a backslash host", "/\\evil.example.test"],
    ["a scheme-like value", "javascript:alert(1)"],
    ["a fragment in the query", "/admin?x=1#frag"],
    ["a malformed query encoding", "/admin?x=%zz"],
    ["a control character", "/admin\n"],
  ])("falls back to / for %s", async (_name, returnTo) => {
    await expect(signInReturnTo(returnTo)).resolves.toBe("/");
  });

  it("does not list employees for an anonymous visitor", async () => {
    await renderPage({});

    expect(execute).not.toHaveBeenCalled();
  });
});

describe("Accounts page signed-in console", () => {
  beforeEach(() => {
    currentEmployee.mockReset();
    execute.mockReset();
    getIdentityComposition.mockReset();
    getIdentityComposition.mockResolvedValue({ executor: { execute } });
  });

  it("loads the employee list through the kernel for a company administrator", async () => {
    const admin = { id: "admin-1", companyRoles: ["COMPANY_ADMIN"] };
    currentEmployee.mockResolvedValue(admin);
    execute.mockResolvedValueOnce([admin]);

    const page = await renderPage({});
    const consoleElement = findElement(page, AccountsConsole);

    expect(execute).toHaveBeenCalledWith({
      capabilityId: expect.any(String),
      input: {},
      evidence: { kind: "session", opaqueSessionRef: "opaque-token" },
    });
    expect(consoleElement?.props.employee).toBe(admin);
    expect(consoleElement?.props.initialEmployees).toEqual([admin]);
    expect(findElement(page, SignInPanel)).toBeUndefined();
  });

  it("never lists employees for a non-administrator", async () => {
    currentEmployee.mockResolvedValue({ id: "rep-1", companyRoles: [] });

    const page = await renderPage({});

    expect(execute).not.toHaveBeenCalled();
    expect(findElement(page, AccountsConsole)?.props.initialEmployees).toBeUndefined();
  });

  it("passes provisioning only for the sales SALES_REP pair", async () => {
    currentEmployee.mockResolvedValue({ id: "rep-1", companyRoles: [] });

    const sales = await renderPage({ application: "sales", role: "SALES_REP" });
    const otherRole = await renderPage({ application: "sales", role: "SALES_MANAGER" });
    const otherApp = await renderPage({ application: "marketing", role: "SALES_REP" });

    expect(findElement(sales, AccountsConsole)?.props.provisioning).toEqual({
      applicationKey: "sales",
      roleKey: "SALES_REP",
    });
    expect(findElement(otherRole, AccountsConsole)?.props.provisioning).toBeUndefined();
    expect(findElement(otherApp, AccountsConsole)?.props.provisioning).toBeUndefined();
  });
});
