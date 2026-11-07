// @vitest-environment jsdom
/**
 * Phase 3 adversarial round 3: hostile page text through `sentencePieces` after the F240 fix.
 *
 * The F240 fix split the run between two words, so the punctuation that ends a word before its
 * gap joins the word and the whitespace stays a plain piece. This case feeds the new code path
 * hostile text: a punctuation run before a space, a leading quote, a quoted name with a comma, a
 * lone comma, unicode punctuation, a tab, and a double space.
 *
 * Every rendered sentence must show each character of the source in order, with no lost and no
 * doubled character, and every word must keep exactly one tap button.
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
 * Builds the text the sentence must show: the source case is kept, every character is kept.
 * @param text The page text.
 * @returns The expected rendered text.
 */
function expectedText(text: string): string {
  return text;
}

/**
 * Renders one page text and returns its sentence paragraph.
 * @param text The hostile page text.
 * @returns The rendered paragraph of the page.
 */
async function renderSentence(text: string): Promise<HTMLElement> {
  const { StorytimeDecodable } = await import("../app/[locale]/st/[level]/[week]/decodable");
  const view = render(<StorytimeDecodable week={weekWithText(text)} locale="en" />);
  const sentence = view.container.querySelector<HTMLElement>("[data-page-number] p");
  expect(sentence, "the decodable must render the paragraph of the page").toBeTruthy();
  return sentence!;
}

/**
 * Reads the text of every flex item of a rendered sentence.
 * @param sentence The rendered paragraph.
 * @returns The text of each flex item, in reading order.
 */
function itemTexts(sentence: HTMLElement): string[] {
  return [...sentence.children].map((child) => child.textContent ?? "");
}

describe("Phase 3 adversarial hostile sentence text after the F240 fix", () => {
  it("keeps every character and gives each word one tap button", async () => {
    const hostile = [
      "",
      ",",
      ",,,",
      "Hello!! There.",
      "Wait... what?",
      "\"Hi,\" she said.",
      "A, B, C.",
      "Hello , world",
      "Hi  there",
      "Hi\tthere",
      "你好，世界",
      "„Hi“",
      "42. Next.",
      "Sam, Nan, and Pam nap.",
    ];
    let wordsSeen = 0;
    for (const text of hostile) {
      const sentence = await renderSentence(text);
      expect(
        sentence.textContent ?? "",
        `the sentence must show every character of ${JSON.stringify(text)} in order, with no lost and no doubled character`,
      ).toBe(expectedText(text));
      const words = [...text.matchAll(WORD_RE)].map((match) => match[0]!);
      const buttons = [...sentence.querySelectorAll("button")];
      expect(
        buttons.map((button) => button.textContent ?? ""),
        `each word of ${JSON.stringify(text)} must keep exactly one tap button`,
      ).toEqual(words);
      wordsSeen += words.length;
      cleanup();
    }
    // A control: the loop must really exercise words, or a wordless fixture would pass.
    expect(wordsSeen, "the hostile set must hold words with tap buttons").toBeGreaterThan(5);
  });

  it("keeps the punctuation that ends a word in the flex item of that word", async () => {
    const run = await renderSentence("Hello!! There.");
    const items = itemTexts(run);
    expect(
      items[1],
      "the punctuation run before the space must share the flex item with its word (F240)",
    ).toBe("Hello!!");
    expect(
      run.querySelectorAll("button"),
      "the word group holds only its own word",
    ).toHaveLength(2);

    const quoted = await renderSentence("\"Hi,\" she said.");
    expect(
      itemTexts(quoted)[1],
      "the comma and the closing quote must share the flex item with their word (F240)",
    ).toBe("Hi,\"");
    cleanup();
  });

  it("keeps the shipped comma of w06 page three in the flex item of its word", async () => {
    const { StorytimeDecodable } = await import("../app/[locale]/st/[level]/[week]/decodable");
    const view = render(<StorytimeDecodable week={week6 as unknown as StorytimeWeek} locale="en" />);
    // The decodable shows one page at a time, so the page turner reaches page three.
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    const sentence = [...view.container.querySelectorAll<HTMLElement>("[data-page-number] p")].find(
      (element) => (element.textContent ?? "") === "Tap, tap, tap!",
    );
    expect(sentence, "the shipped w06 decodable page three must read Tap, tap, tap!").toBeTruthy();
    const buttons = [...sentence!.querySelectorAll("button")];
    expect(buttons, "the page holds three tap words").toHaveLength(3);
    expect(
      buttons[0]!.parentElement!.textContent,
      "the comma must share one flex item with its word, so no gap opens before it (F240)",
    ).toBe("Tap,");
  });
});
