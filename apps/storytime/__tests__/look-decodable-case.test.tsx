// @vitest-environment jsdom
/**
 * Task 1.2: the decodable sentence and the tricky chips keep the source case (AC-1.3; plan 1.2).
 *
 * The shipped w01 decodable page 1 is "A nest." and its tricky chips are "a", "and", "can". The
 * component upper-cases both today (`decodable.tsx` lines 541 and 596), so every case that reads
 * the rendered text fails at the base with an assertion. The full-stop case is the named
 * characterization case: the punctuation already shares the flex item of its word (fact M5).
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StorytimeWeek } from "../lib/contracts/week";

const app = resolve(import.meta.dirname, "..");
const contentDir = resolve(app, "content/l2");
const shippedWeeks = readdirSync(contentDir)
  .filter((file) => /^w[0-9]{2}\.json$/.test(file))
  .map((file) => JSON.parse(readFileSync(resolve(contentDir, file), "utf8")) as StorytimeWeek);

/** The pattern of one word, the same shape the decodable page uses. */
const WORD_RE = /([\p{L}\p{N}][\p{L}\p{N}'’-]*)/gu;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Loads the client decodable and makes a missing module an assertion failure. */
async function loadDecodable() {
  try {
    const modulePath = "../app/[locale]/st/[level]/[week]/decodable";
    return (await import(/* @vite-ignore */ modulePath)).StorytimeDecodable as ComponentType<{
      week: StorytimeWeek;
      locale: string;
    }>;
  } catch (error) {
    expect(error, "Storytime must provide the client decodable UI").toBeUndefined();
    throw error;
  }
}

/**
 * Renders one decodable week and returns its rendered container.
 * @param week The week to render.
 * @returns The rendered container.
 */
async function renderDecodable(week: StorytimeWeek) {
  const Decodable = await loadDecodable();
  return render(<Decodable week={week} locale="en" />);
}

/** Returns the shipped w01 week. */
function shippedWeek(): StorytimeWeek {
  const week = shippedWeeks.find((entry) => entry.meta.week === 1);
  expect(week, "the shipped w01 week must exist").toBeDefined();
  return week!;
}

/** Returns the sentence paragraph of the decodable page. */
function sentenceParagraph(container: HTMLElement): HTMLElement {
  const paragraph = container.querySelector<HTMLElement>("[data-page-number] p");
  expect(paragraph, "the decodable must render the sentence paragraph of the page").toBeTruthy();
  return paragraph!;
}

/** Returns the tricky-word chip buttons in reading order. */
function trickyChips(container: HTMLElement): HTMLButtonElement[] {
  const section = container.querySelector<HTMLElement>("section[aria-label='Tricky words']");
  expect(section, "the decodable must render the tricky-words region").toBeTruthy();
  return [...section!.querySelectorAll<HTMLButtonElement>("button")];
}

/**
 * Removes line and block comments from TypeScript source, keeping string contents.
 * @param source The source text.
 * @returns The source without comments.
 */
function stripComments(source: string): string {
  let out = "";
  let index = 0;
  let quote: string | null = null;
  while (index < source.length) {
    const char = source[index]!;
    const next = source[index + 1] ?? "";
    if (quote) {
      out += char;
      if (char === "\\") {
        out += next;
        index += 2;
        continue;
      }
      if (char === quote) quote = null;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      out += char;
      index += 1;
      continue;
    }
    if (char === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      index = end === -1 ? source.length : end + 2;
      continue;
    }
    out += char;
    index += 1;
  }
  return out;
}

/** Lists every TypeScript source under one folder, in path order. */
function sourceFiles(folder: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(resolve(folder), { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = resolve(folder, entry.name);
    if (entry.isDirectory()) found.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(entry.name)) found.push(path);
  }
  return found.sort();
}

describe("Task 1.2 decodable case (AC-1.3)", () => {
  it("renders the shipped sentence and the tricky chips in the case of the source", async () => {
    const week = shippedWeek();
    const book = week.books.find((entry) => entry.kind === "decodable");
    expect(book, "the shipped w01 week must hold a decodable book").toBeDefined();
    const sourceSentence = book!.audio!.sentences[0]!.sentence;
    const sourceTricky = book!.soundsPage!.tricky!;
    expect(sourceSentence, "the shipped w01 sentence must read A nest.").toBe("A nest.");
    expect(sourceTricky, "the shipped w01 tricky chips must be a, and, can").toEqual(["a", "and", "can"]);

    const { container } = await renderDecodable(structuredClone(week));
    const paragraph = sentenceParagraph(container);
    expect(
      paragraph.textContent,
      "the sentence must keep the case of the source text (AC-1.3)",
    ).toBe(sourceSentence);

    const chips = trickyChips(container);
    expect(`chips=${chips.length}`).toBe(`chips=${sourceTricky.length}`);
    expect(
      chips.map((chip) => chip.textContent),
      "the tricky chips must keep the case of the source text (AC-1.3)",
    ).toEqual(sourceTricky);
  });

  it("keeps capital letters of a clone page and of the shipped w06 page three", async () => {
    const week = structuredClone(shippedWeek());
    const book = week.books.find((entry) => entry.kind === "decodable")!;
    const source = "Pat can tap. I am Sam.";
    book.pages[0]!.text = source;
    const { container, unmount } = await renderDecodable(week);
    expect(
      sentenceParagraph(container).textContent,
      "a capital letter of the source must stay a capital letter",
    ).toBe(source);
    // A toLowerCase mutant and a toUpperCase mutant must both be rejected by the same case.
    expect(source.toLowerCase(), "a toLowerCase mutant must be rejected").not.toBe(source);
    expect(source.toUpperCase(), "a toUpperCase mutant must be rejected").not.toBe(source);
    unmount();

    const week6 = shippedWeeks.find((entry) => entry.meta.week === 6);
    expect(week6, "the shipped w06 week must exist").toBeDefined();
    const pageThree = week6!.books.find((entry) => entry.kind === "decodable")!.pages[2]!.text;
    expect(pageThree, "the shipped w06 page three must read Tap, tap, tap!").toBe("Tap, tap, tap!");
    const view = await renderDecodable(structuredClone(week6!));
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    const rendered = [...view.container.querySelectorAll<HTMLElement>("[data-page-number] p")].find(
      (element) => (element.textContent ?? "") === pageThree,
    );
    expect(
      rendered,
      "the shipped w06 page three must keep the case Tap, tap, tap!",
    ).toBeTruthy();
  });

  it("keeps the full stop in its word item and one tap button per word", async () => {
    // Named characterization (fact M5): the punctuation already shares the flex item of its word.
    const week = shippedWeek();
    const sourceText = week.books.find((entry) => entry.kind === "decodable")!.pages[0]!.text!;
    const { container } = await renderDecodable(structuredClone(week));
    const paragraph = sentenceParagraph(container);
    const text = paragraph.textContent ?? "";
    expect(text, "the sentence must hold no space before the full stop").not.toMatch(/ \./);

    const items = [...paragraph.children];
    const stopItem = items.find((item) => (item.textContent ?? "").endsWith("."));
    expect(stopItem, "the full stop must sit in one flex item with its word").toBeTruthy();
    expect(
      stopItem!.querySelectorAll("button"),
      "the full-stop item must hold only its own word",
    ).toHaveLength(1);
    expect(
      items.some((item) => (item.textContent ?? "") === "."),
      "the full stop must not be its own flex item",
    ).toBe(false);

    const words = sourceText.match(WORD_RE) ?? [];
    expect(words.length, "the shipped page must hold words").toBeGreaterThan(0);
    expect(
      [...paragraph.querySelectorAll("button")],
      "each word must keep exactly one tap button",
    ).toHaveLength(words.length);
  });

  it("ships no upper-case transform in the app or lib source", async () => {
    await loadDecodable();
    const offenders: string[] = [];
    for (const path of [...sourceFiles(resolve(app, "app")), ...sourceFiles(resolve(app, "lib"))]) {
      const stripped = stripComments(readFileSync(path, "utf8"));
      for (const match of stripped.matchAll(/toUpperCase|toLocaleUpperCase|text-transform|\buppercase\b/g)) {
        const line = stripped.slice(0, match.index).split("\n").length;
        offenders.push(`${path.slice(app.length + 1)}:${line}`);
      }
    }
    expect(
      offenders,
      "no upper-case transform may stay in the app or lib source (AC-1.3)",
    ).toEqual([]);
    // The detector must catch a call and ignore a comment, or it is vacuous.
    const detect = (source: string) =>
      [...stripComments(source).matchAll(/toUpperCase|toLocaleUpperCase|text-transform|\buppercase\b/g)]
        .length;
    expect(detect("const word = text.toUpperCase();"), "the detector must catch a toUpperCase call").toBe(1);
    expect(detect("// text.toUpperCase() sits in a comment"), "the detector must ignore a comment").toBe(0);
  });
});
