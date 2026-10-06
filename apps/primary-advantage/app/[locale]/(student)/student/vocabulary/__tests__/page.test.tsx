// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, within } from "@testing-library/react";
import { createTranslator } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages, type TestLocale } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({ locale: "en" as "en" | "th" }));

vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getTranslations: async (namespace?: string) =>
      createTranslator({ locale: mocks.locale, messages: messages[mocks.locale as TestLocale], namespace: namespace as never }),
  };
});
vi.mock("@/actions/flashcard", () => ({ getAllSentenceCards: async () => ({ success: true, cards: [] }) }));
vi.mock("@/components/flashcards/flashcard-dashboard", () => ({
  default: ({ type }: { type: string }) => <div data-testid="flashcard-dashboard" data-type={type} />,
}));
vi.mock("@/components/practice/order-sentences-page", () => ({ default: () => null }));
vi.mock("@/components/practice/cloze-test-page", () => ({ default: () => null }));
vi.mock("@/components/practice/order-words-page", () => ({ default: () => null }));
vi.mock("@/components/practice/matching-page", () => ({ default: () => null }));
vi.mock("@/components/manage-tab", () => ({ default: () => null }));

import VocabularyPage from "../page";
import SentencesPage from "../../sentences/page";

afterEach(cleanup);

describe("vocabulary and sentences pages", () => {
  it.each(["en", "th"] as const)("gives the vocabulary page its own title and no one-tab bar (%s)", async (locale) => {
    mocks.locale = locale;
    const t = testMessages[locale].Flashcards;
    renderWithMessages((await VocabularyPage()) as React.ReactElement, { locale });

    expect(screen.getByRole("heading", { level: 1, name: t.vocabularyTitle })).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByTestId("flashcard-dashboard")).toHaveAttribute("data-type", "VOCABULARY");
  });

  it("gives the sentences page its own title and one named row of practice tabs", async () => {
    mocks.locale = "en";
    const t = testMessages.en;
    renderWithMessages((await SentencesPage()) as React.ReactElement);

    expect(screen.getByRole("heading", { level: 1, name: t.Flashcards.sentencesTitle })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: t.SentencesPage.sentencesCard.title })).not.toBeInTheDocument();
    const tabs = screen.getByRole("tablist", { name: t.Flashcards.practiceTabs });
    expect(within(tabs).getAllByRole("tab")).toHaveLength(6);
    expect(screen.getByTestId("flashcard-dashboard")).toHaveAttribute("data-type", "SENTENCE");
  });
});
