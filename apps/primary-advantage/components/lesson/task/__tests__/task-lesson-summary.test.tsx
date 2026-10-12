// @vitest-environment jsdom
/** Lesson summary (task 14): the "Start again" button, its confirm dialog, and the attempt text (STU, S2). */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages, withMessages } from "@/components/__tests__/helpers/render-with-messages";
import { StudentViewProvider } from "@/components/student/student-view-provider";

const mocks = vi.hoisted(() => ({
  restart: vi.fn(),
  push: vi.fn(),
  toastInfo: vi.fn(),
}));
vi.mock("@/actions/lesson-attempts", () => ({ restartLessonAction: (...a: unknown[]) => mocks.restart(...a) }));
vi.mock("@/actions/article", () => ({
  getLessonSummaryData: vi.fn().mockResolvedValue({ data: { totalXp: 50, quizScores: { mcqScore: 3, saqScore: 4 } } }),
}));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@reading-advantage/auth-client", () => ({ useAuth: () => ({ user: { id: "s1" }, refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: (...a: unknown[]) => mocks.toastInfo(...a) } }));

import TaskLessonSummary from "../task-lesson-summary";

const s = testMessages.en.Lesson.Summary;
const ARTICLE = { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", sentencsAndWordsForFlashcard: [] } as never;
const ASSIGNMENT = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

function renderSummary(props: { attemptNumber?: number; onRestarted?: (n: number | null) => void; mode?: "student" | "preview" } = {}) {
  return renderWithMessages(
    withMessages(
      <StudentViewProvider mode={props.mode ?? "student"}>
        <TaskLessonSummary article={ARTICLE} timerSpent={60} assignmentId={ASSIGNMENT} attemptNumber={props.attemptNumber} onRestarted={props.onRestarted} />
      </StudentViewProvider>,
      "en",
    ),
  );
}

beforeEach(() => {
  mocks.restart.mockReset();
  mocks.push.mockReset();
  mocks.toastInfo.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(cleanup);

describe("TaskLessonSummary restart", () => {
  it("shows Back to Read Page and Start again, and no dialog", async () => {
    renderSummary();
    expect(await screen.findByRole("button", { name: s.actions.backToRead })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: s.actions.startAgain })).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("opens the confirm dialog with Cancel first and calls nothing on Cancel", async () => {
    renderSummary();
    fireEvent.click(await screen.findByRole("button", { name: s.actions.startAgain }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(s.restart.title)).toBeInTheDocument();
    expect(within(dialog).getByText(s.restart.body1)).toBeInTheDocument();
    expect(within(dialog).getByText(s.restart.body2)).toBeInTheDocument();
    const buttons = within(dialog).getAllByRole("button");
    expect(buttons[0]).toHaveTextContent(s.restart.cancel);
    fireEvent.click(buttons[0]);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(mocks.restart).not.toHaveBeenCalled();
  });

  it("calls the action after the confirm and reports the new attempt", async () => {
    mocks.restart.mockResolvedValue({ success: true, closed: true, attemptNumber: 2 });
    const onRestarted = vi.fn();
    renderSummary({ onRestarted });
    fireEvent.click(await screen.findByRole("button", { name: s.actions.startAgain }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: s.actions.startAgain }));
    await waitFor(() => expect(onRestarted).toHaveBeenCalledWith(2));
    expect(mocks.restart).toHaveBeenCalledWith({ articleId: (ARTICLE as { id: string }).id, assignmentId: ASSIGNMENT });
  });

  it("disables both buttons and shows Restarting while the action runs", async () => {
    let finish: (v: unknown) => void = () => {};
    mocks.restart.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderSummary();
    fireEvent.click(await screen.findByRole("button", { name: s.actions.startAgain }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: s.actions.startAgain }));
    await waitFor(() => expect(screen.getAllByRole("button", { name: s.actions.restarting }).length).toBe(2));
    for (const button of screen.getAllByRole("button", { name: s.actions.restarting })) expect(button).toBeDisabled();
    expect(screen.getByRole("button", { name: s.actions.backToRead })).toBeDisabled();
    finish({ success: true, closed: true, attemptNumber: 2 });
  });

  it("shows an alert and stays on the summary when the action fails", async () => {
    mocks.restart.mockResolvedValue({ success: false, error: "Failed" });
    const onRestarted = vi.fn();
    renderSummary({ onRestarted });
    fireEvent.click(await screen.findByRole("button", { name: s.actions.startAgain }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: s.actions.startAgain }));
    expect(await screen.findByRole("alert")).toHaveTextContent(s.restart.error);
    expect(onRestarted).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: s.actions.startAgain })).toBeEnabled();
  });

  it("shows Attempt 2 and the history note from attempt 2, and neither for attempt 1", async () => {
    const view = renderSummary({ attemptNumber: 2 });
    expect(await screen.findByText("Attempt 2")).toBeInTheDocument();
    expect(screen.getByText(s.historyNote)).toBeInTheDocument();
    view.unmount();
    renderSummary({ attemptNumber: 1 });
    await screen.findByRole("button", { name: s.actions.startAgain });
    expect(screen.queryByText(/Attempt \d/)).toBeNull();
    expect(screen.queryByText(s.historyNote)).toBeNull();
  });

  it("saves nothing in preview mode and shows the preview note", async () => {
    renderSummary({ mode: "preview" });
    expect(await screen.findByText(s.previewNote)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: s.actions.startAgain }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(mocks.restart).not.toHaveBeenCalled();
    expect(mocks.toastInfo).toHaveBeenCalledTimes(1);
  });
});
