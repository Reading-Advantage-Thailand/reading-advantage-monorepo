import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getWorkbookSession: vi.fn(),
  listDrafts: vi.fn(),
  listEditions: vi.fn(),
}));

vi.mock("./lib/session", () => ({
  getWorkbookSession: mocks.getWorkbookSession,
}));

vi.mock("../lib/repository", () => ({
  getWorkbookRepository: () => ({
    listDrafts: mocks.listDrafts,
    listEditions: mocks.listEditions,
  }),
}));

import HomePage from "./page";

const adminSession = {
  actorId: "actor-1",
  tenantId: "tenant-1",
  role: "WORKBOOK_ADMIN",
  username: "editor",
};

const otherRoleSession = {
  actorId: "actor-2",
  tenantId: "tenant-1",
  role: "SALES_ADMIN",
  username: "sales",
};

describe("workbooks home page", () => {
  beforeEach(() => {
    mocks.getWorkbookSession.mockReset();
    mocks.listDrafts.mockReset();
    mocks.listEditions.mockReset();
  });

  it("renders sign-in required and never queries the repository without a session", async () => {
    mocks.getWorkbookSession.mockResolvedValue(null);

    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("Sign-in is required");
    expect(mocks.listDrafts).not.toHaveBeenCalled();
    expect(mocks.listEditions).not.toHaveBeenCalled();
  });

  it("renders access denied and never queries the repository for a non-WORKBOOK_ADMIN session", async () => {
    mocks.getWorkbookSession.mockResolvedValue(otherRoleSession);

    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("Access denied");
    expect(mocks.listDrafts).not.toHaveBeenCalled();
    expect(mocks.listEditions).not.toHaveBeenCalled();
  });

  it("renders drafts and editions scoped to the session tenant", async () => {
    mocks.getWorkbookSession.mockResolvedValue(adminSession);
    mocks.listDrafts.mockResolvedValue([]);
    mocks.listEditions.mockResolvedValue([]);

    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("No drafts");
    expect(html).toContain("No editions");
    expect(mocks.listDrafts).toHaveBeenCalledWith("tenant-1", 50);
    expect(mocks.listEditions).toHaveBeenCalledWith("tenant-1", 50);
  });
});
