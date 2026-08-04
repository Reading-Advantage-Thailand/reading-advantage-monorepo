import { beforeEach, describe, expect, it, vi } from "vitest";
import { workbooks } from "@reading-advantage/domain";

vi.mock("./lib/session", () => ({
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
};

vi.mock("../lib/repository", () => ({
  getWorkbookRepository: () => repositorySpy,
}));

vi.mock("@reading-advantage/domain", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/domain")>();
  return {
    ...actual,
    workbooks: {
      ...actual.workbooks,
      compileTeacherManual: vi.fn(),
    },
  };
});

import { compileTeacherManualAction } from "./teacher-manual-actions";
import {
  requireWorkbookSession,
  WorkbookAuthorizationError,
  type WorkbookSession,
} from "./lib/session";

const session: WorkbookSession = {
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

function makeDraft(
  draftId: string,
  overrides: Partial<{
    lessonNumber: string | undefined;
    title: string;
    settings: workbooks.WorkbookDraftSettings | undefined;
  }> = {},
): workbooks.WorkbookDraft {
  const content = {
    title: overrides.title ?? `Draft ${draftId}`,
    cefrLevel: "A2",
    paragraphs: [{ order: 0, text: "paragraph" }],
    questions: [],
    assets: [],
    ...(overrides.lessonNumber !== undefined
      ? { lessonNumber: overrides.lessonNumber }
      : {}),
  };
  const record: workbooks.WorkbookSourceRecord = {
    identity: {
      sourceApp: "reading-advantage",
      sourceId: `src-${draftId}`,
      sourceRevision: "rev-1",
      contentHash: workbooks.computeWorkbookDigest(content),
    },
    content,
    ...(overrides.settings !== undefined ? { settings: overrides.settings } : {}),
  };
  return {
    draftId,
    tenantId: "tenant-1",
    status: "draft" as const,
    sourceRecord: record,
    revision: 3,
    createdBy: "actor-1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z",
  };
}

function compiledContentArgs(): workbooks.WorkbookNormalizedContent[] {
  const call = vi.mocked(workbooks.compileTeacherManual).mock.calls.at(-1);
  expect(call).toBeDefined();
  return call![0] as workbooks.WorkbookNormalizedContent[];
}

function compiledSettingsArgs(): {
  seriesName: string;
  seriesLevel: string;
  cefrLevel: string;
  type: "primary" | "secondary";
  lang: string;
} {
  const call = vi.mocked(workbooks.compileTeacherManual).mock.calls.at(-1);
  expect(call).toBeDefined();
  return {
    seriesName: call![1] as string,
    seriesLevel: call![2] as string,
    cefrLevel: call![3] as string,
    type: call![4] as "primary" | "secondary",
    lang: call![5] as string,
  };
}

describe("compileTeacherManualAction / authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireWorkbookSession).mockResolvedValue(session);
  });

  it("returns a structured unauthorized failure and does not touch the repository without a session", async () => {
    vi.mocked(requireWorkbookSession).mockRejectedValue(
      new WorkbookAuthorizationError(
        "UNAUTHORIZED",
        "workbooks access requires an authorized session",
      ),
    );
    const result = await compileTeacherManualAction(["draft-1"], "en");
    expect(result).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      message: "workbooks access requires an authorized session",
    });
    expect(repositorySpy.getDraft).not.toHaveBeenCalled();
    expect(workbooks.compileTeacherManual).not.toHaveBeenCalled();
  });

  it("returns a structured forbidden failure for a non-WORKBOOK_ADMIN session", async () => {
    vi.mocked(requireWorkbookSession).mockResolvedValue(otherRoleSession);
    const result = await compileTeacherManualAction(["draft-1"], "en");
    expect(result).toEqual({
      ok: false,
      code: "FORBIDDEN",
      message: "workbooks access requires the WORKBOOK_ADMIN role",
    });
    expect(repositorySpy.getDraft).not.toHaveBeenCalled();
    expect(workbooks.compileTeacherManual).not.toHaveBeenCalled();
  });

  it("scopes every draft read to the session tenant", async () => {
    repositorySpy.getDraft.mockResolvedValue(makeDraft("draft-1"));
    vi.mocked(workbooks.compileTeacherManual).mockReturnValue({
      html: "<!DOCTYPE html>",
      lessonCount: 1,
    });
    await compileTeacherManualAction(["draft-1"], "en");
    expect(repositorySpy.getDraft).toHaveBeenCalledWith("tenant-1", "draft-1");
  });
});

describe("compileTeacherManualAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireWorkbookSession).mockResolvedValue(session);
    vi.mocked(workbooks.compileTeacherManual).mockReturnValue({
      html: "<!DOCTYPE html>",
      lessonCount: 0,
    });
  });

  it("rejects an empty draft selection without touching the repository", async () => {
    const result = await compileTeacherManualAction([], "en");
    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "at least one draft id is required",
    });
    expect(repositorySpy.getDraft).not.toHaveBeenCalled();
    expect(workbooks.compileTeacherManual).not.toHaveBeenCalled();
  });

  it("fails closed with a generic error and never compiles when any requested draft is missing", async () => {
    repositorySpy.getDraft.mockImplementation(async (_tenantId: string, draftId: string) =>
      draftId === "draft-1" ? makeDraft("draft-1") : null,
    );
    const result = await compileTeacherManualAction(["draft-1", "draft-2"], "en");
    expect(result).toEqual({
      ok: false,
      code: "NOT_FOUND",
      message: "one or more selected drafts are unavailable",
    });
    expect(workbooks.compileTeacherManual).not.toHaveBeenCalled();
  });

  it("compiles the selected drafts ordered by lesson number then title", async () => {
    repositorySpy.getDraft.mockImplementation(async (_tenantId: string, draftId: string) =>
      ({
        "draft-10": makeDraft("draft-10", { lessonNumber: "10", title: "Lesson Ten" }),
        "draft-2": makeDraft("draft-2", { lessonNumber: "2", title: "Lesson Two" }),
        "draft-1": makeDraft("draft-1", { lessonNumber: "1", title: "Lesson One" }),
        "draft-3": makeDraft("draft-3", { title: "Lesson Three" }),
      })[draftId],
    );
    vi.mocked(workbooks.compileTeacherManual).mockReturnValue({
      html: "<!DOCTYPE html>",
      lessonCount: 4,
    });

    const result = await compileTeacherManualAction(
      ["draft-3", "draft-10", "draft-2", "draft-1"],
      "en",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lessonCount).toBe(4);
    }
    const contents = compiledContentArgs();
    expect(contents.map((content) => content.title)).toEqual([
      "Lesson One",
      "Lesson Two",
      "Lesson Ten",
      "Lesson Three",
    ]);
  });

  it("resolves series metadata from the first ordered draft's settings", async () => {
    repositorySpy.getDraft.mockImplementation(async (_tenantId: string, draftId: string) =>
      ({
        "draft-1": makeDraft("draft-1", {
          lessonNumber: "1",
          title: "First",
          settings: {
            seriesName: "Quest",
            levelNumber: "5",
            cefrLevel: "B1",
            type: "secondary",
          },
        }),
        "draft-2": makeDraft("draft-2", {
          lessonNumber: "2",
          title: "Second",
          settings: {
            seriesName: "Ignored Series",
            levelNumber: "9",
            cefrLevel: "C1",
            type: "primary",
          },
        }),
      })[draftId],
    );

    await compileTeacherManualAction(["draft-2", "draft-1"], "en");

    const settings = compiledSettingsArgs();
    expect(settings).toEqual({
      seriesName: "Quest",
      seriesLevel: "5",
      cefrLevel: "B1",
      type: "secondary",
      lang: "en",
    });
  });

  it("applies the legacy defaults when the first draft has no settings", async () => {
    repositorySpy.getDraft.mockResolvedValue(
      makeDraft("draft-1", { lessonNumber: "1", title: "First" }),
    );

    await compileTeacherManualAction(["draft-1"], "en");

    const settings = compiledSettingsArgs();
    expect(settings).toEqual({
      seriesName: "Reading Advantage",
      seriesLevel: "",
      cefrLevel: "A1",
      type: "primary",
      lang: "en",
    });
  });

  it("falls back to English for an invalid language code", async () => {
    repositorySpy.getDraft.mockResolvedValue(makeDraft("draft-1"));

    const result = await compileTeacherManualAction(["draft-1"], "fr");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lang).toBe("en");
    }
    expect(compiledSettingsArgs().lang).toBe("en");
  });

  it("returns a structured failure when the compiler throws", async () => {
    repositorySpy.getDraft.mockResolvedValue(makeDraft("draft-1"));
    vi.mocked(workbooks.compileTeacherManual).mockImplementation(() => {
      throw new Error("boom");
    });

    const result = await compileTeacherManualAction(["draft-1"], "en");

    expect(result).toEqual({
      ok: false,
      code: "COMPILE_ERROR",
      message: "the teacher manual could not be compiled",
    });
  });
});
