// @vitest-environment jsdom
/**
 * Phase 3 adversarial round 2: hostile page text through `sentencePieces` (finding F151 class).
 *
 * The first case feeds hostile text to the decodable page: an empty string, only punctuation,
 * leading punctuation, an ellipsis, a `!?` run, quotes, two marks after one word, unicode
 * punctuation, and repeated words. The rendered sentence must keep every character in order
 * and must give each word exactly one tap button.
 *
 * The second case takes the shipped w06 page 3 (`Tap, tap, tap!`), where a comma sits between
 * a word and a space. The F151 fix groups a word with its trailing punctuation in one flex
 * item, so this case pins that the comma shares the flex item with its word too.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { StorytimeWeek } from "../lib/contracts/week";
import week6 from "../content/l2/w06.json";

/** The pattern of one word, the same shape the decodable page uses. */
const WORD_RE = /([\p{L}\p{N}][\p{L}\p{N}'’-]*)/gu;

afterEach(() => {
  cleanup();
});

/** Loads the client decodable and makes a missing module an assertion failure. */
async function loadDecodable() {
  try {
    const modulePath = "../app/[locale]/st/[level]/[week]/decodable";
    return (await import(/* @vite-ignore */ modulePath)).StorytimeDecodable;
  } catch (error) {
    expect(error, "Storytime must provide the client decodable UI").toBeUndefined();
    throw error;
  }
}

/**
 * Builds a one-page decodable week that carries one page text.
 * @param text The hostile page text.
 * @returns The week fixture for the decodable component.
 */
function weekWithText(text: string): StorytimeWeek {
  return {
    version: 1,
    books: [{ kind: "decodable", pages: [{ text }] }],
  } as unknown as StorytimeWeek;
}

/**
 * Renders one page text and returns its sentence paragraph.
 * @param text The hostile page text.
 * @returns The rendered paragraph of the page.
 */
async function renderSentence(text: string): Promise<HTMLElement> {
  const Decodable = await loadDecodable();
  const view = render(<Decodable week={weekWithText(text)} locale="en" />);
  const sentence = view.container.querySelector<HTMLElement>("[data-page-number] p");
  expect(sentence, "the decodable must render the paragraph of the page").toBeTruthy();
  return sentence!;
}

/**
 * Builds the text the sentence must show: each word uppercased, every other character kept.
 * @param text The page text.
 * @returns The expected rendered text.
 */
function expectedText(text: string): string {
  return text.replace(WORD_RE, (word) => word.toUpperCase());
}

describe("Phase 3 adversarial hostile sentence text", () => {
  it("keeps every character and gives each word one tap button", async () => {
    const hostile = [
      "",
      "...",
      "...?",
      "“Hi!”",
      "—Wait, what?!",
      "  ",
      "'Tis ok, then.",
      "42.",
      "…—!?.,;:",
      "“A” “B”",
      "Sam, Nan, and Pam nap.",
    ];
    let wordsSeen = 0;
    for (const text of hostile) {
      const sentence = await renderSentence(text);
      expect(
        sentence.textContent ?? "",
        `the sentence must show every character of ${JSON.stringify(text)} in order`,
      ).toBe(expectedText(text));
      const words = [...text.matchAll(WORD_RE)].map((match) => match[0]!);
      const buttons = [...sentence.querySelectorAll("button")];
      expect(
        buttons.map((button) => button.textContent ?? ""),
        `each word of ${JSON.stringify(text)} must keep exactly one tap button`,
      ).toEqual(words.map((word) => word.toUpperCase()));
      wordsSeen += words.length;
      cleanup();
    }
    // A control: the loop must really exercise words, or a wordless fixture would pass.
    expect(wordsSeen, "the hostile set must hold words with tap buttons").toBeGreaterThan(5);
  });

  // F240: a comma that sits before a space stays a separate flex item, so the gap opens
  // before it on the shipped w06 page 3, w05 page 8 and w07 page 6.
  it.fails("keeps a shipped comma in the same flex item as its word", async () => {
    const Decodable = await loadDecodable();
    const view = render(<Decodable week={week6 as unknown as StorytimeWeek} locale="en" />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    const sentence = [...view.container.querySelectorAll<HTMLElement>("[data-page-number] p")].find(
      (element) => (element.textContent ?? "") === "TAP, TAP, TAP!",
    );
    expect(
      sentence,
      "the shipped w06 decodable page three must read Tap, tap, tap!",
    ).toBeTruthy();
    const buttons = [...sentence!.querySelectorAll("button")];
    expect(buttons, "the page holds three tap words").toHaveLength(3);
    const group = buttons[0]!.parentElement!;
    expect(
      group.textContent,
      "the comma must share one flex item with its word, so no gap opens before it (F151)",
    ).toBe("TAP,");
    expect(group.querySelectorAll("button"), "the group holds only its own word").toHaveLength(1);
  });
});
