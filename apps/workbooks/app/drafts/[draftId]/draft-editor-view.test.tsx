// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { workbooks } from "@reading-advantage/domain";
import type { WorkbookSession } from "../../lib/session";
import { DraftEditorView } from "./draft-editor-view";

vi.mock("./use-draft-lesson-editor", () => ({
  useDraftLessonEditor: vi.fn(),
}));

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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useDraftLessonEditor).mockReturnValue({
    lesson: {
      lesson_title: "The Library Map",
      cefr_level: "A2",
      article_paragraphs: [{ number: 1, text: "The map shows the library." }],
      comprehension_questions: [],
    },
    loading: false,
    saving: false,
    errors: {},
    saveSuccess: false,
    revisionConflict: false,
    revisionConflictMessage: undefined,
    setLessonField: vi.fn(),
    validateAndSave: vi.fn(),
    refreshFromServer: vi.fn(),
  });
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

  it("opens the live preview modal from the Preview button", () => {
    render(<DraftEditorView session={adminSession} draft={makeDraft()} />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByRole("dialog", { name: "Lesson Preview" })).toBeTruthy();
    expect(
      screen.getByText("Live preview arrives with compile wiring (S4c)."),
    ).toBeTruthy();
  });

  it("closes the live preview modal from the close button", () => {
    render(<DraftEditorView session={adminSession} draft={makeDraft()} />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
    expect(
      screen.queryByText("Live preview arrives with compile wiring (S4c)."),
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
