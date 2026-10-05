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
  listClassBooks: vi.fn(),
  listCatalogueBooks: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user, getCurrentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-books", () => ({ listClassBooks: mocks.listClassBooks, listCatalogueBooks: mocks.listCatalogueBooks }));
vi.mock("@/actions/class-books", () => ({ assignClassBookAction: vi.fn() }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getLocale: async () => mocks.locale,
    getTranslations: async (namespace?: string) => createTranslator({ locale: mocks.locale, messages: messages[mocks.locale], namespace: namespace as never }),
  };
});
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
// The roster fetches the class; here it only renders the slot it receives.
vi.mock("@/components/teacher/enhanced-class-roster", () => ({
  default: ({ classBook }: { classBook?: ReactNode }) => <div data-testid="roster">{classBook ?? <p>placeholder slot</p>}</div>,
}));

import ClassroomDetailPage from "../page";

const C1 = "c1c1c1c1-0000-4000-8000-000000000001";
const CB = "cbcbcbcb-0000-4000-8000-000000000001";
const BOOK = "b0b0b0b0-0000-4000-8000-000000000001";
const classBook = { id: CB, classroomId: C1, bookId: BOOK, bookKey: "o3-2", bookName: "Primary Advantage Origins 3.2", lessonCount: 14, mode: "teacher_led", startDate: null, currentLesson: 3, taughtCount: 1 };
const catalogue = [
  { id: BOOK, key: "o3-2", name: "Primary Advantage Origins 3.2", seriesName: "Primary Advantage Origins", lessonCount: 14 },
  { id: "b0b0b0b0-0000-4000-8000-000000000002", key: "q4", name: "Primary Advantage Quest 4", seriesName: "Primary Advantage Quest", lessonCount: 14 },
];

/**
 * Renders the class page through the real message tree. The card is an async server component,
 * so the test awaits it before rendering.
 * @param locale The UI locale.
 */
async function renderPage(locale: TestLocale = "en") {
  mocks.locale = locale;
  const page = (await ClassroomDetailPage({ params: Promise.resolve({ classroomId: C1 }) })) as React.ReactElement<{ classBook?: React.ReactElement<Record<string, unknown>> }>;
  const slot = page.props.classBook;
  const card = slot ? await (slot.type as (props: Record<string, unknown>) => Promise<React.ReactElement>)(slot.props) : undefined;
  renderWithMessages(<page.type {...page.props} classBook={card} />, { locale });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listClassBooks.mockResolvedValue([classBook]);
  mocks.listCatalogueBooks.mockResolvedValue(catalogue);
});
afterEach(cleanup);

describe("teacher class page class books (FR-1)", () => {
  const en = testMessages.en.TeacherUi.classBook;

  it("lists the assigned book with its pointer, taught count, and lesson plan link, plus the assign form", async () => {
    await renderPage();
    const card = screen.getByRole("region", { name: en.title });
    expect(within(card).getByText("Primary Advantage Origins 3.2", { selector: "span" })).toBeInTheDocument();
    expect(within(card).getByText("Lesson 3 of 14 · 1 lesson taught")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: en.pacing })).toHaveAttribute("href", `/teacher/class-roster/${C1}/books/${CB}`);
    const form = within(card).getByRole("form", { name: en.assign });
    expect(within(form).getByRole("combobox", { name: en.book })).toBeInTheDocument();
    expect(within(form).getByRole("option", { name: "Primary Advantage Quest 4" })).toBeInTheDocument();
    expect(within(form).getByRole("combobox", { name: en.mode })).toHaveValue("teacher_led");
    expect(within(form).getByLabelText(en.startDate)).toHaveAttribute("type", "date");
    expect(within(form).getByRole("button", { name: en.assignButton })).toBeInTheDocument();
    expect(form.querySelector('input[name="classroomId"]')).toHaveValue(C1);
    expect(mocks.listClassBooks).toHaveBeenCalledWith(expect.objectContaining({ classroomId: C1, user: mocks.user }));
  });

  it("says when the class has no book and when the catalogue is empty", async () => {
    mocks.listClassBooks.mockResolvedValueOnce([]);
    mocks.listCatalogueBooks.mockResolvedValueOnce([]);
    await renderPage();
    const card = screen.getByRole("region", { name: en.title });
    expect(within(card).getByText(en.none)).toBeInTheDocument();
    expect(within(card).getByText(en.noCatalogue)).toBeInTheDocument();
    expect(within(card).queryByRole("form")).not.toBeInTheDocument();
  });

  it("renders the Thai card", async () => {
    await renderPage("th");
    expect(screen.getByRole("region", { name: testMessages.th.TeacherUi.classBook.title })).toBeInTheDocument();
    expect(screen.getByText("บทที่ 3 จาก 14 · สอนแล้ว 1 บท")).toBeInTheDocument();
  });

  it("falls back to the placeholder slot when the class books cannot be read", async () => {
    mocks.listClassBooks.mockRejectedValueOnce(new Error("down"));
    await renderPage();
    expect(screen.getByText("placeholder slot")).toBeInTheDocument();
  });
});
