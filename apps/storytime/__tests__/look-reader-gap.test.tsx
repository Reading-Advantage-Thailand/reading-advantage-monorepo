// @vitest-environment jsdom
/**
 * Task 1.8: the reader sentence sits at an even word gap (AC-1.9; plan 1.8).
 *
 * The three spec checks (single-space text, no justify alignment, no wide word spacing) already
 * pass at the base; they are the named characterization case (fact M6). The cause of the uneven
 * gap is the 44 px layout box of each word (`min-w-[44px]` with `justify-center`) in
 * `packages/read-along`, so that check fails at the base. Green keeps a 44 px tap target through
 * an expanded hit area that does not change layout.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";
import type { StorytimeWeek } from "../lib/contracts/week";

const app = resolve(import.meta.dirname, "..");
const shipped = JSON.parse(readFileSync(resolve(app, "content/l2/w01.json"), "utf8")) as StorytimeWeek;
const globalsPath = resolve(app, "app/globals.css");
const packageDir = resolve(app, "../../packages/read-along");

const labels = {
  readToMe: "Read it to me",
  myTurn: "My turn",
  slow: "Slow",
  previousPage: "Previous page",
  nextPage: "Next page",
  audioError: "Sound could not be played",
  finished: "Book finished",
  playing: "Playing",
};

const PAGE_ONE = "Hello, I am Pat.";
const PAGE_TWO = "Hello, I am May.";

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }),
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Loads the Storytime client reader with a named assertion when it is missing. */
async function loadReader() {
  try {
    const modulePath = "../app/[locale]/st/[level]/[week]/reader";
    return (await import(/* @vite-ignore */ modulePath)).StorytimeReader as ComponentType<{
      book: StorytimeWeek["books"][number];
      locale: string;
      labels: typeof labels;
    }>;
  } catch (error) {
    expect(error, "Storytime must provide the client reader").toBeUndefined();
    throw error;
  }
}

/** Renders the reader for the shipped read-along book. */
async function renderReader() {
  const Reader = await loadReader();
  const week = structuredClone(shipped);
  const book = week.books.find((entry) => entry.kind === "readalong")!;
  return { ...render(<Reader book={book} locale="en" labels={labels} />), book };
}

/** Normalizes whitespace to single spaces. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Returns the visible page text with single spaces. */
function pageText(container: HTMLElement): string {
  return normalize(container.querySelector("[data-page-content]")?.textContent ?? "");
}

/** Returns the word elements of the visible page. */
function words(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>("[data-word]")];
}

/** Turns one page and lets the 3-second hold expire. */
function turnPage(next: HTMLElement): void {
  fireEvent.click(next);
  act(() => {
    vi.advanceTimersByTime(3000);
  });
}

/** The class tokens of one HTML element. */
function tokensOf(element: Element): string[] {
  return typeof element.className === "string" ? element.className.split(/\s+/) : [];
}

/** Reports whether one word-spacing value is wider than 0.35 em (about 6.3 px). */
function wordSpacingTooWide(value: string): boolean {
  const match = /(-?\d*\.?\d+)(em|px)/.exec(value);
  if (!match) return false;
  const size = Number(match[1]);
  return match[2] === "em" ? size > 0.35 : size > 6.3;
}

/** The layout-alignment tokens that make the gap uneven. */
const ALIGNMENT_TOKENS = new Set(["text-justify", "justify-between", "justify-around", "justify-evenly"]);

/** Reports whether a class token gives a layout width floor. */
function hasWidthFloor(token: string): boolean {
  return /^min-w-/.test(token) || /^w-(\d|\[)/.test(token);
}

/** Reads a 44 px tap floor from one class token, in either dimension. */
function tapFloorToken(token: string): boolean {
  const scale = /^min-[hw]-(\d+)$/.exec(token);
  if (scale) return Number(scale[1]) * 4 >= 44;
  const pixels = /^min-[hw]-\[(\d+)px\]$/.exec(token);
  if (pixels) return Number(pixels[1]) >= 44;
  return false;
}

/** Reports whether a token opens an expanded hit area. */
function hitAreaToken(token: string): boolean {
  return /^(before|after):/.test(token) && /(min-|inset|absolute|content-)/.test(token);
}

/** Reports whether a stylesheet holds a 44 px pseudo-element hit area. */
function stylesheetHitArea(): boolean {
  const files = [globalsPath];
  if (existsSync(packageDir)) {
    const walk = (folder: string): void => {
      for (const entry of readdirSync(folder, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        const path = resolve(folder, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.name.endsWith(".css")) files.push(path);
      }
    };
    walk(packageDir);
  }
  return files.some((path) => {
    if (!existsSync(path)) return false;
    const source = readFileSync(path, "utf8");
    return /::(before|after)\s*\{[^}]*(min-width|min-height|inset)\s*:\s*(44px|2\.75rem|[3-9]\dpx)/.test(source);
  });
}

/** Reports whether one word still has a 44 px or larger tap target. */
function hasTapTarget(word: HTMLElement, container: HTMLElement): boolean {
  for (let node: HTMLElement | null = word; node && node !== container.parentElement; node = node.parentElement) {
    for (const token of tokensOf(node)) {
      if (tapFloorToken(token) || hitAreaToken(token)) return true;
    }
  }
  return stylesheetHitArea();
}

/** Checks one page against the three AC-1.9 spec rules. */
function checkPlainPage(container: HTMLElement, expected: string): void {
  expect(pageText(container), "the sentence text with single spaces must equal the source").toBe(expected);
  for (const word of words(container)) {
    for (let node: HTMLElement | null = word; node && node !== container.parentElement; node = node.parentElement) {
      for (const token of tokensOf(node)) {
        expect(
          ALIGNMENT_TOKENS.has(token),
          `no ancestor of a word may carry the layout token ${token} (AC-1.9)`,
        ).toBe(false);
      }
      expect(
        (node.style.textAlign ?? "").trim(),
        "no ancestor of a word may set an inline text-align: justify",
      ).not.toBe("justify");
      const spacing = (node.style.wordSpacing ?? "").trim();
      if (spacing) expect(wordSpacingTooWide(spacing), "no word-spacing above 0.35 em").toBe(false);
      for (const token of tokensOf(node)) {
        const embedded = /\[word-spacing:([^\]]+)\]/.exec(token);
        if (embedded) expect(wordSpacingTooWide(embedded[1]!), "no word-spacing above 0.35 em").toBe(false);
      }
    }
  }
}

describe("Task 1.8 reader word gap (AC-1.9)", () => {
  it("keeps the single-space text and no justify alignment on pages 1 and 2", async () => {
    // Named characterization (fact M6): these three spec rules already hold at the base.
    vi.useFakeTimers();
    const { container } = await renderReader();
    checkPlainPage(container, PAGE_ONE);
    turnPage(screen.getByRole("button", { name: labels.nextPage }));
    checkPlainPage(container, PAGE_TWO);
  });

  it("gives no reader word a layout width floor with justify-center", async () => {
    vi.useFakeTimers();
    const { container } = await renderReader();
    const pageOne = words(container);
    turnPage(screen.getByRole("button", { name: labels.nextPage }));
    const pageTwo = words(container);
    const all = [...pageOne, ...pageTwo];
    const wordBoxes = all.length;
    expect(`word_boxes=${wordBoxes}`).toMatch(/^word_boxes=\d+$/);
    expect(wordBoxes, "word_boxes must stay at seven or more").toBeGreaterThanOrEqual(7);

    for (const word of all) {
      const tokens = tokensOf(word);
      const floor = tokens.find(hasWidthFloor);
      const centered = tokens.includes("justify-center");
      expect(
        Boolean(floor && centered),
        `a reader word has a layout box wider than its text (${floor ?? "no width floor"} with justify-center), word box rule`,
      ).toBe(false);
      expect(
        hasTapTarget(word, container),
        "a reader word must keep a 44 px or larger tap target (Q5)",
      ).toBe(true);
    }

    // A mutant that restores the base class list must be rejected by the same rule.
    const mutant = "inline-flex min-h-[44px] min-w-[44px] items-center justify-center";
    const mutantTokens = mutant.split(/\s+/);
    expect(
      Boolean(mutantTokens.find(hasWidthFloor) && mutantTokens.includes("justify-center")),
      "the min-w-[44px] justify-center mutant must be rejected",
    ).toBe(true);
  });
});
