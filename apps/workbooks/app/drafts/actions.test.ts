import { beforeEach, describe, expect, it, vi } from "vitest";
import { workbooks } from "@reading-advantage/domain";

vi.mock("../lib/session", () => ({
  requireWorkbookSession: vi.fn(),
  WorkbookAuthorizationError: class extends Error {
    readonly code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = "WorkbookAuthorizationError";
      this.code = code;
    }
  },
}));

const repositorySpy = {
  findEditionByIdempotencyKey: vi.fn(),
  getDraft: vi.fn(),
  nextEditionVersion: vi.fn(),
  appendEdition: vi.fn(),
  updateDraftStatus: vi.fn(),
  recordEvent: vi.fn(),
};

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  return {
    ...actual,
    db: {
      ...actual.db,
      transaction: vi.fn(
        async (fn: (tx: string) => Promise<unknown>) => fn("tx-handle"),
      ),
    },
  };
});

vi.mock("@reading-advantage/domain", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@reading-advantage/domain")>();
  return {
    ...actual,
    workbooks: {
      ...actual.workbooks,
      createDrizzleEditionRepository: vi.fn(() => repositorySpy),
    },
  };
});

import { publishDraftAction } from "./actions";
import {
  requireWorkbookSession,
  WorkbookAuthorizationError,
  type WorkbookSession,
} from "../lib/session";

const session: WorkbookSession = {
  actorId: "actor-1",
  tenantId: "tenant-1",
  role: "WORKBOOK_ADMIN",
  username: "editor",
};

function makeContent() {
  return {
    title: "Draft title",
    cefrLevel: "A2",
    paragraphs: [{ order: 0, text: "paragraph" }],
    questions: [],
    assets: [],
  };
}

function makeDraft(
  overrides: Partial<workbooks.WorkbookDraft> = {},
): workbooks.WorkbookDraft {
  const content = makeContent();
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
    draftId: "draft-1",
    tenantId: "tenant-1",
    status: "in_review",
    sourceRecord: record,
    revision: 3,
    createdBy: "actor-1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z",
    ...overrides,
  };
}

function makeEdition(
  overrides: Partial<workbooks.WorkbookEdition> = {},
): workbooks.WorkbookEdition {
  return {
    editionId: "edition-1",
    draftId: "draft-1",
    tenantId: "tenant-1",
    version: 1,
    snapshot: makeDraft().sourceRecord,
    contentHash: makeDraft().sourceRecord.identity.contentHash,
    publishedAt: "2026-08-04T00:00:00.000Z",
    publishedBy: "actor-1",
    idempotencyKey: "tenant-1:draft-1:3",
    supersededByEditionId: null,
    revokedAt: null,
    ...overrides,
  };
}

describe("publishDraftAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireWorkbookSession).mockResolvedValue(session);
    repositorySpy.appendEdition.mockImplementation(
      async (edition: workbooks.WorkbookEdition) => ({ ...edition }),
    );
  });

  it("publishes an in-review draft inside one transaction and records the event", async () => {
    repositorySpy.findEditionByIdempotencyKey.mockResolvedValue(null);
    repositorySpy.getDraft.mockResolvedValue(makeDraft());
    repositorySpy.nextEditionVersion.mockResolvedValue(1);
    repositorySpy.updateDraftStatus.mockResolvedValue(
      makeDraft({ status: "published", revision: 4 }),
    );

    const result = await publishDraftAction("draft-1", 3);

    expect(result).toEqual({ ok: true, editionId: expect.any(String), version: 1 });
    expect(workbooks.createDrizzleEditionRepository).toHaveBeenCalledWith(
      "tx-handle",
    );
    expect(repositorySpy.getDraft).toHaveBeenCalledWith("tenant-1", "draft-1");
    expect(repositorySpy.updateDraftStatus).toHaveBeenCalledWith(
      "tenant-1",
      "draft-1",
      "published",
      3,
    );
    expect(repositorySpy.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        draftId: "draft-1",
        editionId: expect.any(String),
        eventType: "published",
        actorId: "actor-1",
      }),
    );
  });

  it("returns a structured unauthorized failure without touching the repository", async () => {
    vi.mocked(requireWorkbookSession).mockRejectedValue(
      new WorkbookAuthorizationError(
        "UNAUTHORIZED",
        "workbooks access requires an authorized session",
      ),
    );
    const result = await publishDraftAction("draft-1", 3);
    expect(result).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      message: "workbooks access requires an authorized session",
    });
    expect(workbooks.createDrizzleEditionRepository).not.toHaveBeenCalled();
    expect(repositorySpy.getDraft).not.toHaveBeenCalled();
  });

  it("returns the same edition for a repeated idempotency key without a duplicate publication", async () => {
    const existing = makeEdition({ editionId: "edition-1", version: 2 });
    repositorySpy.findEditionByIdempotencyKey.mockResolvedValue(existing);

    const result = await publishDraftAction("draft-1", 3);

    expect(result).toEqual({ ok: true, editionId: "edition-1", version: 2 });
    expect(repositorySpy.findEditionByIdempotencyKey).toHaveBeenCalledWith(
      "tenant-1",
      "tenant-1:draft-1:3",
    );
    expect(repositorySpy.getDraft).not.toHaveBeenCalled();
    expect(repositorySpy.appendEdition).not.toHaveBeenCalled();
    expect(repositorySpy.updateDraftStatus).not.toHaveBeenCalled();
    expect(repositorySpy.recordEvent).not.toHaveBeenCalled();
  });

  it("does not leak a draft from another tenant and skips the write", async () => {
    repositorySpy.findEditionByIdempotencyKey.mockResolvedValue(null);
    repositorySpy.getDraft.mockResolvedValue(null);

    const result = await publishDraftAction("draft-1", 3);

    expect(result).toEqual({
      ok: false,
      code: "NOT_FOUND",
      message: "draft not found",
    });
    expect(repositorySpy.appendEdition).not.toHaveBeenCalled();
    expect(repositorySpy.updateDraftStatus).not.toHaveBeenCalled();
    expect(repositorySpy.recordEvent).not.toHaveBeenCalled();
  });

  it("maps a stale revision to a structured REVISION_CONFLICT failure", async () => {
    repositorySpy.findEditionByIdempotencyKey.mockResolvedValue(null);
    repositorySpy.getDraft.mockResolvedValue(makeDraft({ revision: 4 }));

    const result = await publishDraftAction("draft-1", 3);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("REVISION_CONFLICT");
      expect(result.message).toBe(
        "Revision conflict: actual revision 4 does not match expected revision 3.",
      );
    }
    expect(repositorySpy.appendEdition).not.toHaveBeenCalled();
    expect(repositorySpy.updateDraftStatus).not.toHaveBeenCalled();
  });

  it("maps publishing a draft that is not in review to ILLEGAL_STATE_TRANSITION", async () => {
    repositorySpy.findEditionByIdempotencyKey.mockResolvedValue(null);
    repositorySpy.getDraft.mockResolvedValue(makeDraft({ status: "draft" }));

    const result = await publishDraftAction("draft-1", 3);

    expect(result).toEqual({
      ok: false,
      code: "ILLEGAL_STATE_TRANSITION",
      message: 'Cannot transition workbook from "draft" to "published".',
    });
    expect(repositorySpy.appendEdition).not.toHaveBeenCalled();
    expect(repositorySpy.updateDraftStatus).not.toHaveBeenCalled();
    expect(repositorySpy.recordEvent).not.toHaveBeenCalled();
  });
});
