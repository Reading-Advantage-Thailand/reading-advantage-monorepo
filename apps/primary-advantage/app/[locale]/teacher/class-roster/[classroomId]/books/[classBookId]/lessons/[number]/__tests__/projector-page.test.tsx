// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, type TestLocale } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  user: { id: "t1", role: "TEACHER", schoolId: "school-1" } as Record<string, unknown> | null,
  getTeacherLesson: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-books", () => ({ getTeacherLesson: mocks.getTeacherLesson, getLessonGuide: vi.fn() }));
vi.mock("@/actions/class-books", () => ({ markStepDoneAction: vi.fn() }));
vi.mock("@/components/teacher/projector-game-panel", () => ({
  ProjectorGamePanel: (props: { articleId: string; classBookId: string; lessonNumber: number }) => <div data-testid="game-panel" data-article={props.articleId} data-book={props.classBookId} data-lesson={props.lessonNumber} />,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getLocale: async () => "en",
    getTranslations: async (namespace?: string) => createTranslator({ locale: "en" as TestLocale, messages: messages.en, namespace: namespace as never }),
  };
});
vi.mock("@/i18n/navigation", () => ({
  redirect: vi.fn(),
  useRouter: () => ({ refresh: vi.fn() }),
  Link: ({ children, href }: { children?: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

import ProjectorPage from "../projector/page";

const C1 = "c1c1c1c1-0000-4000-8000-000000000001";
const CB = "cbcbcbcb-0000-4000-8000-000000000001";
const lesson = {
  classBook: { id: CB, classroomId: C1, bookId: "b1", bookKey: "o3-2", bookName: "Origins 3.2", lessonCount: 14, mode: "teacher_led", startDate: null, currentLesson: 2, taughtCount: 0 },
  lesson: { number: 2, title: "Hello Class", key: "o3-2/2", articleId: "a2", approved: true },
  article: { title: "Hello Class", paragraphs: ["Para one."] },
  glossary: [],
  bank: { mcq: [], saq: [], laq: [] },
  activities: null,
  summary: null,
  thaiSummary: null,
  stepsDone: [],
};
const render = async () => renderWithMessages((await ProjectorPage({ params: Promise.resolve({ classroomId: C1, classBookId: CB, number: "2" }) })) as React.ReactElement, { locale: "en" });

beforeEach(() => {
  mocks.getTeacherLesson.mockResolvedValue(lesson);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("projector page", () => {
  it("renders the game panel for the class book lesson", async () => {
    await render();
    const panel = screen.getByTestId("game-panel");
    expect(panel).toHaveAttribute("data-article", "a2");
    expect(panel).toHaveAttribute("data-book", CB);
    expect(panel).toHaveAttribute("data-lesson", "2");
  });

  it("renders no panel for a lesson with no article", async () => {
    mocks.getTeacherLesson.mockResolvedValue({ ...lesson, lesson: { ...lesson.lesson, articleId: null }, article: null });
    await render();
    expect(screen.queryByTestId("game-panel")).not.toBeInTheDocument();
  });

  it("refuses a teacher who does not manage the class book", async () => {
    mocks.getTeacherLesson.mockRejectedValue(new Error("FORBIDDEN"));
    await expect(render()).rejects.toThrow("NOT_FOUND");
    expect(screen.queryByTestId("game-panel")).not.toBeInTheDocument();
  });
});
