// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { workbooks } from "@reading-advantage/domain";
import { TeacherManualSection } from "./teacher-manual-section";

vi.mock("../teacher-manual-actions", () => ({
  compileTeacherManualAction: vi.fn(),
}));

import { compileTeacherManualAction } from "../teacher-manual-actions";

function makeDraft(
  draftId: string,
  title: string,
): workbooks.WorkbookDraft {
  const content = {
    title,
    cefrLevel: "A2",
    paragraphs: [{ order: 0, text: "paragraph" }],
    questions: [],
    assets: [],
  };
  const record: workbooks.WorkbookSourceRecord = {
    identity: {
      sourceApp: "reading-advantage",
      sourceId: `src-${draftId}`,
      sourceRevision: "rev-1",
      contentHash: workbooks.computeWorkbookDigest(content),
    },
    content,
  };
  return {
    draftId,
    tenantId: "tenant-1",
    status: "draft",
    sourceRecord: record,
    revision: 3,
    createdBy: "actor-1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z",
  };
}

const drafts = [
  makeDraft("draft-1", "Lesson One"),
  makeDraft("draft-2", "Lesson Two"),
];

function teacherManualButton(): HTMLElement {
  return screen.getByRole("button", { name: /Teacher Manual/ });
}

describe("TeacherManualSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(compileTeacherManualAction).mockResolvedValue({
      ok: true,
      html: "<p>compiled manual</p>",
      lessonCount: 2,
      lang: "en",
    });
  });

  it("renders a labeled checkbox per draft and a disabled action at zero selected", () => {
    render(<TeacherManualSection drafts={drafts} />);

    expect(screen.getByRole("group", { name: "Teacher Manual" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Lesson One" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Lesson Two" })).toBeTruthy();
    expect((teacherManualButton() as HTMLButtonElement).disabled).toBe(true);
    expect(teacherManualButton().textContent).toContain("0 selected");
  });

  it("excludes the draft id from the checkbox accessible name while keeping it visible", () => {
    render(<TeacherManualSection drafts={drafts} />);

    expect(screen.getByRole("checkbox", { name: "Lesson One" })).toBeTruthy();
    expect(
      screen.queryByRole("checkbox", { name: "Lesson One (draft-1)" }),
    ).toBeNull();
    expect(screen.getByText(/\(draft-1\)/)).toBeTruthy();
  });

  it("toggles selection and enables the action once at least one draft is selected", () => {
    render(<TeacherManualSection drafts={drafts} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Lesson One" }));
    expect((teacherManualButton() as HTMLButtonElement).disabled).toBe(false);
    expect(teacherManualButton().textContent).toContain("1 selected");

    fireEvent.click(screen.getByRole("checkbox", { name: "Lesson One" }));
    expect((teacherManualButton() as HTMLButtonElement).disabled).toBe(true);
    expect(teacherManualButton().textContent).toContain("0 selected");

    fireEvent.click(screen.getByRole("checkbox", { name: "Lesson One" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Lesson Two" }));
    expect(teacherManualButton().textContent).toContain("2 selected");
  });

  it("shows the compiling state while the manual is being compiled", async () => {
    vi.mocked(compileTeacherManualAction).mockImplementation(
      () => new Promise(() => {}),
    );
    render(<TeacherManualSection drafts={drafts} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Lesson One" }));
    fireEvent.click(teacherManualButton());

    expect(screen.getByText("Compiling teacher manual…")).toBeTruthy();
    expect(compileTeacherManualAction).toHaveBeenCalledWith(
      ["draft-1"],
      "en",
    );
  });

  it("announces the compiling state through a status region", () => {
    vi.mocked(compileTeacherManualAction).mockImplementation(
      () => new Promise(() => {}),
    );
    render(<TeacherManualSection drafts={drafts} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Lesson One" }));
    fireEvent.click(teacherManualButton());

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Compiling teacher manual…");
  });

  it("shows the error state with a retry that re-invokes the action", async () => {
    vi.mocked(compileTeacherManualAction)
      .mockResolvedValueOnce({
        ok: false,
        code: "NOT_FOUND",
        message: "one or more selected drafts are unavailable",
      })
      .mockResolvedValueOnce({
        ok: true,
        html: "<p>compiled manual</p>",
        lessonCount: 1,
        lang: "en",
      });
    render(<TeacherManualSection drafts={drafts} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Lesson One" }));
    fireEvent.click(teacherManualButton());

    await waitFor(() => {
      expect(
        screen.getByText("one or more selected drafts are unavailable"),
      ).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(
        screen.getByTitle("Teacher Manual").getAttribute("srcdoc"),
      ).toBe("<p>compiled manual</p>");
    });
    expect(compileTeacherManualAction).toHaveBeenCalledTimes(2);
  });

  it("renders the compiled manual in a sandboxed iframe with lesson count and print instructions", async () => {
    render(<TeacherManualSection drafts={drafts} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Lesson One" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Lesson Two" }));
    fireEvent.click(teacherManualButton());

    await waitFor(() => {
      expect(screen.getByText("2 lessons")).toBeTruthy();
    });

    const iframe = screen.getByTitle("Teacher Manual");
    expect(iframe.getAttribute("srcdoc")).toBe("<p>compiled manual</p>");
    expect(iframe.getAttribute("sandbox")).not.toContain("allow-same-origin");
    expect(iframe.getAttribute("sandbox")).toContain("allow-scripts");

    expect(screen.getByRole("button", { name: "Print" })).toBeTruthy();
    expect(screen.getByText(/Background graphics/)).toBeTruthy();
    expect(screen.getByText(/margins to Default or None/)).toBeTruthy();
  });

  it("announces the compiled lesson count through a status region", async () => {
    render(<TeacherManualSection drafts={drafts} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Lesson One" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Lesson Two" }));
    fireEvent.click(teacherManualButton());

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain("2 lessons");
    });
  });

  it("re-invokes the action with the Thai language when the language toggle changes", async () => {
    vi.mocked(compileTeacherManualAction).mockResolvedValue({
      ok: true,
      html: "<p>compiled manual</p>",
      lessonCount: 1,
      lang: "en",
    });
    render(<TeacherManualSection drafts={drafts} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Lesson One" }));
    fireEvent.click(teacherManualButton());

    await waitFor(() => {
      expect(screen.getByText("1 lesson")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Thai" }));

    await waitFor(() => {
      expect(compileTeacherManualAction).toHaveBeenLastCalledWith(
        ["draft-1"],
        "th",
      );
    });
    await waitFor(() => {
      expect(screen.getByText("1 lesson")).toBeTruthy();
    });
  });
});
