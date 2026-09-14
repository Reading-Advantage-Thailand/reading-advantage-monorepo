// @vitest-environment jsdom
/**
 * Wave 1 fix coverage: the six converted aria-label keys must resolve through
 * the real message trees. Each accessible name is asserted against the value
 * in messages/en.json and messages/th.json, and the sentence-order item label
 * is parsed against the real reorderAriaLabel template.
 */
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GoToTop } from "../go-to-top";
import AudioButton from "../audio-button";
import { OrderSentenceGame } from "../lesson/games/lesson-sentence-order";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
    <a {...(props as Record<string, unknown>)}>{children}</a>
  ),
  usePathname: () => "/",
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
    refresh: () => undefined,
    prefetch: () => undefined,
  }),
}));

vi.mock("@/components/header", () => ({
  Header: () => <div data-testid="header" />,
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({
    user: { id: "student-1", role: "STUDENT", schoolId: "school-1" },
    refresh: () => Promise.resolve(),
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: () => undefined, error: () => undefined },
}));

vi.mock("@/actions/flashcard", () => ({
  getLessonFlashcards: vi.fn(),
  getLessonOrderingSentences: vi.fn(),
}));

vi.mock("@/actions/user", () => ({
  updateUserActivity: vi.fn(),
}));

/**
 * Reads and parses a locale message file.
 * @param locale Locale file basename without extension.
 * @returns Parsed message dictionary.
 */
function messages(locale: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(appRoot, "messages", `${locale}.json`), "utf8"),
  ) as Record<string, unknown>;
}

/**
 * Renders a component inside the real message tree for one locale.
 * @param locale The locale to render.
 * @param tree The parsed message dictionary.
 * @param node The component element.
 * @returns The provider-wrapped element.
 */
function withMessages(
  locale: string,
  tree: Record<string, unknown>,
  node: ReactNode,
) {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={tree as never}
    >
      {node}
    </NextIntlClientProvider>,
  );
}

const en = messages("en");
const th = messages("th");
const enComponents = en.Components as Record<string, string>;
const thComponents = th.Components as Record<string, string>;

/**
 * Builds the expected aria-label from the real ICU template.
 * @param template The reorderAriaLabel message value.
 * @param sentence The sentence text.
 * @param position One-based position.
 * @param total Total sentence count.
 * @returns The expected accessible name.
 */
function formatReorderLabel(
  template: string,
  sentence: string,
  position: number,
  total: number,
): string {
  return template
    .replace("{sentence}", sentence)
    .replace("{position}", String(position))
    .replace("{total}", String(total));
}

describe("GoToTop accessible name is translated", () => {
  it("uses Components.backToTop from the English tree", () => {
    withMessages("en", en, <GoToTop />);

    const link = screen.getByRole("link", { name: enComponents.backToTop });
    expect(link).toHaveAttribute("aria-label", enComponents.backToTop);
  });

  it("uses Components.backToTop from the Thai tree", () => {
    withMessages("th", th, <GoToTop />);

    const link = screen.getByRole("link", { name: thComponents.backToTop });
    expect(link).toHaveAttribute("aria-label", thComponents.backToTop);
    expect(thComponents.backToTop).not.toBe(enComponents.backToTop);
  });
});

describe("AudioButton accessible names are translated", () => {
  beforeEach(() => {
    for (const method of ["play", "pause", "load"] as const) {
      Object.defineProperty(window.HTMLMediaElement.prototype, method, {
        configurable: true,
        writable: true,
        value:
          method === "play"
            ? () => Promise.resolve()
            : () => undefined,
      });
    }
  });

  it("plays with the English playAudio label and stops with stopAudio", async () => {
    withMessages(
      "en",
      en,
      <AudioButton audioUrl="/a.mp3" startTimestamp={0} endTimestamp={2} />,
    );

    const button = screen.getByRole("button", {
      name: enComponents.playAudio,
    });
    expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button);
    await waitFor(() =>
      expect(button).toHaveAttribute("aria-label", enComponents.stopAudio),
    );
    expect(button).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(button);
    await waitFor(() =>
      expect(button).toHaveAttribute("aria-label", enComponents.playAudio),
    );
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("plays with the Thai playAudio label and stops with stopAudio", async () => {
    withMessages(
      "th",
      th,
      <AudioButton audioUrl="/a.mp3" startTimestamp={0} endTimestamp={2} />,
    );

    const button = screen.getByRole("button", {
      name: thComponents.playAudio,
    });
    expect(thComponents.playAudio).not.toBe(enComponents.playAudio);

    fireEvent.click(button);
    await waitFor(() =>
      expect(button).toHaveAttribute("aria-label", thComponents.stopAudio),
    );
    expect(thComponents.stopAudio).not.toBe(enComponents.stopAudio);
  });
});

describe("Sentence-order item aria-label is translated", () => {
  const sentenceGroup = {
    id: "group-1",
    articleId: "article-1",
    articleTitle: "River Crossing",
    flashcardSentence: "First sentence",
    correctOrder: ["Second sentence", "First sentence", "Third sentence"],
    sentences: [
      { id: "s1", text: "First sentence" },
      { id: "s2", text: "Second sentence" },
      { id: "s3", text: "Third sentence" },
    ],
    difficulty: "easy" as const,
    startIndex: 0,
    flashcardIndex: 0,
  };

  it("builds each item name from the English reorderAriaLabel template", async () => {
    const template = (
      en.SentencesPage as Record<string, Record<string, string>>
    ).sentenceOrder.reorderAriaLabel;
    withMessages(
      "en",
      en,
      <OrderSentenceGame source="deck" sentences={[sentenceGroup]} />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: /start game/i }),
    );

    const items = await screen.findAllByRole("button", {
      name: (name) => name.includes("Position"),
    });
    expect(items).toHaveLength(3);

    const seen: string[] = [];
    items.forEach((item, index) => {
      const label = item.getAttribute("aria-label") ?? "";
      // The label must match the template shape for this position.
      const pattern = new RegExp(
        `^${template
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          .replace("\\{sentence\\}", "(.*)")
          .replace("\\{position\\}", String(index + 1))
          .replace("\\{total\\}", "3")}$`,
      );
      const match = label.match(pattern);
      expect(match, `label "${label}" follows the template`).not.toBeNull();
      expect(label).toBe(
        formatReorderLabel(template, match![1], index + 1, 3),
      );
      seen.push(match![1]);
    });
    expect(seen.sort()).toEqual([
      "First sentence",
      "Second sentence",
      "Third sentence",
    ]);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
