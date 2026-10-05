// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithMessages, testMessages } from "./helpers/render-with-messages";

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), markStepDoneAction: vi.fn(), toastError: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
  Link: ({ children, href }: { children?: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));
vi.mock("@/actions/class-books", () => ({ markStepDoneAction: mocks.markStepDoneAction, setCurrentLessonAction: vi.fn(), markLessonTaughtAction: vi.fn() }));

import { GuideOverlay } from "@/components/teacher/guide-overlay";

const en = testMessages.en.TeacherUi.classBook;
const step = (n: number, period: number, title: string) => ({ step: n, title, period, teacherActions: [`Do ${n}`], teacherLanguage: [`"Say ${n}"`], studentActions: [], watchFor: [`Watch ${n}`], scriptMd: null });
const steps = [step(1, 1, "Before You Read"), step(2, 1, "Key Vocabulary"), step(3, 1, "Read the Article")];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.markStepDoneAction.mockResolvedValue({ success: true });
});
afterEach(cleanup);

describe("GuideOverlay (FR-9)", () => {
  it("opens on the first step the class has not done, moves with previous and next, and marks a step done", async () => {
    renderWithMessages(<GuideOverlay classBookId="cb" lessonNumber={2} steps={steps} stepsDone={[1]} />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Step 2: Key Vocabulary");
    expect(screen.getByText("Step 2 of 3 · Period 1")).toBeInTheDocument();
    expect(screen.getByText(/Watch 2/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: en.lesson.previous }));
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Step 1: Before You Read");
    expect(screen.getByRole("button", { name: en.guide.undo })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: en.guide.games })).toHaveAttribute("href", "/teacher/game-challenges");
    fireEvent.click(screen.getByRole("button", { name: en.lesson.next }));
    fireEvent.click(screen.getByRole("button", { name: en.guide.markDone }));
    await waitFor(() => expect(mocks.markStepDoneAction).toHaveBeenCalledWith("cb", 2, 2, true));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  });

  it("says when every step is done and lands on the last step", () => {
    renderWithMessages(<GuideOverlay classBookId="cb" lessonNumber={2} steps={steps} stepsDone={[1, 2, 3]} />);
    expect(screen.getByRole("status")).toHaveTextContent(en.guide.allDone);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Step 3: Read the Article");
    expect(screen.getByRole("button", { name: en.lesson.next })).toBeDisabled();
  });

  it("renders nothing without steps", () => {
    const { container } = renderWithMessages(<GuideOverlay classBookId="cb" lessonNumber={2} steps={[]} stepsDone={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
