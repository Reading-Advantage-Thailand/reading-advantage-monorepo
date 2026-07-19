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
    vi.stubGlobal("crypto", {
      randomUUID: () => "operation-00000000-0000-4000-8000-000000000001",
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
});
