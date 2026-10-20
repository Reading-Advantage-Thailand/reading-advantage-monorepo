// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cleanup, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { allMessages, renderWithMessages, testMessages, type AnyTestLocale } from "@/components/__tests__/helpers/render-with-messages";
import { MANUAL_FIGURES } from "@/lib/teacher-manual-figures";
import { MANUAL_SECTIONS } from "@/lib/teacher-manual-guide";

const mocks = vi.hoisted(() => ({ locale: "en" as AnyTestLocale, getLessonGuide: vi.fn(), getTeacherBookSlots: vi.fn(), currentUser: vi.fn() }));

vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-books", () => ({ getLessonGuide: mocks.getLessonGuide, getTeacherBookSlots: mocks.getTeacherBookSlots }));
vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("next/image", () => ({
  default: ({ src, alt, width, height }: { src: string; alt: string; width: number; height: number }) => <img src={src} alt={alt} width={width} height={height} />,
}));
vi.mock("next-intl/server", async () => {
  const { allMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getLocale: async () => mocks.locale,
    getTranslations: async (namespace?: string) => createTranslator({ locale: mocks.locale, messages: messages[mocks.locale], namespace: namespace as never }),
  };
});
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import TeacherManualPage from "../page";

const guide = [{ period: 1, steps: [{ step: 1, title: "Before You Read", period: 1, teacherActions: ["Greet the class"], teacherLanguage: [], studentActions: ["Look at the picture"], watchFor: [], scriptMd: null }] }];
const CLASS_A = "11111111-1111-4111-8111-111111111111";
const slot = (classroomId: string) => ({ classroomId, classroomName: "P3A", classBookId: null, bookName: null, currentLesson: null, lessonCount: null, lessonTitle: null });

/**
 * Renders the manual through the real message tree.
 * @param locale The UI locale.
 */
async function renderPage(locale: AnyTestLocale = "en") {
  mocks.locale = locale;
  renderWithMessages((await TeacherManualPage()) as React.ReactElement, { locale });
}

/** The link button of a section. */
const sectionLink = (id: string) => within(document.getElementById(id)!).getByRole("link", { name: testMessages.en.TeacherManual.openPage });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getLessonGuide.mockResolvedValue(guide);
  mocks.currentUser.mockResolvedValue({ id: "t1", role: "TEACHER", schoolId: "s1" });
  mocks.getTeacherBookSlots.mockResolvedValue([slot(CLASS_A)]);
});
afterEach(cleanup);

describe("teacher manual (FR-15, S5 request 2026-10-20)", () => {
  const en = testMessages.en.TeacherUi.classBook.manual;

  it("keeps the 13 steps with the imported guide at the bottom", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en.title);
    const steps = screen.getByRole("region", { name: en.stepsTitle });
    expect(steps).toHaveAttribute("id", "steps");
    expect(within(steps).getByText("Step 1: Before You Read")).toBeInTheDocument();
    expect(within(steps).getByText("Greet the class")).toBeInTheDocument();
    // the games link only the practice steps 9 and 10, not step 1
    expect(within(steps).queryByRole("link", { name: testMessages.en.TeacherUi.classBook.guide.games })).toBeNull();
  });

  it("lists the six sections in the table of contents, each with an anchor that exists", async () => {
    await renderPage();
    const toc = screen.getByRole("navigation", { name: testMessages.en.TeacherManual.tocTitle });
    const hrefs = within(toc).getAllByRole("link").map((link) => link.getAttribute("href")).filter((href) => href?.startsWith("#"));
    expect(hrefs).toEqual(["#signin", "#class", "#start-class", "#assign-book", "#lesson", "#after-lesson", "#homework", "#class-sheet", "#steps"]);
    for (const href of hrefs) expect(document.getElementById(href!.slice(1))).not.toBeNull();
    expect(screen.getByRole("region", { name: new RegExp(`^6\\s*${testMessages.en.TeacherManual.classSheet.title}$`) })).toHaveAttribute("id", "class-sheet");
  });

  it("builds the screen labels from the live message keys", async () => {
    await renderPage("th");
    const th = testMessages.th;
    const start = document.getElementById("start-class")!;
    expect(start).toHaveTextContent(`บนหน้าชั้นเรียน ที่กรอบ ${th.ClassLogin.title} กด ${th.ClassLogin.session.start}`);
    expect(document.getElementById("class-sheet")).toHaveTextContent(th.ClassLogin.roster.newPassword);
    expect(document.getElementById("signin")).toHaveTextContent(`แล้วกด ${th.AuthPage.staff.submit}`);
  });

  it("leaves no placeholder or tag in any locale", async () => {
    for (const locale of Object.keys(allMessages) as AnyTestLocale[]) {
      await renderPage(locale);
      expect(document.body.textContent).not.toMatch(/[{}<>]|TeacherManual\./);
      cleanup();
    }
  });

  it("links the class parts to the class page of a teacher with one class", async () => {
    await renderPage();
    expect(sectionLink("start-class")).toHaveAttribute("href", `/teacher/class-roster/${CLASS_A}#class-login`);
    expect(sectionLink("assign-book")).toHaveAttribute("href", `/teacher/class-roster/${CLASS_A}#class-book`);
    expect(sectionLink("class-sheet")).toHaveAttribute("href", `/teacher/class-roster/${CLASS_A}#class-login`);
    expect(sectionLink("class")).toHaveAttribute("href", "/teacher/my-classes");
    expect(sectionLink("homework")).toHaveAttribute("href", "/teacher/assignments");
    expect(within(document.getElementById("signin")!).queryByRole("link")).toBeNull();
  });

  it("links the class parts to My classes for several classes or a failed read", async () => {
    mocks.getTeacherBookSlots.mockResolvedValueOnce([slot(CLASS_A), slot(CLASS_A), slot("22222222-2222-4222-8222-222222222222")]);
    await renderPage();
    expect(sectionLink("start-class")).toHaveAttribute("href", "/teacher/my-classes");
    cleanup();
    mocks.getTeacherBookSlots.mockRejectedValueOnce(new Error("db down"));
    await renderPage();
    expect(sectionLink("lesson")).toHaveAttribute("href", "/teacher/my-classes");
  });

  it("shows each picture with its alternative text, its file, and numbered marks inside the picture", async () => {
    await renderPage("th");
    const used = MANUAL_SECTIONS.flatMap((section) =>
      section.blocks.flatMap((block) => ("steps" in block ? block.steps.flatMap((step) => [step.figure ?? []].flat()) : "figure" in block ? [block.figure] : [])),
    ).filter(Boolean);
    expect(new Set(used)).toEqual(new Set(Object.keys(MANUAL_FIGURES)));
    for (const [id, figure] of Object.entries(MANUAL_FIGURES)) {
      const node = document.querySelector(`[data-figure="${id}"]`)!;
      expect(within(node as HTMLElement).getByRole("img")).toHaveAttribute("alt", testMessages.th.TeacherManual.figures[id as keyof typeof MANUAL_FIGURES]);
      expect(existsSync(join(process.cwd(), "public", figure.src))).toBe(true);
      for (const mark of figure.marks) {
        expect(mark.x + mark.w).toBeLessThanOrEqual(100);
        expect(mark.y + mark.h).toBeLessThanOrEqual(100);
      }
    }
    // Section 3 step 1: the mark 1 is on the picture of step 1.
    expect(document.querySelector('[data-figure="classCard"] [data-mark="1"]')).not.toBeNull();
  });

  it("uses the label of each screen for print buttons and the plural card label (PR review B5, B6)", async () => {
    await renderPage("en");
    const sheet = document.getElementById("class-sheet")!;
    expect(sheet).toHaveTextContent("Make cards for … students without a card");
    expect(sheet.textContent).not.toMatch(/NaN|\b7\b/);
  });

  it("links the LINE support contact and shows the teacher menu box (PR review B8, B9)", async () => {
    await renderPage("th");
    expect(screen.getByRole("link", { name: "LINE ReadingAdvantage" })).toHaveAttribute("href", "https://line.me/ti/p/Pf7_EF98Pv");
    const menu = document.getElementById("class")!;
    expect(menu).toHaveTextContent("เมนูของครู");
    expect(menu).toHaveTextContent(`${testMessages.th.Sidebar.home} ${testMessages.th.Sidebar.myClasses} ${testMessages.th.Sidebar.myStudents}`);
  });

  it("asks for the Thai guide in Thai and says when the guide is missing", async () => {
    mocks.getLessonGuide.mockResolvedValueOnce([]);
    await renderPage("th");
    expect(mocks.getLessonGuide).toHaveBeenCalledWith({ db: {}, locale: "th" });
    expect(screen.getByText(testMessages.th.TeacherUi.classBook.guide.empty)).toBeInTheDocument();
  });
});
