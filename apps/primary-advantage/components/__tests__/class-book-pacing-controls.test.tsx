// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WORKBOOK_STEPS } from "@reading-advantage/domain/primary-books/step-map";
import { renderWithMessages, testMessages } from "./helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  toastError: vi.fn(),
  setCurrentLessonAction: vi.fn(),
  markLessonTaughtAction: vi.fn(),
  markStepDoneAction: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));
vi.mock("@/actions/class-books", () => ({
  setCurrentLessonAction: mocks.setCurrentLessonAction,
  markLessonTaughtAction: mocks.markLessonTaughtAction,
  markStepDoneAction: mocks.markStepDoneAction,
}));

import { LessonActions, StepChecklist } from "@/components/teacher/class-book-pacing-controls";

const CB = "cbcbcbcb-0000-4000-8000-000000000001";
const en = testMessages.en.TeacherUi.classBook;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.setCurrentLessonAction.mockResolvedValue({ success: true });
  mocks.markLessonTaughtAction.mockResolvedValue({ success: true });
  mocks.markStepDoneAction.mockResolvedValue({ success: true });
});
afterEach(cleanup);

describe("StepChecklist", () => {
  it("marks a step done, or undone when it is pressed, and refreshes the page", async () => {
    renderWithMessages(<StepChecklist classBookId={CB} lessonNumber={3} steps={WORKBOOK_STEPS} stepsDone={[1, 2]} />);
    fireEvent.click(screen.getByRole("button", { name: /Step 3: Read the Article/ }));
    await waitFor(() => expect(mocks.markStepDoneAction).toHaveBeenCalledWith(CB, 3, 3, true));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: /Step 2: Key Vocabulary/ }));
    await waitFor(() => expect(mocks.markStepDoneAction).toHaveBeenCalledWith(CB, 3, 2, false));
  });

  it("shows the error and keeps the page when the change fails", async () => {
    mocks.markStepDoneAction.mockResolvedValueOnce({ success: false, error: "FORBIDDEN" });
    renderWithMessages(<StepChecklist classBookId={CB} lessonNumber={3} steps={WORKBOOK_STEPS} stepsDone={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Step 1: Before You Read/ }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(en.actionError));
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});

describe("LessonActions", () => {
  it("moves the pointer and marks the lesson taught", async () => {
    renderWithMessages(<LessonActions classBookId={CB} lessonNumber={5} current={false} taught={false} />);
    fireEvent.click(screen.getByRole("button", { name: en.setCurrent }));
    await waitFor(() => expect(mocks.setCurrentLessonAction).toHaveBeenCalledWith(CB, 5));
    fireEvent.click(screen.getByRole("button", { name: en.markTaught }));
    await waitFor(() => expect(mocks.markLessonTaughtAction).toHaveBeenCalledWith(CB, 5));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(2));
  });

  it("hides the action that does not apply", () => {
    renderWithMessages(<LessonActions classBookId={CB} lessonNumber={3} current taught />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
