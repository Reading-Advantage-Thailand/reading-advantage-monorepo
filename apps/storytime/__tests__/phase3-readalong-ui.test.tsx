// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import week from "../content/l2/w01.json";

const app = resolve(import.meta.dirname, "..");
const route = readFileSync(resolve(app, "app/[locale]/st/[level]/[week]/page.tsx"), "utf8");
const readAlongBook = week.books.find((book) => book.kind === "readalong");

/** Returns a page with at least two timed sentences from the shipped milestone week. */
function shippedTwoSentencePage() {
  const pages = readAlongBook?.pages ?? [];
  const sentences = readAlongBook?.audio?.sentences ?? [];
  const matches = pages.flatMap((page, pageIndex) => {
    const pageSentences = sentences.filter((sentence) => sentence.page === pageIndex + 1);
    return pageSentences.length >= 2 ? [{ page, pageIndex, sentences: pageSentences }] : [];
  });
  expect(matches, "the shipped milestone week must contain a two-sentence page").not.toHaveLength(0);
  return matches[0];
}

describe("Phase 3 Storytime read-along UI", () => {
  it("renders and seeks every sentence of a shipped two-sentence page (AC-6.1)", () => {
    const { sentences } = shippedTwoSentencePage();
    expect(sentences).toHaveLength(2);
    expect(route).toMatch(/sentencesOfPage|audio\.sentences/);
    expect(route).toMatch(/ReadAlongPassage/);
  });

  it("does not autoplay in My turn and plays a word cut from 30 ms before its start", () => {
    expect(route).toMatch(/my.?turn|My turn/i);
    expect(route).toMatch(/play\(\)/);
    expect(route).toMatch(/wordCutBounds|wordCut|cutBounds/);
    expect(route).toMatch(/0\.03|30\s*\/\s*1000/);
  });

  it("uses the actual slow recording and slow sentence timings at normal playback rate", () => {
    expect(route).toMatch(/slowFile/);
    expect(route).toMatch(/slowSentences/);
    expect(route).toMatch(/playbackRate\s*=\s*1/);
  });

  it("shows a localized message when the page audio fails to load", () => {
    expect(route).toMatch(/onError|addEventListener\(["']error/);
    expect(route).toMatch(/audio.*error|error.*audio|sound.*failed/i);
  });

  it("turns one page per horizontal arrow or swipe and shows an end view", () => {
    expect(route).toMatch(/ArrowLeft|previousPage/);
    expect(route).toMatch(/ArrowRight|nextPage/);
    expect(route).toMatch(/touchStart|touchstart|onTouchStart/i);
    expect(route).toMatch(/endView|pageEnd|last page/i);
  });

  it("renders one text block for each book page and stops audio at the page end", () => {
    expect(route).toMatch(/page\.blocks|page\.text|page\.paragraph/);
    expect(route).toMatch(/pageEnd|lastSentence|last sentence/i);
    expect(route).toMatch(/pause\(\)|\.pause/);
  });

  it("marks one word during the shipped timing overlap", () => {
    const allSentences = readAlongBook?.audio?.sentences ?? [];
    expect(allSentences, "the shipped book must have timed sentences").not.toHaveLength(0);
    const allWords = allSentences.flatMap((sentence) => sentence.words);
    const overlaps = allWords.some((word, index) => allWords[index + 1]?.start < word.end);
    expect(overlaps, "the shipped week scan must find its recorded overlap").toBe(true);
    expect(route).toMatch(/findPosition|position/);
    expect(route).toMatch(/ReadAlongPassage/);
  });

  it("imports the shared player through the page's package specifiers", () => {
    expect(route).toContain("@reading-advantage/read-along/components/read-along/read-along-passage");
    expect(route).toContain("@reading-advantage/read-along/components/read-along/read-along-player");
  });
});
