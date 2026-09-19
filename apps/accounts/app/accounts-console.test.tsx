// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Employee } from "@reading-advantage/backend";

import { AccountsConsole } from "./accounts-console";

const admin: Employee = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "owner",
  displayName: "Company Owner",
  status: "ACTIVE",
  companyRoles: ["EMPLOYEE", "COMPANY_ADMIN"],
  appRoles: { marketing: ["ADMIN"], sales: ["SALES_ADMIN"] },
  createdAt: "2026-07-18T00:00:00.000Z",
};
const employee: Employee = {
  ...admin,
  id: "22222222-2222-4222-8222-222222222222",
  username: "rep",
  displayName: "Sales Representative",
  companyRoles: ["EMPLOYEE"],
  appRoles: { sales: ["SALES_REP"] },
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Accounts administration console", () => {
  beforeEach(() => {
    let operationId = 0;
    vi.stubGlobal("crypto", {
      randomUUID: () => `operation-${++operationId}`,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows application access but no identity controls to an ordinary employee", () => {
    render(<AccountsConsole employee={employee} />);

    expect(
      screen.getByRole("heading", { name: "Your application ledger" }),
    ).toBeInTheDocument();
    expect(screen.getByText("SALES_REP")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Directory" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create identity/i }),
    ).not.toBeInTheDocument();
  });

  it("scopes role changes to one application and confirms lifecycle suspension", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (
          url === "/api/admin/employees" &&
          (init?.method ?? "GET") === "GET"
        ) {
          return jsonResponse({ employees: [admin] });
        }
        return jsonResponse({ employee: admin, sessionsRevoked: 1 });
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AccountsConsole employee={admin} />);
    await screen.findByRole("heading", { name: "Directory" });
    await screen.findByRole("button", { name: "Select Company Owner, active" });

    fireEvent.click(screen.getByRole("checkbox", { name: "SALES_REP" }));
    await waitFor(() => {
      const roleCall = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith("/roles"),
      );
      expect(roleCall).toBeDefined();
      const body = JSON.parse(String(roleCall?.[1]?.body));
      expect(body).toMatchObject({
        applicationKey: "sales",
        roleKeys: ["SALES_ADMIN", "SALES_REP"],
      });
      expect(body).not.toHaveProperty("marketing");
    });

    fireEvent.click(screen.getByRole("button", { name: "SUSPEND IDENTITY" }));
    await waitFor(() => {
      const statusCall = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith("/status"),
      );
      expect(statusCall).toBeDefined();
      expect(window.confirm).toHaveBeenCalledWith(
        "Suspend Company Owner and revoke every active session?",
      );
      expect(JSON.parse(String(statusCall?.[1]?.body))).toMatchObject({
        status: "SUSPENDED",
      });
    });
  });

  it("reuses a create key while pending and clears it after success", async () => {
    const postResponses: Array<(response: Response) => void> = [];
    const fetchMock = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/admin/employees" && (init?.method ?? "GET") === "GET") {
          return Promise.resolve(jsonResponse({ employees: [admin] }));
        }
        return new Promise<Response>((resolve) => postResponses.push(resolve));
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AccountsConsole employee={admin} />);
    await screen.findByRole("heading", { name: "Directory" });
    const form = screen.getByRole("button", { name: /create identity/i }).closest("form");
    if (!form) throw new Error("Create form was not rendered.");

    fireEvent.change(screen.getByRole("textbox", { name: "Display name" }), {
      target: { value: "New Employee" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Username" }), {
      target: { value: "new-employee" },
    });
    fireEvent.change(screen.getByLabelText("Initial password"), {
      target: { value: "long-enough-password" },
    });
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(postResponses).toHaveLength(2));
    const createCalls = fetchMock.mock.calls.filter(([url, options]) =>
      String(url) === "/api/admin/employees" && options?.method === "POST",
    );
    const firstKey = JSON.parse(String(createCalls[0]?.[1]?.body)).idempotencyKey;
    const secondKey = JSON.parse(String(createCalls[1]?.[1]?.body)).idempotencyKey;
    expect(secondKey).toBe(firstKey);

    postResponses.shift()?.(jsonResponse({ employee: admin }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    postResponses.shift()?.(jsonResponse({ employee: admin }));
    await waitFor(() => expect(screen.getByText(/Employee created\./)).toBeInTheDocument());

    fireEvent.change(screen.getByRole("textbox", { name: "Display name" }), {
      target: { value: "Another Employee" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Username" }), {
      target: { value: "another-employee" },
    });
    fireEvent.change(screen.getByLabelText("Initial password"), {
      target: { value: "another-long-password" },
    });
    fireEvent.submit(form);
    await waitFor(() => expect(postResponses).toHaveLength(1));
    const nextCreateCall = fetchMock.mock.calls.at(-1);
    const nextKey = JSON.parse(String(nextCreateCall?.[1]?.body)).idempotencyKey;
    expect(nextKey).not.toBe(firstKey);
  });

  it("disables a role checkbox while its update is pending", async () => {
    let resolveRole: (response: Response) => void = () => undefined;
    const roleResponse = new Promise<Response>((resolve) => { resolveRole = resolve; });
    const fetchMock = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/admin/employees" && (init?.method ?? "GET") === "GET") {
          return Promise.resolve(jsonResponse({ employees: [admin] }));
        }
        if (url.endsWith("/roles")) return roleResponse;
        return Promise.resolve(jsonResponse({ employee: admin }));
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AccountsConsole employee={admin} />);
    await screen.findByRole("heading", { name: "Directory" });
    const roleCheckbox = screen.getByRole("checkbox", { name: "SALES_REP" });

    fireEvent.click(roleCheckbox);
    expect(roleCheckbox).toBeDisabled();

    resolveRole(jsonResponse({ employee: admin }));
    await waitFor(() => expect(roleCheckbox).not.toBeDisabled());
  });

  it("scopes role idempotency keys to the employee and role control", async () => {
    const roleResponses: Array<(response: Response) => void> = [];
    const fetchMock = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/admin/employees" && (init?.method ?? "GET") === "GET") {
          return Promise.resolve(jsonResponse({ employees: [admin] }));
        }
        if (url.endsWith("/roles")) {
          return new Promise<Response>((resolve) => roleResponses.push(resolve));
        }
        return Promise.resolve(jsonResponse({ employee: admin }));
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AccountsConsole employee={admin} />);
    await screen.findByRole("heading", { name: "Directory" });
    const salesRep = screen.getByRole("checkbox", { name: "SALES_REP" });
    const marketingMember = screen.getByRole("checkbox", { name: "MEMBER" });

    fireEvent.click(salesRep);
    await waitFor(() => expect(roleResponses).toHaveLength(1));
    const roleCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/roles"));
    const firstKey = JSON.parse(String(roleCalls()[0]?.[1]?.body)).idempotencyKey;
    roleResponses.shift()?.(jsonResponse({ message: "temporary failure" }, 500));
    await waitFor(() => expect(salesRep).not.toBeDisabled());

    fireEvent.click(salesRep);
    await waitFor(() => expect(roleResponses).toHaveLength(1));
    const retryKey = JSON.parse(String(roleCalls()[1]?.[1]?.body)).idempotencyKey;
    expect(retryKey).toBe(firstKey);

    fireEvent.click(marketingMember);
    await waitFor(() => expect(roleResponses).toHaveLength(2));
    const otherRoleKey = JSON.parse(String(roleCalls()[2]?.[1]?.body)).idempotencyKey;
    expect(otherRoleKey).not.toBe(firstKey);
    roleResponses.shift()?.(jsonResponse({ employee: admin }));
    roleResponses.shift()?.(jsonResponse({ employee: admin }));
    await waitFor(() => expect(screen.getByText(/roles updated/i)).toBeInTheDocument());
  });

  it("refetches current roles before building a role update", async () => {
    const roleEmployee: Employee = {
      ...admin,
      appRoles: { marketing: ["ADMIN"], sales: [] },
    };
    let currentEmployee = roleEmployee;
    let resolveFirstRole: (response: Response) => void = () => undefined;
    let roleRequestCount = 0;
    const fetchMock = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/admin/employees" && (init?.method ?? "GET") === "GET") {
          return Promise.resolve(jsonResponse({ employees: [currentEmployee] }));
        }
        if (url.endsWith("/roles")) {
          roleRequestCount += 1;
          const body = JSON.parse(String(init?.body));
          currentEmployee = {
            ...currentEmployee,
            appRoles: { ...currentEmployee.appRoles, sales: body.roleKeys },
          };
          if (roleRequestCount === 1) {
            return new Promise<Response>((resolve) => { resolveFirstRole = resolve; });
          }
          return Promise.resolve(jsonResponse({ employee: currentEmployee }));
        }
        return Promise.resolve(jsonResponse({ employee: currentEmployee }));
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AccountsConsole employee={roleEmployee} />);
    await screen.findByRole("heading", { name: "Directory" });
    const salesRep = screen.getByRole("checkbox", { name: "SALES_REP" });
    const salesAdmin = screen.getByRole("checkbox", { name: "SALES_ADMIN" });

    fireEvent.click(salesRep);
    await waitFor(() => expect(roleRequestCount).toBe(1));
    fireEvent.click(salesAdmin);
    await waitFor(() => expect(roleRequestCount).toBe(2));

    const roleCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/roles"));
    expect(JSON.parse(String(roleCalls[1]?.[1]?.body))).toMatchObject({
      roleKeys: ["SALES_REP", "SALES_ADMIN"],
    });

    resolveFirstRole(jsonResponse({ employee: currentEmployee }));
  });

  it.each([
    ["malformed HTML", () => new Response("<html>failure</html>", { status: 500 }), "The operation could not be completed."],
    ["empty", () => new Response(null, { status: 500 }), "The operation could not be completed."],
    ["valid JSON", () => jsonResponse({ message: "Server unavailable" }, 500), "Server unavailable"],
  ])("shows the expected message for %s error responses", async (_label, responseFactory, expectedMessage) => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/admin/employees" && (init?.method ?? "GET") === "GET") {
          return jsonResponse({ employees: [admin] });
        }
        return responseFactory();
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AccountsConsole employee={admin} />);
    await screen.findByRole("heading", { name: "Directory" });
    const form = screen.getByRole("button", { name: /create identity/i }).closest("form");
    if (!form) throw new Error("Create form was not rendered.");
    fireEvent.change(screen.getByRole("textbox", { name: "Display name" }), {
      target: { value: "New Employee" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Username" }), {
      target: { value: "new-employee" },
    });
    fireEvent.change(screen.getByLabelText("Initial password"), {
      target: { value: "long-enough-password" },
    });

    fireEvent.submit(form);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(expectedMessage));
  });
});
