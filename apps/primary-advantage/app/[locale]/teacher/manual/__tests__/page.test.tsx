// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages, type TestLocale } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({ locale: "en" as TestLocale, getLessonGuide: vi.fn() }));

vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-books", () => ({ getLessonGuide: mocks.getLessonGuide }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
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

/**
 * Renders the manual through the real message tree.
 * @param locale The UI locale.
 */
async function renderPage(locale: TestLocale = "en") {
  mocks.locale = locale;
  renderWithMessages((await TeacherManualPage()) as React.ReactElement, { locale });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getLessonGuide.mockResolvedValue(guide);
});
afterEach(cleanup);

describe("teacher manual (FR-15)", () => {
  const en = testMessages.en.TeacherUi.classBook.manual;

  it("shows the five how-to steps and the imported guide", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en.title);
    const howTo = screen.getByRole("region", { name: en.howTo });
    expect(within(howTo).getAllByRole("listitem")).toHaveLength(5);
    const steps = screen.getByRole("region", { name: en.stepsTitle });
    expect(within(steps).getByText("Step 1: Before You Read")).toBeInTheDocument();
    expect(within(steps).getByText("Greet the class")).toBeInTheDocument();
    expect(within(steps).getByRole("link", { name: testMessages.en.TeacherUi.classBook.guide.games })).toHaveAttribute("href", "/teacher/game-challenges");
  });

  it("asks for the Thai guide in Thai and says when the guide is missing", async () => {
    mocks.getLessonGuide.mockResolvedValueOnce([]);
    await renderPage("th");
    expect(mocks.getLessonGuide).toHaveBeenCalledWith({ db: {}, locale: "th" });
    expect(screen.getByText(testMessages.th.TeacherUi.classBook.guide.empty)).toBeInTheDocument();
  });
});
