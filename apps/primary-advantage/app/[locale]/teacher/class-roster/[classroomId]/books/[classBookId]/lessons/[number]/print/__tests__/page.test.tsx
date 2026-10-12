// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { testMessages } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  user: { id: "t1", role: "TEACHER", schoolId: "school-1" } as Record<string, unknown> | null,
  loadTeacherLesson: vi.fn(),
  getPrintLesson: vi.fn(),
  renderPrintLesson: vi.fn(),
  redirect: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-books", () => ({ getPrintLesson: mocks.getPrintLesson }));
vi.mock("@reading-advantage/domain/primary-books/print", () => ({ renderPrintLesson: mocks.renderPrintLesson }));
vi.mock("@/lib/observability/logger", () => ({ logger: { error: mocks.logError } }));
vi.mock("../../page", () => ({ loadTeacherLesson: mocks.loadTeacherLesson }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("next-intl/server", () => ({
  getLocale: async () => "en",
  getTranslations: async (namespace?: string) => createTranslator({ locale: "en", messages: testMessages.en, namespace: namespace as never }),
}));
vi.mock("@/i18n/navigation", () => ({
  redirect: mocks.redirect,
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import PrintLessonPage from "../page";

const en = testMessages.en.TeacherUi.classBook.lesson;
const BACK = "/teacher/class-roster/c1/books/cb1/lessons/5";
const lesson = { lesson: { number: 5, title: "The Big Storm", articleId: "a1" }, hasPrint: true };

/** Renders the print page. */
async function renderPage() {
  render((await PrintLessonPage({ params: Promise.resolve({ classroomId: "c1", classBookId: "cb1", number: "5" }) })) as React.ReactElement);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: "t1", role: "TEACHER", schoolId: "school-1" };
  mocks.loadTeacherLesson.mockResolvedValue(lesson);
  mocks.getPrintLesson.mockResolvedValue({ title: "The Big Storm", printLesson: { packageKey: "o3-2/5" } });
  mocks.renderPrintLesson.mockReturnValue("<!DOCTYPE html><html><body>x</body></html>");
});
afterEach(cleanup);

describe("print lesson page", () => {
  it("renders the lesson into the sandboxed frame with a disabled Print button", async () => {
    await renderPage();
    expect(mocks.renderPrintLesson).toHaveBeenCalledWith({ printLesson: { packageKey: "o3-2/5" }, locale: "en" });
    expect(screen.getByTitle(en.printFrameTitle)).toHaveAttribute("srcdoc", "<!DOCTYPE html><html><body>x</body></html>");
    expect(screen.getByRole("button", { name: en.printLoading })).toBeDisabled();
    expect(screen.getByRole("link", { name: en.backToLesson })).toHaveAttribute("href", BACK);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("The Big Storm");
  });

  it("shows the not-ready text and no Print button without print data", async () => {
    mocks.loadTeacherLesson.mockResolvedValue({ ...lesson, hasPrint: false });
    await renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent(en.printNotReadyTitle);
    expect(screen.getByText(en.printNotReadyBody)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.backToLesson })).toHaveAttribute("href", BACK);
    expect(mocks.getPrintLesson).not.toHaveBeenCalled();
  });

  it("gives the lesson page refusal (not found) when the lesson is not the teacher's", async () => {
    mocks.loadTeacherLesson.mockResolvedValue(null);
    await expect(renderPage()).rejects.toThrow("NOT_FOUND");
  });

  it("logs and shows not found when the read or the render fails", async () => {
    mocks.renderPrintLesson.mockImplementation(() => { throw new Error("bad data"); });
    await expect(renderPage()).rejects.toThrow("NOT_FOUND");
    expect(mocks.logError).toHaveBeenCalledWith("print_lesson_failed", expect.objectContaining({ classBookId: "cb1", number: 5 }));
  });

  it("redirects to sign in without a user", async () => {
    mocks.user = null;
    await renderPage().catch(() => undefined);
    expect(mocks.redirect).toHaveBeenCalled();
  });
});
