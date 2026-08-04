import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { workbooks } from "@reading-advantage/domain";
import type { WorkbookSession } from "../lib/session";
import { ProjectListView } from "./project-list-view";

vi.mock("../teacher-manual-actions", () => ({
  compileTeacherManualAction: vi.fn(),
}));

const adminSession: WorkbookSession = {
  actorId: "actor-1",
  tenantId: "tenant-1",
  role: "WORKBOOK_ADMIN",
  username: "editor",
};

const otherRoleSession: WorkbookSession = {
  actorId: "actor-2",
  tenantId: "tenant-1",
  role: "SALES_ADMIN",
  username: "sales",
};

const sourceRecord: workbooks.WorkbookSourceRecord = {
  identity: {
    sourceApp: "reading-advantage",
    sourceId: "src-1",
    sourceRevision: "rev-1",
    contentHash: "sha256:abc",
  },
  content: {
    title: "Pip the Curious Puppy Feels",
    cefrLevel: "A0",
    paragraphs: [{ order: 0, text: "Pip is a curious puppy." }],
    questions: [],
    assets: [],
  },
};

const draft: workbooks.WorkbookDraft = {
  draftId: "draft-1",
  tenantId: "tenant-1",
  status: "draft",
  sourceRecord,
  revision: 2,
  createdBy: "actor-1",
  createdAt: "2026-08-03T00:00:00.000Z",
  updatedAt: "2026-08-03T00:00:00.000Z",
};

const edition: workbooks.WorkbookEdition = {
  editionId: "edition-1",
  draftId: "draft-1",
  tenantId: "tenant-1",
  version: 3,
  snapshot: sourceRecord,
  contentHash: "sha256:abc",
  publishedAt: "2026-08-03T00:00:00.000Z",
  publishedBy: "actor-1",
  idempotencyKey: "tenant-1:draft-1:2",
  supersededByEditionId: null,
  revokedAt: null,
};

describe("ProjectListView", () => {
  it("requests sign-in without a session", () => {
    const html = renderToStaticMarkup(
      <ProjectListView session={null} drafts={[]} editions={[]} />,
    );
    expect(html).toContain("Sign-in is required");
  });

  it("denies access for a non-WORKBOOK_ADMIN session", () => {
    const html = renderToStaticMarkup(
      <ProjectListView
        session={otherRoleSession}
        drafts={[draft]}
        editions={[edition]}
      />,
    );
    expect(html).toContain("Access denied");
    expect(html).not.toContain("Pip the Curious Puppy Feels");
    expect(html).not.toContain("edition-1");
  });

  it("renders empty states when no drafts or editions exist", () => {
    const html = renderToStaticMarkup(
      <ProjectListView session={adminSession} drafts={[]} editions={[]} />,
    );
    expect(html).toContain("No drafts");
    expect(html).toContain("No editions");
  });

  it("renders drafts and editions from the repository", () => {
    const html = renderToStaticMarkup(
      <ProjectListView
        session={adminSession}
        drafts={[draft]}
        editions={[edition]}
      />,
    );
    expect(html).toContain("Pip the Curious Puppy Feels");
    expect(html).toContain("draft");
    expect(html).toContain("edition-1");
    expect(html).toContain("3");
    expect(html).toContain("draft-1");
  });

  it("marks every data-table header cell with a column scope", () => {
    const html = renderToStaticMarkup(
      <ProjectListView
        session={adminSession}
        drafts={[draft]}
        editions={[edition]}
      />,
    );
    const headerCells = html.match(/<th(\s[^>]*)?>/g) ?? [];
    expect(headerCells.length).toBe(9);
    for (const cell of headerCells) {
      expect(cell).toContain('scope="col"');
    }
  });
});
