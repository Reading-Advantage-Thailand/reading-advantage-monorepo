import { beforeEach, describe, expect, it, vi } from "vitest";
import { workbooks } from "@reading-advantage/domain";

vi.mock("../../lib/session", () => ({
  getWorkbookSession: vi.fn(),
}));

const repositorySpy = {
  listEditions: vi.fn(),
};

vi.mock("../../../lib/repository", () => ({
  getWorkbookRepository: () => repositorySpy,
}));

import { GET } from "./route";
import { getWorkbookSession } from "../../lib/session";

const session = {
  actorId: "actor-1",
  tenantId: "tenant-1",
  role: "WORKBOOK_ADMIN",
  username: "editor",
};

function makeEdition(
  overrides: Partial<workbooks.WorkbookEdition> = {},
): workbooks.WorkbookEdition {
  const content = {
    title: "Published Lesson",
    cefrLevel: "A2",
    paragraphs: [{ order: 0, text: "paragraph" }],
    questions: [],
    assets: [],
  };
  const record: workbooks.WorkbookSourceRecord = {
    identity: {
      sourceApp: "reading-advantage",
      sourceId: "src-1",
      sourceRevision: "rev-1",
      contentHash: workbooks.computeWorkbookDigest(content),
    },
    content,
  };
  return {
    editionId: "edition-1",
    draftId: "draft-1",
    tenantId: "tenant-1",
    version: 1,
    snapshot: record,
    contentHash: record.identity.contentHash,
    publishedAt: "2026-08-03T00:00:00.000Z",
    publishedBy: "actor-1",
    idempotencyKey: "tenant-1:draft-1:1",
    supersededByEditionId: null,
    revokedAt: null,
    ...overrides,
  };
}

describe("GET /api/editions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 with a structured error when unauthenticated", async () => {
    vi.mocked(getWorkbookSession).mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(repositorySpy.listEditions).not.toHaveBeenCalled();
  });

  it("returns the session tenant's editions only", async () => {
    const otherTenantEdition = makeEdition({
      editionId: "edition-other",
      tenantId: "tenant-2",
      snapshot: {
        ...makeEdition().snapshot,
        content: { ...makeEdition().snapshot.content, title: "Other Tenant" },
      },
    });
    const tenantEdition = makeEdition();
    vi.mocked(getWorkbookSession).mockResolvedValue(session);
    repositorySpy.listEditions.mockResolvedValue([
      otherTenantEdition,
      tenantEdition,
    ]);

    const response = await GET();

    expect(repositorySpy.listEditions).toHaveBeenCalledWith("tenant-1");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      tenantId: "tenant-1",
      count: 2,
      editions: [
        {
          editionId: "edition-other",
          draftId: "draft-1",
          version: 1,
          contentHash: otherTenantEdition.contentHash,
          publishedAt: "2026-08-03T00:00:00.000Z",
          title: "Other Tenant",
        },
        {
          editionId: "edition-1",
          draftId: "draft-1",
          version: 1,
          contentHash: tenantEdition.contentHash,
          publishedAt: "2026-08-03T00:00:00.000Z",
          title: "Published Lesson",
        },
      ],
    });
  });
});
