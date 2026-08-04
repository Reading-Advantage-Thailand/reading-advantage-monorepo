import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { workbooks } from "@reading-advantage/domain";

const mocks = vi.hoisted(() => ({
  getWorkbookSession: vi.fn(),
  listDrafts: vi.fn(),
}));

vi.mock("../lib/session", () => ({
  getWorkbookSession: mocks.getWorkbookSession,
}));

vi.mock("../../lib/repository", () => ({
  getWorkbookRepository: () => ({
    listDrafts: mocks.listDrafts,
  }),
}));

import DraftsPage from "./page";

const adminSession = {
  actorId: "actor-1",
  tenantId: "tenant-1",
  role: "WORKBOOK_ADMIN",
  username: "editor",
};

function makeDraft(draftId: string, title: string): workbooks.WorkbookDraft {
  const content = {
    title,
    cefrLevel: "A2",
    paragraphs: [{ order: 0, text: "paragraph" }],
    questions: [],
    assets: [],
  };
  const record: workbooks.WorkbookSourceRecord = {
    identity: {
      sourceApp: "reading-advantage",
      sourceId: `src-${draftId}`,
      sourceRevision: "rev-1",
      contentHash: workbooks.computeWorkbookDigest(content),
    },
    content,
  };
  return {
    draftId,
    tenantId: "tenant-1",
    status: "draft",
    sourceRecord: record,
    revision: 3,
    createdBy: "actor-1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z",
  };
}

describe("workbooks drafts page", () => {
  beforeEach(() => {
    mocks.getWorkbookSession.mockReset();
    mocks.listDrafts.mockReset();
  });

  it("renders sign-in required and never queries the repository without a session", async () => {
    mocks.getWorkbookSession.mockResolvedValue(null);

    const html = renderToStaticMarkup(await DraftsPage());

    expect(html).toContain("Sign-in is required");
    expect(mocks.listDrafts).not.toHaveBeenCalled();
  });

  it("lists drafts scoped to the session tenant", async () => {
    mocks.getWorkbookSession.mockResolvedValue(adminSession);
    mocks.listDrafts.mockResolvedValue([makeDraft("draft-1", "Lesson One")]);

    const html = renderToStaticMarkup(await DraftsPage());

    expect(html).toContain("Lesson One");
    expect(html).toContain("/drafts/draft-1");
    expect(mocks.listDrafts).toHaveBeenCalledWith("tenant-1", 50);
  });

  it("marks every draft-table header cell with a column scope", async () => {
    mocks.getWorkbookSession.mockResolvedValue(adminSession);
    mocks.listDrafts.mockResolvedValue([makeDraft("draft-1", "Lesson One")]);

    const html = renderToStaticMarkup(await DraftsPage());

    const headerCells = html.match(/<th(\s[^>]*)?>/g) ?? [];
    expect(headerCells.length).toBe(4);
    for (const cell of headerCells) {
      expect(cell).toContain('scope="col"');
    }
  });
});
