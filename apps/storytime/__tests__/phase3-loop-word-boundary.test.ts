// @vitest-environment node
// Finding F132 (review-a A3-12) of the Phase 3 review at e9c1908fd: the loop question word
// check matches on a word boundary, so the answer word `at` no longer matches the page text
// `cat`. The fixture is a deep clone of the shipped w01 with the loops part approved.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as contract from "../lib/contracts/week";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** A week as plain JSON, for a broken copy. */
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Reads the shipped w01 and approves its loops part with one controlled question.
 *
 * Page 1 of the shipped book reads "Hello, I am Pat.", so the word `at` occurs only inside
 * the word `Pat`, and the word `Pat` occurs as a whole word.
 * @returns The week.
 */
function approvedWeek(): Json {
  const week = JSON.parse(readFileSync(resolve(app, "content/l2/w01.json"), "utf8")) as Json;
  week.approval.loops = { status: "approved", date: "2026-11-05", words: "review fixture" };
  week.books[0].questions = [
    {
      kind: "who",
      ask: { en: "Who is it?", th: "ใครคือใคร?" },
      answer: { page: 1, word: "Pat" },
    },
    {
      kind: "what",
      ask: { en: "What is it?", th: "นี่คืออะไร?" },
      answer: { page: 1, word: "Hello" },
    },
    {
      kind: "where",
      ask: { en: "Where is it?", th: "อยู่ที่ไหน?" },
      answer: { page: 1, word: "am" },
    },
  ];
  return week;
}

describe("the loop question word check matches on a word boundary (F132)", () => {
  it("accepts an approved question whose word the page holds as a whole word", () => {
    const week = approvedWeek();
    const parsed = contract.weekSchema.safeParse(week);
    expect(
      parsed.success,
      `The contract rejects an approved question word the page holds: ${parsed.success ? "" : parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
    ).toBe(true);
  });

  it("rejects an approved question whose word appears only inside a larger word", () => {
    const week = approvedWeek();
    const words = (week.books[0].pages[0].text as string)
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(Boolean);
    expect(words, "the fixture page must hold Pat as a word").toContain("pat");
    expect(words, "the fixture page must hold no standalone at").not.toContain("at");
    week.books[0].questions[1].answer.word = "at";
    const parsed = contract.weekSchema.safeParse(week);
    expect(
      parsed.success,
      "The contract must reject `at` when the page holds it only inside `Pat`",
    ).toBe(false);
    const paths = parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join("."));
    expect(paths, `The failure names no word field: ${paths.join("; ")}`).toContain(
      "books.0.questions.1.answer.word",
    );
  });
});
