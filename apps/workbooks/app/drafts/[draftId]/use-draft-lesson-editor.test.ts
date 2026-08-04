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

  it("loads the vocabulary, writing, connector, and reflection carriers", () => {
    const content = {
      ...makeDraft().sourceRecord.content,
      vocabulary: [{ word: "map", definition: "a drawing of a place" }],
      vocabMatch: [
        { number: 1, word: "map", letter: "A", definition: "a drawing" },
      ],
      vocabFill: [{ number: 1, sentence: "The ___ shows the library." }],
      vocabWordBank: ["map", "library"],
      connectionQuestion: "Have you used a map?",
      grammarSearchTerm: "simple past",
      phonicsFocus: "short a",
      discussionQuestion: "Why do we need maps?",
      writingPrompt: "Describe your neighborhood",
      writingPlanPrompts: ["Main idea:", "Details:"],
      writingSentenceFrames: ["First, I will..."],
      sentenceStarters: ["The map shows..."],
      reflectionFocus: "Today I learned:",
    };
    const { result } = renderHook(() =>
      useDraftLessonEditor({
        initialDraft: makeDraft({
          sourceRecord: { ...makeDraft().sourceRecord, content },
        }),
      }),
    );
    expect(result.current.lesson.vocabulary).toEqual([
      { word: "map", definition: "a drawing of a place" },
    ]);
    expect(result.current.lesson.vocab_match).toEqual([
      { number: 1, word: "map", letter: "A", definition: "a drawing" },
    ]);
    expect(result.current.lesson.vocab_fill).toEqual([
      { number: 1, sentence: "The ___ shows the library." },
    ]);
    expect(result.current.lesson.vocab_word_bank).toEqual(["map", "library"]);
    expect(result.current.lesson.connection_question).toBe(
      "Have you used a map?",
    );
    expect(result.current.lesson.grammar_search_term).toBe("simple past");
    expect(result.current.lesson.phonics_focus).toBe("short a");
    expect(result.current.lesson.discussion_question).toBe(
      "Why do we need maps?",
    );
    expect(result.current.lesson.writing_prompt).toBe(
      "Describe your neighborhood",
    );
    expect(result.current.lesson.writing_plan_prompts).toEqual([
      "Main idea:",
      "Details:",
    ]);
    expect(result.current.lesson.writing_sentence_frames).toEqual([
      "First, I will...",
    ]);
    expect(result.current.lesson.sentence_starters).toEqual([
      "The map shows...",
    ]);
    expect(result.current.lesson.reflection_focus).toBe("Today I learned:");
  });

  it("persists edited writing and reflection fields through the action", async () => {
    const content = {
      ...makeDraft().sourceRecord.content,
      writingPrompt: "Describe your neighborhood",
      reflectionFocus: "Today I learned:",
    };
    vi.mocked(updateDraftAction).mockResolvedValue({
      ok: true,
      draft: makeUpdatedDraft(),
    });
    const { result } = renderHook(() =>
      useDraftLessonEditor({
        initialDraft: makeDraft({
          sourceRecord: { ...makeDraft().sourceRecord, content },
        }),
      }),
    );
    act(() => {
      result.current.setLessonField("writing_prompt", "New writing prompt");
    });
    await act(async () => {
      await result.current.validateAndSave();
    });
    expect(updateDraftAction).toHaveBeenCalledWith(
      "draft-1",
      3,
      expect.objectContaining({
        title: "Draft title",
        writingPrompt: "New writing prompt",
        reflectionFocus: "Today I learned:",
      }),
    );
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

  it("applies a settings save without touching unsaved lesson edits", () => {
    const { result } = renderHook(() =>
      useDraftLessonEditor({ initialDraft: makeDraft() }),
    );
    act(() => {
      result.current.setLessonField("lesson_title", "Unsaved local title");
    });
    const savedDraft = {
      ...makeDraft(),
      revision: 4,
      sourceRecord: {
        ...makeDraft().sourceRecord,
        settings: { type: "primary" as const, levelNumber: "2.1" },
      },
    };
    act(() => {
      result.current.applySettingsSave(savedDraft);
    });
    expect(result.current.settings).toEqual({
      type: "primary",
      levelNumber: "2.1",
    });
    expect(result.current.lesson.lesson_title).toBe("Unsaved local title");
  });

  it("surfaces a form-level error through setFormError", () => {
    const { result } = renderHook(() =>
      useDraftLessonEditor({ initialDraft: makeDraft() }),
    );
    act(() => {
      result.current.setFormError("draft not found");
    });
    expect(result.current.errors._form).toBe("draft not found");
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

  it("notifyRevisionConflict sets the conflict state and refreshes from the server", async () => {
    const conflictMessage =
      "Revision conflict: actual revision 4 does not match expected revision 3.";
    vi.mocked(getDraftAction).mockResolvedValue({
      ok: true,
      draft: makeUpdatedDraft(),
    });
    const { result } = renderHook(() =>
      useDraftLessonEditor({ initialDraft: makeDraft() }),
    );
    await act(async () => {
      await result.current.notifyRevisionConflict(conflictMessage);
    });
    expect(result.current.revisionConflict).toBe(true);
    expect(result.current.revisionConflictMessage).toBe(conflictMessage);
    expect(getDraftAction).toHaveBeenCalledWith("draft-1");
    expect(result.current.lesson.lesson_title).toBe("Updated title");
  });

  it("tracks the draft lifecycle status alongside the revision", () => {
    const { result } = renderHook(() =>
      useDraftLessonEditor({
        initialDraft: makeDraft({ status: "in_review" }),
      }),
    );
    expect(result.current.status).toBe("in_review");
    expect(result.current.revision).toBe(3);
  });

  it("updates the tracked status when refreshing from the server", async () => {
    vi.mocked(getDraftAction).mockResolvedValue({
      ok: true,
      draft: { ...makeDraft({ status: "in_review" }), revision: 4 },
    });
    const { result } = renderHook(() =>
      useDraftLessonEditor({ initialDraft: makeDraft() }),
    );
    await act(async () => {
      await result.current.refreshFromServer();
    });
    expect(result.current.status).toBe("in_review");
    expect(result.current.revision).toBe(4);
  });

  it("applies the status from a settings save", () => {
    const { result } = renderHook(() =>
      useDraftLessonEditor({ initialDraft: makeDraft() }),
    );
    act(() => {
      result.current.applySettingsSave(
        makeDraft({ status: "in_review", revision: 4 }),
      );
    });
    expect(result.current.status).toBe("in_review");
    expect(result.current.revision).toBe(4);
  });
});
