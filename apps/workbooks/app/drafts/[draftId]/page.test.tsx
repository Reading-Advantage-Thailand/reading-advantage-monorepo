import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getWorkbookSession: vi.fn(),
  getDraft: vi.fn(),
}));

vi.mock("../../lib/session", () => ({
  getWorkbookSession: mocks.getWorkbookSession,
}));

vi.mock("../../../lib/repository", () => ({
  getWorkbookRepository: () => ({
    getDraft: mocks.getDraft,
  }),
}));

vi.mock("./draft-editor-view", () => ({
  DraftEditorView: ({
    session,
    draft,
  }: {
    session: { role: string } | null;
    draft: { draftId: string } | null;
  }) => (
    <div data-testid="draft-editor-view">
      {draft ? `draft:${draft.draftId}` : "not-found"}
      {session ? `role:${session.role}` : "no-session"}
    </div>
  ),
}));

import DraftEditorPage from "./page";

const adminSession = {
  actorId: "actor-1",
  tenantId: "tenant-1",
  role: "WORKBOOK_ADMIN",
  username: "editor",
};

const DRAFT_ID = "c0a80101-0000-4000-8000-000000000001";

describe("workbooks draft editor page", () => {
  beforeEach(() => {
    mocks.getWorkbookSession.mockReset();
    mocks.getDraft.mockReset();
  });

  it("renders the not-found treatment for a non-UUID draft id without touching the repository", async () => {
    mocks.getWorkbookSession.mockResolvedValue(adminSession);

    const html = renderToStaticMarkup(
      await DraftEditorPage({ params: Promise.resolve({ draftId: "not-a-uuid" }) }),
    );

    expect(html).toContain("not-found");
    expect(mocks.getDraft).not.toHaveBeenCalled();
  });

  it("loads a valid UUID draft scoped to the session tenant", async () => {
    mocks.getWorkbookSession.mockResolvedValue(adminSession);
    mocks.getDraft.mockResolvedValue({
      draftId: DRAFT_ID,
      tenantId: "tenant-1",
    });

    const html = renderToStaticMarkup(
      await DraftEditorPage({ params: Promise.resolve({ draftId: DRAFT_ID }) }),
    );

    expect(html).toContain(`draft:${DRAFT_ID}`);
    expect(mocks.getDraft).toHaveBeenCalledWith("tenant-1", DRAFT_ID);
  });

  it("renders sign-in required and never queries the repository without a session", async () => {
    mocks.getWorkbookSession.mockResolvedValue(null);

    const html = renderToStaticMarkup(
      await DraftEditorPage({ params: Promise.resolve({ draftId: DRAFT_ID }) }),
    );

    expect(html).toContain("no-session");
    expect(mocks.getDraft).not.toHaveBeenCalled();
  });
});
