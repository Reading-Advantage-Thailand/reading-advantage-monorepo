// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { workbooks } from "@reading-advantage/domain";
import { useDraftLessonEditor } from "./use-draft-lesson-editor";

vi.mock("./actions", () => ({
  getDraftAction: vi.fn(),
  updateDraftAction: vi.fn(),
}));

import { getDraftAction, updateDraftAction } from "./actions";

function makeDraft(
  overrides: Partial<workbooks.WorkbookDraft> = {},
): workbooks.WorkbookDraft {
  const content = {
    title: "Draft title",
    cefrLevel: "A2",
    paragraphs: [{ order: 0, text: "First paragraph." }],
    questions: [
      {
        questionId: "q-1",
        prompt: "Where is the map?",
        questionType: "multiple-choice",
        choices: ["A", "B"],
      },
    ],
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
    draftId: "draft-1",
    tenantId: "tenant-1",
    status: "draft",
    sourceRecord: record,
    revision: 3,
    createdBy: "actor-1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z",
    ...overrides,
  };
}

function makeUpdatedDraft() {
  const draft = makeDraft();
  return {
    ...draft,
    revision: 4,
    sourceRecord: {
      ...draft.sourceRecord,
      content: {
        ...draft.sourceRecord.content,
        title: "Updated title",
      },
    },
  };
}

describe("useDraftLessonEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("derives the legacy-shaped lesson from the initial draft", () => {
    const { result } = renderHook(() =>
      useDraftLessonEditor({ initialDraft: makeDraft() }),
    );
    expect(result.current.lesson.lesson_title).toBe("Draft title");
    expect(result.current.lesson.cefr_level).toBe("A2");
    expect(result.current.lesson.article_paragraphs).toEqual([
      { number: 1, text: "First paragraph." },
    ]);
    expect(result.current.lesson.comprehension_questions).toEqual([
      { number: 1, question: "Where is the map?", options: ["A", "B"] },
    ]);
  });

  it("updates one legacy field through setLessonField", () => {
    const { result } = renderHook(() =>
      useDraftLessonEditor({ initialDraft: makeDraft() }),
    );
    act(() => {
      result.current.setLessonField("lesson_title", "New title");
    });
    expect(result.current.lesson.lesson_title).toBe("New title");
  });

  it("persists mapped normalized content and applies the returned draft", async () => {
    vi.mocked(updateDraftAction).mockResolvedValue({
      ok: true,
      draft: makeUpdatedDraft(),
    });
    const { result } = renderHook(() =>
      useDraftLessonEditor({ initialDraft: makeDraft() }),
    );
    act(() => {
      result.current.setLessonField("lesson_title", "Updated title");
    });
    await act(async () => {
      await result.current.validateAndSave();
    });
    expect(updateDraftAction).toHaveBeenCalledWith(
      "draft-1",
      3,
      expect.objectContaining({
        title: "Updated title",
        cefrLevel: "A2",
      }),
    );
    expect(result.current.lesson.lesson_title).toBe("Updated title");
    expect(result.current.saveSuccess).toBe(true);
    expect(result.current.revisionConflict).toBe(false);
  });

  it("sets field errors and skips the action for invalid lessons", async () => {
    const { result } = renderHook(() =>
      useDraftLessonEditor({ initialDraft: makeDraft() }),
    );
    act(() => {
      result.current.setLessonField("lesson_title", "");
    });
    await act(async () => {
      await result.current.validateAndSave();
    });
    expect(updateDraftAction).not.toHaveBeenCalled();
    expect(result.current.errors.lesson_title).toBeTruthy();
  });

  it("surfaces a revision conflict and reloads the latest draft", async () => {
    const conflictMessage =
      "Revision conflict: actual revision 4 does not match expected revision 3.";
    vi.mocked(updateDraftAction).mockResolvedValue({
      ok: false,
      code: "REVISION_CONFLICT",
      message: conflictMessage,
      retryable: false,
    });
    vi.mocked(getDraftAction).mockResolvedValue({
      ok: true,
      draft: makeUpdatedDraft(),
    });
    const { result } = renderHook(() =>
      useDraftLessonEditor({ initialDraft: makeDraft() }),
    );
    await act(async () => {
      await result.current.validateAndSave();
    });
    expect(result.current.revisionConflict).toBe(true);
    expect(result.current.revisionConflictMessage).toBe(conflictMessage);
    expect(getDraftAction).toHaveBeenCalledWith("draft-1");
    expect(result.current.lesson.lesson_title).toBe("Updated title");
  });

  it("renders other structured failures as a form error", async () => {
    vi.mocked(updateDraftAction).mockResolvedValue({
      ok: false,
      code: "EDITION_IMMUTABLE",
      message: "Cannot edit a draft in status \"published\".",
      retryable: false,
    });
    const { result } = renderHook(() =>
      useDraftLessonEditor({ initialDraft: makeDraft() }),
    );
    await act(async () => {
      await result.current.validateAndSave();
    });
    expect(result.current.errors._form).toContain("Cannot edit a draft");
    expect(result.current.revisionConflict).toBe(false);
  });

  it("refreshes the latest revision from the server", async () => {
    vi.mocked(getDraftAction).mockResolvedValue({
      ok: true,
      draft: makeUpdatedDraft(),
    });
    const { result } = renderHook(() =>
      useDraftLessonEditor({ initialDraft: makeDraft() }),
    );
    await act(async () => {
      await result.current.refreshFromServer();
    });
    expect(result.current.lesson.lesson_title).toBe("Updated title");
  });
});
