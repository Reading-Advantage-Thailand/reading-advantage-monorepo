// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages, type TestLocale } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({ locale: "en" as "en" | "th", getDashboardData: vi.fn() }));

vi.mock("@/actions/flashcard", () => ({ getDashboardData: mocks.getDashboardData }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getTranslations: async (namespace?: string) =>
      createTranslator({ locale: mocks.locale, messages: messages[mocks.locale as TestLocale], namespace: namespace as never }),
  };
});
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("../deck-view", () => ({
  SingleDeckViewInline: ({ deck }: { deck: { id: string } }) => <div data-testid="deck-view" data-deck={deck.id} />,
}));

import FlashcardDashboard from "../flashcard-dashboard";

/**
 * Renders the server dashboard through the real message tree.
 * @param type The deck type of the page.
 * @param locale The UI locale.
 */
async function renderDashboard(type: "VOCABULARY" | "SENTENCE", locale: TestLocale = "en") {
  mocks.locale = locale;
  renderWithMessages((await FlashcardDashboard({ type })) as React.ReactElement, { locale });
}

/**
 * One deck as getDashboardData returns it.
 * @param id The deck id.
 * @param type The deck type.
 * @returns The deck.
 */
function deck(id: string, type: "VOCABULARY" | "SENTENCE") {
  return { id, name: id, type, totalCards: 6, dueCards: 2, newCards: 1, learningCards: 0, reviewCards: 3, createdAt: "2026-10-01", updatedAt: "2026-10-02" };
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("FlashcardDashboard states", () => {
  it.each(["en", "th"] as const)("shows a child-friendly error with a retry, not the raw message (%s)", async (locale) => {
    const t = testMessages[locale];
    mocks.getDashboardData.mockResolvedValue({ success: false, error: "Failed to fetch dashboard data", decks: [], stats: null, deckType: "VOCABULARY" });
    await renderDashboard("VOCABULARY", locale);

    expect(screen.getByRole("alert")).toHaveTextContent(t.Flashcards.loadError);
    expect(screen.getByRole("button", { name: t.Error.retry })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Failed to fetch dashboard data");
  });

  it("shows the vocabulary empty state with a way to the stories", async () => {
    const t = testMessages.en.Flashcards;
    mocks.getDashboardData.mockResolvedValue({ success: true, decks: [], stats: null, deckType: "VOCABULARY" });
    await renderDashboard("VOCABULARY");

    expect(screen.getByText(t.vocabularyEmpty)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.findStory })).toHaveAttribute("href", "/student/read");
  });

  it("shows the sentence empty state on the sentences page", async () => {
    const t = testMessages.th.Flashcards;
    mocks.getDashboardData.mockResolvedValue({ success: true, decks: [], stats: null, deckType: "SENTENCE" });
    await renderDashboard("SENTENCE", "th");

    expect(screen.getByText(t.sentencesEmpty)).toBeInTheDocument();
  });

  it("shows the deck of the page type", async () => {
    mocks.getDashboardData.mockResolvedValue({
      success: true,
      decks: [deck("words", "VOCABULARY"), deck("lines", "SENTENCE")],
      stats: null,
      deckType: "SENTENCE",
    });
    await renderDashboard("SENTENCE");

    expect(mocks.getDashboardData).toHaveBeenCalledWith("SENTENCE");
    expect(screen.getByTestId("deck-view")).toHaveAttribute("data-deck", "lines");
  });
});
