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

vi.mock("@reading-advantage/storage", () => ({
  getStorageUrl: vi.fn(),
}));

import { getStorageUrl } from "@reading-advantage/storage";
import { compileTeacherManualAction } from "./teacher-manual-actions";
import {
  requireWorkbookSession,
  WorkbookAuthorizationError,
  type WorkbookSession,
} from "./lib/session";

const DRAFT_1 = "c0a80101-0000-4000-8000-000000000001";
const DRAFT_2 = "c0a80101-0000-4000-8000-000000000002";
const DRAFT_3 = "c0a80101-0000-4000-8000-000000000003";
const DRAFT_10 = "c0a80101-0000-4000-8000-000000000010";

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
    articleImages: workbooks.WorkbookArticleImage[];
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
    ...(overrides.articleImages !== undefined
      ? { articleImages: overrides.articleImages }
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
    const result = await compileTeacherManualAction([DRAFT_1], "en");
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
    const result = await compileTeacherManualAction([DRAFT_1], "en");
    expect(result).toEqual({
      ok: false,
      code: "FORBIDDEN",
      message: "workbooks access requires the WORKBOOK_ADMIN role",
    });
    expect(repositorySpy.getDraft).not.toHaveBeenCalled();
    expect(workbooks.compileTeacherManual).not.toHaveBeenCalled();
  });

  it("scopes every draft read to the session tenant", async () => {
    repositorySpy.getDraft.mockResolvedValue(makeDraft(DRAFT_1));
    vi.mocked(workbooks.compileTeacherManual).mockReturnValue({
      html: "<!DOCTYPE html>",
      lessonCount: 1,
    });
    await compileTeacherManualAction([DRAFT_1], "en");
    expect(repositorySpy.getDraft).toHaveBeenCalledWith("tenant-1", DRAFT_1);
  });
});

describe("compileTeacherManualAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireWorkbookSession).mockResolvedValue(session);
    vi.mocked(getStorageUrl).mockReset();
    vi.mocked(getStorageUrl).mockReturnValue(
      "https://cdn.example.com/resolved.png",
    );
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

  it("rejects a non-UUID draft id without touching the repository", async () => {
    const result = await compileTeacherManualAction(["not-a-uuid"], "en");
    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "at least one draft id is required",
    });
    expect(repositorySpy.getDraft).not.toHaveBeenCalled();
    expect(workbooks.compileTeacherManual).not.toHaveBeenCalled();
  });

  it("rejects more than 50 draft ids without touching the repository", async () => {
    const ids = Array.from(
      { length: 51 },
      (_, index) =>
        `c0a80101-0000-4000-8000-${String(index).padStart(12, "0")}`,
    );
    const result = await compileTeacherManualAction(ids, "en");
    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "no more than 50 draft ids are allowed",
    });
    expect(repositorySpy.getDraft).not.toHaveBeenCalled();
    expect(workbooks.compileTeacherManual).not.toHaveBeenCalled();
  });

  it("fetches each unique draft id exactly once", async () => {
    repositorySpy.getDraft.mockResolvedValue(makeDraft(DRAFT_1));
    vi.mocked(workbooks.compileTeacherManual).mockReturnValue({
      html: "<!DOCTYPE html>",
      lessonCount: 2,
    });

    const result = await compileTeacherManualAction(
      [DRAFT_1, DRAFT_2, DRAFT_1],
      "en",
    );

    expect(result.ok).toBe(true);
    expect(repositorySpy.getDraft).toHaveBeenCalledTimes(2);
    expect(repositorySpy.getDraft).toHaveBeenCalledWith("tenant-1", DRAFT_1);
    expect(repositorySpy.getDraft).toHaveBeenCalledWith("tenant-1", DRAFT_2);
  });

  it("fails closed with a generic error and never compiles when any requested draft is missing", async () => {
    repositorySpy.getDraft.mockImplementation(async (_tenantId: string, draftId: string) =>
      draftId === DRAFT_1 ? makeDraft(DRAFT_1) : null,
    );
    const result = await compileTeacherManualAction([DRAFT_1, DRAFT_2], "en");
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
        [DRAFT_10]: makeDraft(DRAFT_10, { lessonNumber: "10", title: "Lesson Ten" }),
        [DRAFT_2]: makeDraft(DRAFT_2, { lessonNumber: "2", title: "Lesson Two" }),
        [DRAFT_1]: makeDraft(DRAFT_1, { lessonNumber: "1", title: "Lesson One" }),
        [DRAFT_3]: makeDraft(DRAFT_3, { title: "Lesson Three" }),
      })[draftId],
    );
    vi.mocked(workbooks.compileTeacherManual).mockReturnValue({
      html: "<!DOCTYPE html>",
      lessonCount: 4,
    });

    const result = await compileTeacherManualAction(
      [DRAFT_3, DRAFT_10, DRAFT_2, DRAFT_1],
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
        [DRAFT_1]: makeDraft(DRAFT_1, {
          lessonNumber: "1",
          title: "First",
          settings: {
            seriesName: "Quest",
            levelNumber: "5",
            cefrLevel: "B1",
            type: "secondary",
          },
        }),
        [DRAFT_2]: makeDraft(DRAFT_2, {
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

    await compileTeacherManualAction([DRAFT_2, DRAFT_1], "en");

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
      makeDraft(DRAFT_1, { lessonNumber: "1", title: "First" }),
    );

    await compileTeacherManualAction([DRAFT_1], "en");

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
    repositorySpy.getDraft.mockResolvedValue(makeDraft(DRAFT_1));

    const result = await compileTeacherManualAction([DRAFT_1], "fr");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lang).toBe("en");
    }
    expect(compiledSettingsArgs().lang).toBe("en");
  });

  it("returns a structured failure when the compiler throws", async () => {
    repositorySpy.getDraft.mockResolvedValue(makeDraft(DRAFT_1));
    vi.mocked(workbooks.compileTeacherManual).mockImplementation(() => {
      throw new Error("boom");
    });

    const result = await compileTeacherManualAction([DRAFT_1], "en");

    expect(result).toEqual({
      ok: false,
      code: "COMPILE_ERROR",
      message: "the teacher manual could not be compiled",
    });
  });

  it("resolves key-only article images to storage URLs before compiling", async () => {
    repositorySpy.getDraft.mockResolvedValue(
      makeDraft(DRAFT_1, {
        articleImages: [{ key: "img/hero.png", position: "hero" }],
      }),
    );
    vi.mocked(getStorageUrl).mockReturnValue(
      "https://cdn.example.com/resolved/hero.png",
    );

    const result = await compileTeacherManualAction([DRAFT_1], "en");

    expect(result.ok).toBe(true);
    expect(getStorageUrl).toHaveBeenCalledWith("img/hero.png");
    const contents = compiledContentArgs();
    expect(contents[0].articleImages).toEqual([
      {
        key: "img/hero.png",
        position: "hero",
        legacyUrl: "https://cdn.example.com/resolved/hero.png",
      },
    ]);
  });

  it("preserves legacyUrl provenance without calling storage", async () => {
    repositorySpy.getDraft.mockResolvedValue(
      makeDraft(DRAFT_1, {
        articleImages: [
          { legacyUrl: "https://legacy.example.com/hero.png", position: "hero" },
        ],
      }),
    );

    const result = await compileTeacherManualAction([DRAFT_1], "en");

    expect(result.ok).toBe(true);
    expect(getStorageUrl).not.toHaveBeenCalled();
    const contents = compiledContentArgs();
    expect(contents[0].articleImages?.[0]?.legacyUrl).toBe(
      "https://legacy.example.com/hero.png",
    );
  });

  it("still compiles when storage URL resolution fails per image", async () => {
    repositorySpy.getDraft.mockResolvedValue(
      makeDraft(DRAFT_1, {
        articleImages: [
          { key: "img/broken.png", position: "hero" },
          { key: "img/ok.png", position: "inline-para-1" },
        ],
      }),
    );
    vi.mocked(getStorageUrl).mockImplementation((key: string) => {
      if (key === "img/ok.png") return "https://cdn.example.com/resolved/ok.png";
      throw new Error("storage down");
    });

    const result = await compileTeacherManualAction([DRAFT_1], "en");

    expect(result.ok).toBe(true);
    const contents = compiledContentArgs();
    expect(contents[0].articleImages?.[0]?.legacyUrl).toBeUndefined();
    expect(contents[0].articleImages?.[1]?.legacyUrl).toBe(
      "https://cdn.example.com/resolved/ok.png",
    );
  });
});
