import { beforeEach, describe, expect, it, vi } from "vitest";
import { workbooks } from "@reading-advantage/domain";

vi.mock("../../lib/session", () => ({
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
  getDraft: vi.fn(),
  updateDraftContent: vi.fn(),
  updateDraftSettings: vi.fn(),
  updateDraftStatus: vi.fn(),
  recordEvent: vi.fn(),
};

vi.mock("../../../lib/repository", () => ({
  getWorkbookRepository: () => repositorySpy,
}));

const transactionState = vi.hoisted(() => ({
  started: 0,
  committed: false,
}));

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  return {
    ...actual,
    db: {
      ...actual.db,
      transaction: vi.fn(
        async (fn: (tx: string) => Promise<unknown>) => {
          transactionState.started += 1;
          try {
            const result = await fn("tx-handle");
            transactionState.committed = true;
            return result;
          } catch (error) {
            transactionState.committed = false;
            throw error;
          }
        },
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

vi.mock("@reading-advantage/storage", () => ({
  getStorageUrl: vi.fn(),
}));

import { getStorageUrl } from "@reading-advantage/storage";
import {
  getDraftAction,
  previewDraftAction,
  returnDraftToDraftAction,
  submitDraftForReviewAction,
  updateDraftAction,
  updateDraftSettingsAction,
} from "./actions";
import {
  requireWorkbookSession,
  WorkbookAuthorizationError,
  type WorkbookSession,
} from "../../lib/session";

const session: WorkbookSession = {
  actorId: "actor-1",
  tenantId: "tenant-1",
  role: "WORKBOOK_ADMIN",
  username: "editor",
};

const DRAFT_ID = "c0a80101-0000-4000-8000-000000000001";

beforeEach(() => {
  transactionState.started = 0;
  transactionState.committed = false;
  repositorySpy.getDraft.mockReset();
  repositorySpy.updateDraftStatus.mockReset();
  repositorySpy.recordEvent.mockReset();
});

function makeDraft() {
  const content = {
    title: "Draft title",
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
    draftId: DRAFT_ID,
    tenantId: "tenant-1",
    status: "draft" as const,
    sourceRecord: record,
    revision: 3,
    createdBy: "actor-1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z",
  };
}

const validContent = {
  title: "Updated title",
  cefrLevel: "B1",
  paragraphs: [{ order: 0, text: "updated paragraph" }],
  questions: [],
  assets: [],
};

describe("workbook draft actions / authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireWorkbookSession).mockResolvedValue(session);
  });

  it("returns a structured unauthorized failure and does not touch the repository without a session", async () => {
    vi.mocked(requireWorkbookSession).mockRejectedValue(
      new WorkbookAuthorizationError("UNAUTHORIZED", "workbooks access requires an authorized session"),
    );
    const result = await updateDraftAction(DRAFT_ID, 3, validContent);
    expect(result).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      message: "workbooks access requires an authorized session",
      retryable: false,
    });
    expect(repositorySpy.getDraft).not.toHaveBeenCalled();
    expect(repositorySpy.updateDraftContent).not.toHaveBeenCalled();
  });

  it("scopes reads to the session tenant, never a caller-supplied tenant", async () => {
    repositorySpy.getDraft.mockResolvedValue(makeDraft());
    const result = await getDraftAction(DRAFT_ID);
    expect(result.ok).toBe(true);
    expect(repositorySpy.getDraft).toHaveBeenCalledWith(
      "tenant-1",
      DRAFT_ID,
    );
  });
});

describe("getDraftAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireWorkbookSession).mockResolvedValue(session);
  });

  it("returns the tenant-scoped draft", async () => {
    repositorySpy.getDraft.mockResolvedValue(makeDraft());
    const result = await getDraftAction(DRAFT_ID);
    expect(result).toEqual({ ok: true, draft: makeDraft() });
  });

  it("returns null when the draft does not exist", async () => {
    repositorySpy.getDraft.mockResolvedValue(null);
    const result = await getDraftAction(DRAFT_ID);
    expect(result).toEqual({ ok: true, draft: null });
  });
});

describe("previewDraftAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireWorkbookSession).mockResolvedValue(session);
    vi.mocked(getStorageUrl).mockReset();
    vi.mocked(getStorageUrl).mockReturnValue(
      "https://cdn.example.com/resolved.png",
    );
  });

  it("renders the draft's normalized content as preview html", async () => {
    repositorySpy.getDraft.mockResolvedValue(makeDraft());
    const result = await previewDraftAction(DRAFT_ID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.html).toContain("<h1>Draft title</h1>");
      expect(result.html).toContain("<p>CEFR: A2</p>");
      expect(result.html).not.toContain("· Edition");
      expect(result.html).toContain("<p>paragraph</p>");
    }
  });

  it("scopes the preview read to the session tenant", async () => {
    repositorySpy.getDraft.mockResolvedValue(makeDraft());
    const result = await previewDraftAction(DRAFT_ID);
    expect(result.ok).toBe(true);
    expect(repositorySpy.getDraft).toHaveBeenCalledWith("tenant-1", DRAFT_ID);
  });

  it("returns a structured NOT_FOUND failure when the draft does not exist", async () => {
    repositorySpy.getDraft.mockResolvedValue(null);
    const result = await previewDraftAction(DRAFT_ID);
    expect(result).toEqual({ ok: false, code: "NOT_FOUND", message: "draft not found" });
  });

  it("returns a structured unauthorized failure and does not touch the repository", async () => {
    vi.mocked(requireWorkbookSession).mockRejectedValue(
      new WorkbookAuthorizationError(
        "UNAUTHORIZED",
        "workbooks access requires an authorized session",
      ),
    );
    const result = await previewDraftAction(DRAFT_ID);
    expect(result).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      message: "workbooks access requires an authorized session",
    });
    expect(repositorySpy.getDraft).not.toHaveBeenCalled();
  });

  it("rejects an invalid draft id without touching the repository", async () => {
    const result = await previewDraftAction("");
    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "invalid draft id",
    });
    expect(repositorySpy.getDraft).not.toHaveBeenCalled();
  });

  it("resolves key-only article images to storage URLs before rendering", async () => {
    const draft = makeDraft();
    draft.sourceRecord.content = {
      ...draft.sourceRecord.content,
      articleImages: [{ key: "img/hero.png", position: "hero" }],
    };
    repositorySpy.getDraft.mockResolvedValue(draft);
    vi.mocked(getStorageUrl).mockReturnValue(
      "https://cdn.example.com/resolved/hero.png",
    );
    const renderSpy = vi
      .spyOn(workbooks, "renderWorkbookContentHtml")
      .mockReturnValue("<html>preview</html>");
    try {
      const result = await previewDraftAction(DRAFT_ID);
      expect(result.ok).toBe(true);
      expect(getStorageUrl).toHaveBeenCalledWith("img/hero.png");
      const rendered =
        renderSpy.mock.calls[0][0] as workbooks.WorkbookNormalizedContent;
      expect(rendered.articleImages?.[0]).toMatchObject({
        key: "img/hero.png",
        position: "hero",
        legacyUrl: "https://cdn.example.com/resolved/hero.png",
      });
    } finally {
      renderSpy.mockRestore();
    }
  });

  it("still renders the preview when storage URL resolution fails per image", async () => {
    const draft = makeDraft();
    draft.sourceRecord.content = {
      ...draft.sourceRecord.content,
      articleImages: [{ key: "img/hero.png" }],
    };
    repositorySpy.getDraft.mockResolvedValue(draft);
    vi.mocked(getStorageUrl).mockImplementation(() => {
      throw new Error("storage down");
    });
    const renderSpy = vi
      .spyOn(workbooks, "renderWorkbookContentHtml")
      .mockReturnValue("<html>preview</html>");
    try {
      const result = await previewDraftAction(DRAFT_ID);
      expect(result.ok).toBe(true);
      const rendered =
        renderSpy.mock.calls[0][0] as workbooks.WorkbookNormalizedContent;
      expect(rendered.articleImages?.[0]?.legacyUrl).toBeUndefined();
      expect(rendered.articleImages?.[0]?.key).toBe("img/hero.png");
    } finally {
      renderSpy.mockRestore();
    }
  });
});

describe("updateDraftAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireWorkbookSession).mockResolvedValue(session);
  });

  it("saves normalized content through the domain command", async () => {
    const updated = { ...makeDraft(), revision: 4 };
    repositorySpy.getDraft.mockResolvedValue(makeDraft());
    repositorySpy.updateDraftContent.mockResolvedValue(updated);
    const result = await updateDraftAction(DRAFT_ID, 3, validContent);
    expect(result).toEqual({ ok: true, draft: updated });
  });

  it("rejects content that fails the normalized contract at the boundary", async () => {
    const result = await updateDraftAction(DRAFT_ID, 3, {
      ...validContent,
      title: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VALIDATION_ERROR");
    }
    expect(repositorySpy.updateDraftContent).not.toHaveBeenCalled();
  });

  it("rejects a stale revision with a structured REVISION_CONFLICT failure", async () => {
    repositorySpy.getDraft.mockResolvedValue(makeDraft());
    repositorySpy.updateDraftContent.mockRejectedValue(
      new workbooks.WorkbookPublicationError(
        "REVISION_CONFLICT",
        "Revision conflict: actual revision 4 does not match expected revision 3.",
      ),
    );
    const result = await updateDraftAction(DRAFT_ID, 3, validContent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("REVISION_CONFLICT");
      expect(result.retryable).toBe(false);
    }
  });

  it("returns a structured failure for a draft that is not editable", async () => {
    repositorySpy.getDraft.mockResolvedValue(
      makeDraft() as ReturnType<typeof makeDraft>,
    );
    const published = { ...makeDraft(), status: "published" as const };
    repositorySpy.getDraft.mockResolvedValue(published);
    const result = await updateDraftAction(DRAFT_ID, 3, validContent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("EDITION_IMMUTABLE");
    }
  });
});

const validSettings = {
  seriesName: "Quest",
  levelNumber: "5",
  cefrLevel: "A1",
  type: "secondary" as const,
};

describe("updateDraftSettingsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireWorkbookSession).mockResolvedValue(session);
  });

  it("replaces draft settings through the domain command", async () => {
    const updated = { ...makeDraft(), revision: 4 };
    repositorySpy.getDraft.mockResolvedValue(makeDraft());
    repositorySpy.updateDraftSettings.mockResolvedValue(updated);
    const result = await updateDraftSettingsAction(DRAFT_ID, 3, validSettings);
    expect(result).toEqual({ ok: true, draft: updated });
    expect(repositorySpy.updateDraftSettings).toHaveBeenCalledWith(
      "tenant-1",
      DRAFT_ID,
      3,
      validSettings,
      expect.any(String),
    );
  });

  it("returns a structured unauthorized failure and does not touch the repository without a session", async () => {
    vi.mocked(requireWorkbookSession).mockRejectedValue(
      new WorkbookAuthorizationError(
        "UNAUTHORIZED",
        "workbooks access requires an authorized session",
      ),
    );
    const result = await updateDraftSettingsAction(DRAFT_ID, 3, validSettings);
    expect(result).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      message: "workbooks access requires an authorized session",
      retryable: false,
    });
    expect(repositorySpy.getDraft).not.toHaveBeenCalled();
    expect(repositorySpy.updateDraftSettings).not.toHaveBeenCalled();
  });

  it("rejects an invalid draft id without touching the repository", async () => {
    const result = await updateDraftSettingsAction("", 3, validSettings);
    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "invalid draft id",
      retryable: false,
    });
    expect(repositorySpy.updateDraftSettings).not.toHaveBeenCalled();
  });

  it("rejects an invalid revision without touching the repository", async () => {
    const result = await updateDraftSettingsAction(DRAFT_ID, -1, validSettings);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VALIDATION_ERROR");
      expect(result.message).toBe("invalid revision");
    }
    expect(repositorySpy.updateDraftSettings).not.toHaveBeenCalled();
  });

  it("rejects settings that fail the settings contract at the boundary", async () => {
    const result = await updateDraftSettingsAction(DRAFT_ID, 3, {
      ...validSettings,
      type: "tertiary",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VALIDATION_ERROR");
    }
    expect(repositorySpy.updateDraftSettings).not.toHaveBeenCalled();
  });

  it("rejects a stale revision with a structured REVISION_CONFLICT failure", async () => {
    repositorySpy.getDraft.mockResolvedValue(makeDraft());
    repositorySpy.updateDraftSettings.mockRejectedValue(
      new workbooks.WorkbookPublicationError(
        "REVISION_CONFLICT",
        "Revision conflict: actual revision 4 does not match expected revision 3.",
      ),
    );
    const result = await updateDraftSettingsAction(DRAFT_ID, 3, validSettings);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("REVISION_CONFLICT");
      expect(result.retryable).toBe(true);
    }
  });

  it("returns a structured non-retryable failure for other publication errors", async () => {
    repositorySpy.getDraft.mockResolvedValue(makeDraft());
    repositorySpy.updateDraftSettings.mockRejectedValue(
      new workbooks.WorkbookPublicationError(
        "EDITION_IMMUTABLE",
        'Cannot edit a draft in status "published".',
      ),
    );
    const result = await updateDraftSettingsAction(DRAFT_ID, 3, validSettings);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("EDITION_IMMUTABLE");
      expect(result.retryable).toBe(false);
    }
  });
});

describe("submitDraftForReviewAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireWorkbookSession).mockResolvedValue(session);
  });

  it("transitions a draft to in_review and records the submission event", async () => {
    const updated = { ...makeDraft(), status: "in_review" as const, revision: 4 };
    repositorySpy.getDraft.mockResolvedValue(makeDraft());
    repositorySpy.updateDraftStatus.mockResolvedValue(updated);
    const result = await submitDraftForReviewAction(DRAFT_ID, 3);
    expect(result).toEqual({ ok: true, draft: updated });
    expect(repositorySpy.updateDraftStatus).toHaveBeenCalledWith(
      "tenant-1",
      DRAFT_ID,
      "in_review",
      3,
    );
    expect(repositorySpy.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        draftId: DRAFT_ID,
        editionId: null,
        eventType: "submitted_for_review",
        actorId: "actor-1",
      }),
    );
  });

  it("returns a structured unauthorized failure and does not touch the repository without a session", async () => {
    vi.mocked(requireWorkbookSession).mockRejectedValue(
      new WorkbookAuthorizationError(
        "UNAUTHORIZED",
        "workbooks access requires an authorized session",
      ),
    );
    const result = await submitDraftForReviewAction(DRAFT_ID, 3);
    expect(result).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      message: "workbooks access requires an authorized session",
      retryable: false,
    });
    expect(repositorySpy.getDraft).not.toHaveBeenCalled();
    expect(repositorySpy.updateDraftStatus).not.toHaveBeenCalled();
    expect(repositorySpy.recordEvent).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND for a draft outside the session tenant without leaking existence", async () => {
    repositorySpy.getDraft.mockResolvedValue(null);
    const result = await submitDraftForReviewAction(DRAFT_ID, 3);
    expect(result).toEqual({
      ok: false,
      code: "NOT_FOUND",
      message: "draft not found",
      retryable: false,
    });
    expect(repositorySpy.updateDraftStatus).not.toHaveBeenCalled();
    expect(repositorySpy.recordEvent).not.toHaveBeenCalled();
  });

  it("rejects an invalid draft id without touching the repository", async () => {
    const result = await submitDraftForReviewAction("", 3);
    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "invalid draft id",
      retryable: false,
    });
    expect(repositorySpy.getDraft).not.toHaveBeenCalled();
    expect(repositorySpy.updateDraftStatus).not.toHaveBeenCalled();
  });

  it("rejects an invalid revision without touching the repository", async () => {
    const result = await submitDraftForReviewAction(DRAFT_ID, -1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VALIDATION_ERROR");
      expect(result.message).toBe("invalid revision");
    }
    expect(repositorySpy.updateDraftStatus).not.toHaveBeenCalled();
  });

  it("maps a stale revision to a structured retryable REVISION_CONFLICT failure", async () => {
    repositorySpy.getDraft.mockResolvedValue(makeDraft());
    repositorySpy.updateDraftStatus.mockRejectedValue(
      new workbooks.WorkbookPublicationError(
        "REVISION_CONFLICT",
        "Revision conflict: actual revision 4 does not match expected revision 3.",
      ),
    );
    const result = await submitDraftForReviewAction(DRAFT_ID, 3);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("REVISION_CONFLICT");
      expect(result.retryable).toBe(true);
    }
    expect(repositorySpy.recordEvent).not.toHaveBeenCalled();
  });

  it("maps a submission from an already in-review draft to ILLEGAL_STATE_TRANSITION", async () => {
    repositorySpy.getDraft.mockResolvedValue({
      ...makeDraft(),
      status: "in_review" as const,
    });
    const result = await submitDraftForReviewAction(DRAFT_ID, 3);
    expect(result).toEqual({
      ok: false,
      code: "ILLEGAL_STATE_TRANSITION",
      message: 'Cannot transition workbook from "in_review" to "in_review".',
      retryable: false,
    });
    expect(repositorySpy.updateDraftStatus).not.toHaveBeenCalled();
    expect(repositorySpy.recordEvent).not.toHaveBeenCalled();
  });

  it("maps a submission from a released status to EDITION_IMMUTABLE", async () => {
    repositorySpy.getDraft.mockResolvedValue({
      ...makeDraft(),
      status: "published" as const,
    });
    const result = await submitDraftForReviewAction(DRAFT_ID, 3);
    expect(result).toEqual({
      ok: false,
      code: "EDITION_IMMUTABLE",
      message: 'Cannot transition workbook from "published" to "in_review".',
      retryable: false,
    });
    expect(repositorySpy.updateDraftStatus).not.toHaveBeenCalled();
    expect(repositorySpy.recordEvent).not.toHaveBeenCalled();
  });

  it("commits the status write and audit event in one transaction", async () => {
    const updated = { ...makeDraft(), status: "in_review" as const, revision: 4 };
    repositorySpy.getDraft.mockResolvedValue(makeDraft());
    repositorySpy.updateDraftStatus.mockResolvedValue(updated);
    const result = await submitDraftForReviewAction(DRAFT_ID, 3);
    expect(result.ok).toBe(true);
    expect(transactionState.started).toBe(1);
    expect(transactionState.committed).toBe(true);
  });

  it("rolls back the status write when recording the audit event fails", async () => {
    repositorySpy.getDraft.mockResolvedValue(makeDraft());
    repositorySpy.updateDraftStatus.mockResolvedValue({
      ...makeDraft(),
      status: "in_review" as const,
      revision: 4,
    });
    repositorySpy.recordEvent.mockRejectedValue(
      new Error("event store down"),
    );
    await expect(submitDraftForReviewAction(DRAFT_ID, 3)).rejects.toThrow(
      "event store down",
    );
    expect(transactionState.started).toBe(1);
    expect(transactionState.committed).toBe(false);
  });
});

describe("returnDraftToDraftAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireWorkbookSession).mockResolvedValue(session);
  });

  it("returns an in-review draft to draft status and records the return event", async () => {
    const updated = { ...makeDraft(), status: "draft" as const, revision: 4 };
    repositorySpy.getDraft.mockResolvedValue({
      ...makeDraft(),
      status: "in_review" as const,
    });
    repositorySpy.updateDraftStatus.mockResolvedValue(updated);
    const result = await returnDraftToDraftAction(DRAFT_ID, 3);
    expect(result).toEqual({ ok: true, draft: updated });
    expect(repositorySpy.updateDraftStatus).toHaveBeenCalledWith(
      "tenant-1",
      DRAFT_ID,
      "draft",
      3,
    );
    expect(repositorySpy.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        draftId: DRAFT_ID,
        editionId: null,
        eventType: "returned_to_draft",
        actorId: "actor-1",
      }),
    );
  });

  it("returns a structured unauthorized failure and does not touch the repository without a session", async () => {
    vi.mocked(requireWorkbookSession).mockRejectedValue(
      new WorkbookAuthorizationError(
        "UNAUTHORIZED",
        "workbooks access requires an authorized session",
      ),
    );
    const result = await returnDraftToDraftAction(DRAFT_ID, 3);
    expect(result).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      message: "workbooks access requires an authorized session",
      retryable: false,
    });
    expect(repositorySpy.getDraft).not.toHaveBeenCalled();
    expect(repositorySpy.updateDraftStatus).not.toHaveBeenCalled();
    expect(repositorySpy.recordEvent).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND for a draft outside the session tenant without leaking existence", async () => {
    repositorySpy.getDraft.mockResolvedValue(null);
    const result = await returnDraftToDraftAction(DRAFT_ID, 3);
    expect(result).toEqual({
      ok: false,
      code: "NOT_FOUND",
      message: "draft not found",
      retryable: false,
    });
    expect(repositorySpy.updateDraftStatus).not.toHaveBeenCalled();
    expect(repositorySpy.recordEvent).not.toHaveBeenCalled();
  });

  it("maps a stale revision to a structured retryable REVISION_CONFLICT failure", async () => {
    repositorySpy.getDraft.mockResolvedValue({
      ...makeDraft(),
      status: "in_review" as const,
    });
    repositorySpy.updateDraftStatus.mockRejectedValue(
      new workbooks.WorkbookPublicationError(
        "REVISION_CONFLICT",
        "Revision conflict: actual revision 4 does not match expected revision 3.",
      ),
    );
    const result = await returnDraftToDraftAction(DRAFT_ID, 3);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("REVISION_CONFLICT");
      expect(result.retryable).toBe(true);
    }
    expect(repositorySpy.recordEvent).not.toHaveBeenCalled();
  });

  it("maps returning a plain draft to ILLEGAL_STATE_TRANSITION", async () => {
    repositorySpy.getDraft.mockResolvedValue(makeDraft());
    const result = await returnDraftToDraftAction(DRAFT_ID, 3);
    expect(result).toEqual({
      ok: false,
      code: "ILLEGAL_STATE_TRANSITION",
      message: 'Cannot transition workbook from "draft" to "draft".',
      retryable: false,
    });
    expect(repositorySpy.updateDraftStatus).not.toHaveBeenCalled();
    expect(repositorySpy.recordEvent).not.toHaveBeenCalled();
  });

  it("maps returning a released draft to EDITION_IMMUTABLE", async () => {
    repositorySpy.getDraft.mockResolvedValue({
      ...makeDraft(),
      status: "published" as const,
    });
    const result = await returnDraftToDraftAction(DRAFT_ID, 3);
    expect(result).toEqual({
      ok: false,
      code: "EDITION_IMMUTABLE",
      message: 'Cannot transition workbook from "published" to "draft".',
      retryable: false,
    });
    expect(repositorySpy.updateDraftStatus).not.toHaveBeenCalled();
    expect(repositorySpy.recordEvent).not.toHaveBeenCalled();
  });
});

describe("workbook draft actions / draft id validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireWorkbookSession).mockResolvedValue(session);
  });

  it("rejects a non-UUID draft id with a structured VALIDATION_ERROR and never touches the repository", async () => {
    const nonUuid = "not-a-uuid";
    const cases = [
      () => getDraftAction(nonUuid),
      () => previewDraftAction(nonUuid),
      () => updateDraftAction(nonUuid, 3, validContent),
      () => updateDraftSettingsAction(nonUuid, 3, validSettings),
      () => submitDraftForReviewAction(nonUuid, 3),
      () => returnDraftToDraftAction(nonUuid, 3),
    ];
    for (const invoke of cases) {
      const result = await invoke();
      expect(result).toMatchObject({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "invalid draft id",
      });
    }
    expect(repositorySpy.getDraft).not.toHaveBeenCalled();
    expect(repositorySpy.updateDraftStatus).not.toHaveBeenCalled();
    expect(repositorySpy.recordEvent).not.toHaveBeenCalled();
  });
});
