// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { workbooks } from "@reading-advantage/domain";
import type { WorkbookSession } from "../../lib/session";
import { DraftEditorView } from "./draft-editor-view";

vi.mock("./use-draft-lesson-editor", () => ({
  useDraftLessonEditor: vi.fn(),
}));

vi.mock("./actions", () => ({
  previewDraftAction: vi.fn(),
  updateDraftSettingsAction: vi.fn(),
  submitDraftForReviewAction: vi.fn(),
  returnDraftToDraftAction: vi.fn(),
}));

vi.mock("../actions", () => ({
  publishDraftAction: vi.fn(),
}));

vi.mock("../../../components/lesson-editor/LessonPreview", () => ({
  LessonPreview: ({ htmlContent }: { htmlContent: string }) => (
    <div data-testid="lesson-preview">{htmlContent}</div>
  ),
}));

import {
  previewDraftAction,
  returnDraftToDraftAction,
  submitDraftForReviewAction,
  updateDraftSettingsAction,
} from "./actions";
import { publishDraftAction } from "../actions";
import { useDraftLessonEditor } from "./use-draft-lesson-editor";

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

function makeDraft(
  overrides: Partial<workbooks.WorkbookDraft> = {},
): workbooks.WorkbookDraft {
  const content = {
    title: "The Library Map",
    cefrLevel: "A2",
    paragraphs: [{ order: 0, text: "The map shows the library." }],
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
    draftId: "draft-1",
    tenantId: "tenant-1",
    status: "draft",
    sourceRecord: record,
    revision: 2,
    createdBy: "actor-1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z",
    ...overrides,
  };
}

function makeHookReturn(
  overrides: Partial<ReturnType<typeof useDraftLessonEditor>> = {},
): ReturnType<typeof useDraftLessonEditor> {
  const errors: Record<string, string> = {};
  const conflict = {
    flag: false,
    message: undefined as string | undefined,
  };
  const refreshFromServer = vi.fn(async () => {});
  return {
    lesson: {
      lesson_title: "The Library Map",
      cefr_level: "A2",
      article_paragraphs: [{ number: 1, text: "The map shows the library." }],
      comprehension_questions: [],
    },
    loading: false,
    saving: false,
    errors,
    saveSuccess: false,
    get revisionConflict() {
      return conflict.flag;
    },
    get revisionConflictMessage() {
      return conflict.message;
    },
    settings: undefined,
    status: "draft",
    revision: 2,
    setLessonField: vi.fn(),
    setFormError: vi.fn((message: string) => {
      errors._form = message;
    }),
    applySettingsSave: vi.fn(),
    validateAndSave: vi.fn(),
    refreshFromServer,
    serverContentAvailable: false,
    applyServerLesson: vi.fn(),
    notifyRevisionConflict: vi.fn(async (message: string) => {
      conflict.flag = true;
      conflict.message = message;
      await refreshFromServer();
    }),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useDraftLessonEditor).mockReturnValue(makeHookReturn());
});

describe("DraftEditorView / authorization", () => {
  it("requests sign-in without a session", () => {
    render(<DraftEditorView session={null} draft={null} />);
    expect(screen.getByText(/Sign-in is required/)).toBeTruthy();
    expect(useDraftLessonEditor).not.toHaveBeenCalled();
  });

  it("denies access for a non-WORKBOOK_ADMIN session", () => {
    render(
      <DraftEditorView session={otherRoleSession} draft={makeDraft()} />,
    );
    expect(screen.getByText(/Access denied/)).toBeTruthy();
    expect(screen.queryByText("The Library Map")).toBeNull();
    expect(useDraftLessonEditor).not.toHaveBeenCalled();
  });

  it("does not leak draft data to an unauthorized session", () => {
    render(
      <DraftEditorView session={otherRoleSession} draft={makeDraft()} />,
    );
    expect(screen.queryByText("The Library Map")).toBeNull();
  });
});

describe("DraftEditorView / states", () => {
  it("shows a missing-draft message without mounting the editor", () => {
    render(<DraftEditorView session={adminSession} draft={null} />);
    expect(screen.getByText("Draft not found.")).toBeTruthy();
    expect(useDraftLessonEditor).not.toHaveBeenCalled();
  });

  it("shows a read-only notice for a released draft", () => {
    render(
      <DraftEditorView
        session={adminSession}
        draft={makeDraft({ status: "published" })}
      />,
    );
    expect(
      screen.getByText(/cannot be edited/),
    ).toBeTruthy();
    expect(useDraftLessonEditor).not.toHaveBeenCalled();
  });

  it("renders the per-section editor for an editable draft", () => {
    render(<DraftEditorView session={adminSession} draft={makeDraft()} />);
    expect(useDraftLessonEditor).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Basic Information")).toBeTruthy();
    expect(screen.getByText("Article")).toBeTruthy();
    expect(screen.getByText("Vocabulary")).toBeTruthy();
    expect(screen.getByText("Pedagogical Connectors")).toBeTruthy();
    expect(screen.getByText("Comprehension Questions")).toBeTruthy();
    expect(screen.getAllByText("Writing Prompt").length).toBeGreaterThan(0);
    expect(screen.getByText("Lesson Reflection")).toBeTruthy();
    expect(screen.getByText("Save Changes")).toBeTruthy();
  });

  it("renders the hook-tracked revision in the header", () => {
    vi.mocked(useDraftLessonEditor).mockReturnValue(
      makeHookReturn({ revision: 7 }),
    );
    render(<DraftEditorView session={adminSession} draft={makeDraft()} />);
    expect(screen.getByText(/revision 7/)).toBeTruthy();
  });

  it("labels the preview button as showing the last saved content", () => {
    render(<DraftEditorView session={adminSession} draft={makeDraft()} />);
    expect(
      screen.getByRole("button", { name: "Preview" }).getAttribute("title"),
    ).toBe("Previews the last saved content");
  });

  it("opens the live preview modal with the rendered html", async () => {
    vi.mocked(previewDraftAction).mockResolvedValue({
      ok: true,
      html: "<h1>The Library Map</h1>",
    });
    render(<DraftEditorView session={adminSession} draft={makeDraft()} />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Lesson Preview" })).toBeTruthy();
    });
    expect(screen.getByTestId("lesson-preview").textContent).toContain(
      "The Library Map",
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a Rendering state while the preview is being rendered", () => {
    vi.mocked(previewDraftAction).mockReturnValue(new Promise(() => {}));
    render(<DraftEditorView session={adminSession} draft={makeDraft()} />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByRole("button", { name: "Rendering..." })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Lesson Preview" })).toBeNull();
  });

  it("surfaces a preview failure as a form error and does not open the modal", async () => {
    vi.mocked(previewDraftAction).mockResolvedValue({
      ok: false,
      code: "NOT_FOUND",
      message: "draft not found",
    });
    render(<DraftEditorView session={adminSession} draft={makeDraft()} />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
    expect(screen.getByText("draft not found")).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Lesson Preview" })).toBeNull();
  });

  it("closes the live preview modal from the close button", async () => {
    vi.mocked(previewDraftAction).mockResolvedValue({
      ok: true,
      html: "<p>preview</p>",
    });
    render(<DraftEditorView session={adminSession} draft={makeDraft()} />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Lesson Preview" })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
    expect(
      screen.queryByRole("dialog", { name: "Lesson Preview" }),
    ).toBeNull();
  });

  it("renders the deferred-sections note", () => {
    render(<DraftEditorView session={adminSession} draft={makeDraft()} />);
    const note = screen.getByRole("note").textContent ?? "";
    expect(note).toContain("Deferred in this phase");
    expect(note).toContain("sentence-order questions");
    expect(note).toContain("sentence-completion prompts");
  });

  it("does not render sentence-practice fields without a source UI section", () => {
    render(<DraftEditorView session={adminSession} draft={makeDraft()} />);
    expect(screen.queryByLabelText(/Sentence Order/i)).toBeNull();
    expect(screen.queryByLabelText(/Sentence Completion/i)).toBeNull();
  });
});

describe("DraftEditorView / draft settings", () => {
  function makeDraftWithSettings(
    settings: workbooks.WorkbookDraftSettings,
  ): workbooks.WorkbookDraft {
    return makeDraft({
      sourceRecord: { ...makeDraft().sourceRecord, settings },
    });
  }

  it("opens the settings dialog with the draft's current settings", () => {
    const settings: workbooks.WorkbookDraftSettings = {
      seriesName: "Quest",
      levelNumber: "5",
      cefrLevel: "A1",
      type: "secondary",
    };
    vi.mocked(useDraftLessonEditor).mockReturnValue(
      makeHookReturn({ settings }),
    );
    render(
      <DraftEditorView
        session={adminSession}
        draft={makeDraftWithSettings(settings)}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(
      screen.getByRole("dialog", { name: "Project Settings" }),
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("Workbook Level") as HTMLSelectElement).value,
    ).toBe("5");
    expect(
      (screen.getByLabelText("Series Name") as HTMLInputElement).value,
    ).toBe("Quest");
  });

  it("saves the settings through the server action and closes the dialog on success", async () => {
    vi.mocked(updateDraftSettingsAction).mockResolvedValue({
      ok: true,
      draft: makeDraft({ revision: 3 }),
    });
    render(<DraftEditorView session={adminSession} draft={makeDraft()} />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(
      screen.getByRole("dialog", { name: "Project Settings" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Project Settings" }),
      ).toBeNull();
    });
  });

  it("surfaces a revision conflict by closing the dialog and showing the banner", async () => {
    const message =
      "Revision conflict: actual revision 4 does not match expected revision 2.";
    vi.mocked(updateDraftSettingsAction).mockResolvedValue({
      ok: false,
      code: "REVISION_CONFLICT",
      message,
      retryable: true,
    });
    const hookReturn = makeHookReturn();
    const notifyRevisionConflict = vi.mocked(hookReturn.notifyRevisionConflict);
    const refreshFromServer = vi.mocked(hookReturn.refreshFromServer);
    vi.mocked(useDraftLessonEditor).mockReturnValue(hookReturn);
    render(<DraftEditorView session={adminSession} draft={makeDraft()} />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Project Settings" }),
      ).toBeNull();
    });
    expect(screen.getByText(/Save conflict/)).toBeTruthy();
    expect(screen.getByText(/Revision conflict/)).toBeTruthy();
    expect(notifyRevisionConflict).toHaveBeenCalledWith(message);
    expect(refreshFromServer).toHaveBeenCalled();
  });

  it("surfaces other settings failures as a form error and keeps the dialog open", async () => {
    vi.mocked(updateDraftSettingsAction).mockResolvedValue({
      ok: false,
      code: "EDITION_IMMUTABLE",
      message: 'Cannot edit a draft in status "published".',
      retryable: false,
    });
    render(<DraftEditorView session={adminSession} draft={makeDraft()} />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
    expect(screen.getByText(/Cannot edit a draft/)).toBeTruthy();
    expect(
      screen.getByRole("dialog", { name: "Project Settings" }),
    ).toBeTruthy();
  });

  it("offers Reload content and applies the server lesson on user choice", async () => {
    const hookReturn = makeHookReturn({
      revisionConflict: true,
      serverContentAvailable: true,
    });
    const applyServerLesson = vi.mocked(hookReturn.applyServerLesson);
    vi.mocked(useDraftLessonEditor).mockReturnValue(hookReturn);
    render(<DraftEditorView session={adminSession} draft={makeDraft()} />);
    fireEvent.click(screen.getByRole("button", { name: "Reload content" }));
    expect(applyServerLesson).toHaveBeenCalled();
  });
});

describe("DraftEditorView / review workflow", () => {
  it("shows a Submit for review button for a draft in draft status", () => {
    render(<DraftEditorView session={adminSession} draft={makeDraft()} />);
    expect(
      screen.getByRole("button", { name: "Submit for review" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Return to draft" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Publish…" })).toBeNull();
  });

  it("shows Return to draft and Publish buttons for a draft in review", () => {
    vi.mocked(useDraftLessonEditor).mockReturnValue(
      makeHookReturn({ status: "in_review" }),
    );
    render(
      <DraftEditorView
        session={adminSession}
        draft={makeDraft({ status: "in_review" })}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Return to draft" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publish…" })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Submit for review" }),
    ).toBeNull();
  });

  it("shows neither action for a released draft", () => {
    render(
      <DraftEditorView
        session={adminSession}
        draft={makeDraft({ status: "published" })}
      />,
    );
    expect(screen.getByText(/cannot be edited/)).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Submit for review" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Return to draft" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Publish…" })).toBeNull();
  });

  it("submits the draft for review with the hook revision and refreshes on success", async () => {
    vi.mocked(submitDraftForReviewAction).mockResolvedValue({
      ok: true,
      draft: { ...makeDraft({ status: "in_review" }), revision: 3 },
    });
    const hookReturn = makeHookReturn();
    const refreshFromServer = vi.mocked(hookReturn.refreshFromServer);
    vi.mocked(useDraftLessonEditor).mockReturnValue(hookReturn);
    render(<DraftEditorView session={adminSession} draft={makeDraft()} />);
    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
    await waitFor(() => {
      expect(submitDraftForReviewAction).toHaveBeenCalledWith("draft-1", 2);
    });
    expect(refreshFromServer).toHaveBeenCalled();
  });

  it("notifies on a submit-for-review revision conflict", async () => {
    const message =
      "Revision conflict: actual revision 3 does not match expected revision 2.";
    vi.mocked(submitDraftForReviewAction).mockResolvedValue({
      ok: false,
      code: "REVISION_CONFLICT",
      message,
      retryable: true,
    });
    const hookReturn = makeHookReturn();
    const notifyRevisionConflict = vi.mocked(hookReturn.notifyRevisionConflict);
    vi.mocked(useDraftLessonEditor).mockReturnValue(hookReturn);
    render(<DraftEditorView session={adminSession} draft={makeDraft()} />);
    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
    await waitFor(() => {
      expect(notifyRevisionConflict).toHaveBeenCalledWith(message);
    });
  });

  it("surfaces a non-conflict submit failure as a form error", async () => {
    vi.mocked(submitDraftForReviewAction).mockResolvedValue({
      ok: false,
      code: "ILLEGAL_STATE_TRANSITION",
      message: 'Cannot transition workbook from "in_review" to "in_review".',
      retryable: false,
    });
    const hookReturn = makeHookReturn();
    const notifyRevisionConflict = vi.mocked(hookReturn.notifyRevisionConflict);
    vi.mocked(useDraftLessonEditor).mockReturnValue(hookReturn);
    render(<DraftEditorView session={adminSession} draft={makeDraft()} />);
    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
    expect(
      screen.getByText(/Cannot transition workbook/),
    ).toBeTruthy();
    expect(notifyRevisionConflict).not.toHaveBeenCalled();
  });

  it("returns an in-review draft to draft status and refreshes on success", async () => {
    vi.mocked(returnDraftToDraftAction).mockResolvedValue({
      ok: true,
      draft: makeDraft({ revision: 3 }),
    });
    const hookReturn = makeHookReturn({ status: "in_review" });
    const refreshFromServer = vi.mocked(hookReturn.refreshFromServer);
    vi.mocked(useDraftLessonEditor).mockReturnValue(hookReturn);
    render(
      <DraftEditorView
        session={adminSession}
        draft={makeDraft({ status: "in_review" })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Return to draft" }));
    await waitFor(() => {
      expect(returnDraftToDraftAction).toHaveBeenCalledWith("draft-1", 2);
    });
    expect(refreshFromServer).toHaveBeenCalled();
  });

  it("opens the publish dialog with the immutability warning", () => {
    vi.mocked(useDraftLessonEditor).mockReturnValue(
      makeHookReturn({ status: "in_review" }),
    );
    render(
      <DraftEditorView
        session={adminSession}
        draft={makeDraft({ status: "in_review" })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Publish…" }));
    const dialog = screen.getByRole("dialog", { name: "Publish Edition" });
    expect(dialog.textContent).toContain("immutable");
    expect(dialog.textContent).toContain("cannot be edited");
    expect(dialog.textContent).toContain("new draft version");
  });

  it("publishes through the action with the hook revision and shows the edition version", async () => {
    vi.mocked(useDraftLessonEditor).mockReturnValue(
      makeHookReturn({ status: "in_review" }),
    );
    vi.mocked(publishDraftAction).mockResolvedValue({
      ok: true,
      editionId: "edition-1",
      version: 1,
    });
    render(
      <DraftEditorView
        session={adminSession}
        draft={makeDraft({ status: "in_review" })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Publish…" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Publish" }));
    await waitFor(() => {
      expect(publishDraftAction).toHaveBeenCalledWith("draft-1", 2);
    });
    await waitFor(() => {
      expect(screen.getByText(/edition v1/)).toBeTruthy();
    });
    expect(
      screen.queryByRole("dialog", { name: "Publish Edition" }),
    ).toBeNull();
  });

  it("does not publish when the dialog is cancelled", async () => {
    vi.mocked(useDraftLessonEditor).mockReturnValue(
      makeHookReturn({ status: "in_review" }),
    );
    render(
      <DraftEditorView
        session={adminSession}
        draft={makeDraft({ status: "in_review" })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Publish…" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(publishDraftAction).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "Publish Edition" }),
    ).toBeNull();
  });

  it("notifies on a publish revision conflict", async () => {
    const message =
      "Revision conflict: actual revision 3 does not match expected revision 2.";
    vi.mocked(publishDraftAction).mockResolvedValue({
      ok: false,
      code: "REVISION_CONFLICT",
      message,
    });
    const hookReturn = makeHookReturn({ status: "in_review" });
    const notifyRevisionConflict = vi.mocked(hookReturn.notifyRevisionConflict);
    vi.mocked(useDraftLessonEditor).mockReturnValue(hookReturn);
    render(
      <DraftEditorView
        session={adminSession}
        draft={makeDraft({ status: "in_review" })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Publish…" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Publish" }));
    await waitFor(() => {
      expect(notifyRevisionConflict).toHaveBeenCalledWith(message);
    });
    expect(
      screen.queryByRole("dialog", { name: "Publish Edition" }),
    ).toBeNull();
  });

  it("renders a structured publish failure inside the dialog", async () => {
    vi.mocked(useDraftLessonEditor).mockReturnValue(
      makeHookReturn({ status: "in_review" }),
    );
    vi.mocked(publishDraftAction).mockResolvedValue({
      ok: false,
      code: "ILLEGAL_STATE_TRANSITION",
      message: 'Cannot transition workbook from "draft" to "published".',
    });
    render(
      <DraftEditorView
        session={adminSession}
        draft={makeDraft({ status: "in_review" })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Publish…" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Publish" }));
    await waitFor(() => {
      expect(screen.getByText(/Cannot transition workbook/)).toBeTruthy();
    });
    expect(
      screen.getByRole("dialog", { name: "Publish Edition" }),
    ).toBeTruthy();
  });
});
