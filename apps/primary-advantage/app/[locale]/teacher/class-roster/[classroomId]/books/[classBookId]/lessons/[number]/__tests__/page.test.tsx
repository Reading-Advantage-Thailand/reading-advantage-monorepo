// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages, type TestLocale } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  locale: "en" as TestLocale,
  user: { id: "t1", username: "kru.ann", name: "Kru Ann", role: "TEACHER", schoolId: "school-1", xp: 0, level: 1, cefrLevel: null } as Record<string, unknown> | null,
  getTeacherLesson: vi.fn(),
  getLessonGuide: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user, getCurrentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-books", () => ({ getTeacherLesson: mocks.getTeacherLesson, getLessonGuide: mocks.getLessonGuide }));
vi.mock("@/actions/class-books", () => ({ markStepDoneAction: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getLocale: async () => mocks.locale,
    getTranslations: async (namespace?: string) => createTranslator({ locale: mocks.locale, messages: messages[mocks.locale], namespace: namespace as never }),
  };
});
vi.mock("@/i18n/navigation", () => ({
  redirect: mocks.redirect,
  useRouter: () => ({ refresh: vi.fn() }),
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import TeacherLessonPage from "../page";

const C1 = "c1c1c1c1-0000-4000-8000-000000000001";
const CB = "cbcbcbcb-0000-4000-8000-000000000001";
const HERE = `/teacher/class-roster/${C1}/books/${CB}/lessons/2`;
const step = (n: number, period: number, title: string) => ({ step: n, title, period, teacherActions: [`Do ${n}`], teacherLanguage: [`"Say ${n}"`], studentActions: [], watchFor: [`Watch ${n}`], scriptMd: n === 1 ? "# Step 1 script" : null });
const guide = [
  { period: 1, steps: [step(1, 1, "Before You Read"), step(2, 1, "Key Vocabulary"), step(3, 1, "Read the Article")] },
  { period: 3, steps: [step(9, 3, "Vocabulary Practice")] },
];
const lesson = {
  classBook: { id: CB, classroomId: C1, bookId: "b1", bookKey: "o3-2", bookName: "Primary Advantage Origins 3.2", lessonCount: 14, mode: "teacher_led", startDate: null, currentLesson: 2, taughtCount: 0 },
  lesson: { number: 2, title: "Hello Class", key: "o3-2/2", articleId: "a2", approved: true },
  article: { title: "Hello Class", paragraphs: ["Para one.", "Para two."] },
  glossary: [{ word: "hi", pos: "exclamation", definition: "A greeting.", thai: "สวัสดี" }],
  bank: {
    mcq: [{ id: "m1", question: "How old is May?", options: ["five", "seven"], answer: "seven", evidence: "I am seven." }],
    saq: [{ id: "s1", question: "Name?", answer: "Tom." }],
    laq: [{ id: "l1", question: "Write about you." }],
  },
  activities: { vocabFill: [{ sentence: "May is ___.", answer: "seven" }], sentenceOrder: ["A", "B"], writingPrompt: "Write about you.", writingFrames: ["My name is ___."] },
  summary: "May meets her class.",
  thaiSummary: "เมย์พบเพื่อนร่วมชั้น",
  stepsDone: [1, 2],
};

/**
 * Renders the lesson page through the real message tree.
 * @param locale The UI locale.
 */
async function renderPage(locale: TestLocale = "en") {
  mocks.locale = locale;
  renderWithMessages((await TeacherLessonPage({ params: Promise.resolve({ classroomId: C1, classBookId: CB, number: "2" }) })) as React.ReactElement, { locale });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getTeacherLesson.mockResolvedValue(lesson);
  mocks.getLessonGuide.mockResolvedValue(guide);
});
afterEach(cleanup);

describe("teacher lesson page (FR-8, FR-9, FR-12, FR-13)", () => {
  const en = testMessages.en.TeacherUi.classBook;

  it("shows the live guide on the first open step with the actions, the language, and a tip", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Lesson 2 · Hello Class");
    const live = screen.getByRole("region", { name: en.guide.live });
    expect(within(live).getByRole("heading", { level: 3 })).toHaveTextContent("Step 3: Read the Article");
    expect(within(live).getByText("Do 3")).toBeInTheDocument();
    expect(within(live).getByText('"Say 3"')).toBeInTheDocument();
    expect(within(live).getByText(/Watch 3/)).toBeInTheDocument();
    expect(within(live).getByRole("button", { name: en.guide.markDone })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("link", { name: en.lesson.projector })).toHaveAttribute("href", `${HERE}/projector`);
    expect(screen.getByRole("link", { name: en.lesson.rehearsal })).toHaveAttribute("href", `${HERE}/rehearsal`);
    expect(mocks.getLessonGuide).toHaveBeenCalledWith({ db: {}, locale: "en" });
    expect(mocks.getTeacherLesson).toHaveBeenCalledWith(expect.objectContaining({ classBookId: CB, number: 2 }));
  });

  it("lists the guide by period, marks the steps done, and links the games on the practice steps", async () => {
    await renderPage();
    const guideRegion = screen.getByRole("region", { name: en.guide.title });
    expect(within(guideRegion).getByRole("region", { name: "Period 1" })).toBeInTheDocument();
    expect(within(guideRegion).getByRole("region", { name: "Period 3" })).toBeInTheDocument();
    expect(within(guideRegion).getAllByText(en.guide.done)).toHaveLength(2);
    expect(within(guideRegion).getByText("# Step 1 script")).toBeInTheDocument();
    // step 1 (bell-ringer) and step 9 (practice) link the games
    expect(within(guideRegion).getAllByRole("link", { name: en.guide.games })).toHaveLength(2);
  });

  it("shows the answer key with the correct option, the model answers, and the activities", async () => {
    await renderPage();
    const key = screen.getByRole("region", { name: en.lesson.answerKey });
    expect(within(key).getByText(en.lesson.teachersOnly)).toBeInTheDocument();
    expect(within(key).getByText("✓ seven")).toBeInTheDocument();
    expect(within(key).getByText("I am seven.")).toBeInTheDocument();
    expect(within(key).getByText("Tom.")).toBeInTheDocument();
    expect(within(key).getByText("Write about you.", { selector: "li" })).toBeInTheDocument();
    expect(within(key).getByText("seven", { selector: "span" })).toBeInTheDocument();
    expect(within(key).getByText(en.lesson.rubric1)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: en.lesson.summary })).toHaveTextContent("May meets her class.");
  });

  it("says when there is no key or no article, and renders the Thai summary in Thai", async () => {
    mocks.getTeacherLesson.mockResolvedValueOnce({ ...lesson, lesson: { ...lesson.lesson, articleId: null }, article: null, bank: { mcq: [], saq: [], laq: [] }, activities: null });
    await renderPage();
    expect(screen.getByText(en.lesson.noKey)).toBeInTheDocument();
    expect(screen.getByText(en.lesson.noArticle)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: en.lesson.rehearsal })).not.toBeInTheDocument();
    cleanup();
    await renderPage("th");
    expect(screen.getByText("เมย์พบเพื่อนร่วมชั้น")).toBeInTheDocument();
    expect(mocks.getLessonGuide).toHaveBeenLastCalledWith({ db: {}, locale: "th" });
  });

  it("is not found for a lesson outside the catalogue", async () => {
    mocks.getTeacherLesson.mockRejectedValueOnce(new Error("not in the catalogue"));
    await expect(renderPage()).rejects.toThrow("NOT_FOUND");
  });
});
