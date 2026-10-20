// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  teachLessonAgainAction: vi.fn(),
  refresh: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/actions/class-books", () => ({
  teachLessonAgainAction: mocks.teachLessonAgainAction,
  markLessonTaughtAction: vi.fn(),
  markStepDoneAction: vi.fn(),
  setCurrentLessonAction: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));

import { LessonActions } from "../class-book-pacing-controls";

const CB = "cbcbcbcb-0000-4000-8000-000000000001";
const en = testMessages.en.TeacherUi.classBook;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.teachLessonAgainAction.mockResolvedValue({ success: true });
});
afterEach(cleanup);

describe("LessonActions Teach again (S3)", () => {
  it("shows Teach again only when the lesson has a run to repeat", () => {
    renderWithMessages(<LessonActions classBookId={CB} lessonNumber={3} current={false} taught={false} canTeachAgain={false} />);
    expect(screen.queryByRole("button", { name: en.teachAgain })).not.toBeInTheDocument();
    cleanup();
    renderWithMessages(<LessonActions classBookId={CB} lessonNumber={3} current={false} taught canTeachAgain />);
    expect(screen.getByRole("button", { name: en.teachAgain })).toBeInTheDocument();
  });

  it("opens the dialog with the lesson number and does not call the action before the confirm", () => {
    renderWithMessages(<LessonActions classBookId={CB} lessonNumber={3} current taught canTeachAgain />);
    fireEvent.click(screen.getByRole("button", { name: en.teachAgain }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("Teach lesson 3 again?");
    expect(dialog).toHaveTextContent(en.teachAgainBody2);
    expect(mocks.teachLessonAgainAction).not.toHaveBeenCalled();
  });

  it("closes the dialog on Cancel and saves nothing", () => {
    renderWithMessages(<LessonActions classBookId={CB} lessonNumber={3} current taught canTeachAgain />);
    fireEvent.click(screen.getByRole("button", { name: en.teachAgain }));
    fireEvent.click(screen.getByRole("button", { name: en.teachAgainCancel }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mocks.teachLessonAgainAction).not.toHaveBeenCalled();
  });

  it("calls the action after the confirm, closes the dialog, and refreshes the page", async () => {
    renderWithMessages(<LessonActions classBookId={CB} lessonNumber={3} current taught canTeachAgain />);
    fireEvent.click(screen.getByRole("button", { name: en.teachAgain }));
    const confirm = screen.getAllByRole("button", { name: en.teachAgain }).at(-1)!;
    fireEvent.click(confirm);
    await waitFor(() => expect(mocks.teachLessonAgainAction).toHaveBeenCalledWith(CB, 3));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("shows the error toast and keeps the page when the action fails", async () => {
    mocks.teachLessonAgainAction.mockResolvedValue({ success: false, error: "FORBIDDEN" });
    renderWithMessages(<LessonActions classBookId={CB} lessonNumber={3} current taught canTeachAgain />);
    fireEvent.click(screen.getByRole("button", { name: en.teachAgain }));
    fireEvent.click(screen.getAllByRole("button", { name: en.teachAgain }).at(-1)!);
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(en.actionError));
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
