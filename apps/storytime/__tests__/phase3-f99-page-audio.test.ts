// @vitest-environment node
// AC-13.5 and finding F99 of the Phase 3 test strategy (plan task 3.8).
// The tests read the shipped week files and clone them. A broken copy is a deep clone of a
// shipped week with one change class. No week file exists under __tests__.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { weekSchema } from "../lib/contracts/week";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const weekDirectory = resolve(app, "content", "l2");

/** A week as plain JSON, for a broken copy. */
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Reads a shipped week file.
 * @param file The file name inside apps/storytime/content/l2.
 * @returns The parsed week.
 */
function readWeek(file: string): Json {
  return JSON.parse(readFileSync(resolve(weekDirectory, file), "utf8")) as Json;
}

/**
 * Gives a clone of the published week.
 * @returns The clone.
 */
function publishedWeek(): Json {
  const week = structuredClone(readWeek("w01.json")) as Json;
  expect(week.meta.status, "The shipped week 1 must be the published week (task 2.1)").toBe(
    "published",
  );
  return week;
}

/**
 * Fails when a parse accepted a broken copy, and gives the issues of the failure.
 * @param week The broken copy.
 * @param label The name of the broken copy.
 * @returns The joined issue lines of the failure.
 */
function expectRejected(week: Json, label: string): string {
  const parsed = weekSchema.safeParse(week);
  expect(parsed.success, `The contract accepts ${label}`).toBe(false);
  const issues = parsed.success ? [] : parsed.error.issues;
  const paths = issues.map((issue) => issue.path.join("."));
  expect(paths.length, `The failure of ${label} has no field path (rule 11.1)`).toBeGreaterThan(0);
  expect(
    paths.every((path) => path.length > 0),
    `The failure of ${label} has an empty field path: ${paths.join(" | ")}`,
  ).toBe(true);
  return issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}

/**
 * Tells whether a parse accepted the week.
 * @param week The week.
 * @param label The name of the week.
 * @returns The issue lines of a failure, or an empty text.
 */
function failureOf(week: Json, label: string): string {
  const parsed = weekSchema.safeParse(week);
  expect(
    parsed.success,
    `The contract rejects ${label}: ${parsed.success ? "" : parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
  ).toBe(true);
  return "";
}

describe("AC-13.5 the page-audio coverage check", () => {
  it("accepts the shipped published week", () => {
    failureOf(publishedWeek(), "the shipped published week");
  });

  it("rejects a book whose sentences hold a page on some sentences only", () => {
    const week = publishedWeek();
    const sentences = week.books[0].audio.sentences as Json[];
    expect(sentences.length, "The published week must hold book sentences (A4)").toBeGreaterThan(1);
    delete sentences[1].page;
    const failure = expectRejected(week, "a book whose sentences hold a page on some sentences only");
    expect(failure, `The failure names no page field: ${failure}`).toContain(
      "books.0.audio.sentences.1.page",
    );
  });

  it("rejects a book whose slow sentences hold a sentence without a page", () => {
    const week = publishedWeek();
    const sentences = week.books[0].audio.slowSentences as Json[];
    expect(sentences.length, "The published week must hold slow sentences (A4)").toBeGreaterThan(0);
    delete sentences[0].page;
    const failure = expectRejected(week, "a book whose slow sentences hold a sentence without a page");
    expect(failure, `The failure names no page field: ${failure}`).toContain(
      "books.0.audio.slowSentences.0.page",
    );
  });

  it("rejects a book whose sentences hold no page at all", () => {
    const week = publishedWeek();
    for (const sentence of week.books[0].audio.sentences as Json[]) delete sentence.page;
    for (const sentence of week.books[0].audio.slowSentences as Json[]) delete sentence.page;
    const failure = expectRejected(week, "a book whose sentences hold no page at all");
    expect(failure, `The failure names no page field: ${failure}`).toContain("audio.sentences");
    expect(failure, `The failure names no page field: ${failure}`).toContain("audio.slowSentences");
  });

  it("accepts a published book with an empty sentences list", () => {
    const week = publishedWeek();
    week.books[0].audio.sentences = [];
    failureOf(week, "a published book with an empty sentences list");
  });

  it("keeps the page-audio check for every published book of the week", () => {
    const week = publishedWeek();
    const books = week.books as Json[];
    expect(books.length, "The published week must hold two books (A4)").toBe(2);
    for (const sentence of books[1].audio.sentences as Json[]) delete sentence.page;
    const failure = expectRejected(week, "a published decodable whose sentences hold no page");
    expect(failure, `The failure names no page field: ${failure}`).toContain("books.1.audio.sentences");
  });

  it("leaves a draft week out of the page-audio check", () => {
    const week = publishedWeek();
    week.meta.status = "draft";
    for (const sentence of week.books[0].audio.sentences as Json[]) delete sentence.page;
    failureOf(week, "a draft week whose sentences hold no page");
  });
});

describe("F49 a new page needs a sentence in both timings", () => {
  it("rejects a ninth page with no sentence, and names the page", () => {
    const week = publishedWeek();
    const book = week.books[0];
    const pages = book.pages as Json[];
    const first = pages[0];
    book.pages = [...pages, { text: "Hello, I am a new friend.", image: { ...first.image } }];
    const failure = expectRejected(week, "a ninth page with no sentence");
    expect(failure, `The failure names no sentence list: ${failure}`).toContain(
      "books.0.audio.sentences",
    );
    expect(failure, `The failure names no sentence list: ${failure}`).toContain(
      "books.0.audio.slowSentences",
    );
    expect(failure, `The failure names no page number: ${failure}`).toContain("page 9");
  });
});
