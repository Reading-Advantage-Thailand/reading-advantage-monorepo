// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
// The media of a week now comes from the signed map of the page. The mock keeps the old URLs of
// the test, so the assertions of this file stay unchanged.
vi.mock("../lib/media/url", () => ({
  mediaUrl: (_mediaUrls: Record<string, string>, file: string) =>
    `https://storage.googleapis.com/storytime-app-media/${file}`,
}));

// The page signs the media of the week after the session check. The mock keeps the old URLs of
// the test, so the assertions of this file stay unchanged.
vi.mock("../lib/media/sign", () => ({
  signWeekMedia: async () => ({}),
}));

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import week from "../content/l2/w01.json";



/**
 * The Red tests of the loops-off rule of the at-home app (plan task 3.9, AC-13.8).
 *
 * The question screen must not show for a week with no loop field, for a week with no
 * `approval.loops` part, for a draft week, and for an approved week at level 1. The read-along
 * must play as before on each of those weeks.
 *
 * The rule module does not exist yet. The tests name the module and the export that Green adds:
 * `apps/storytime/lib/questions.ts` with `questionScreenShows`.
 */

const app = resolve(import.meta.dirname, "..");
const routePath = resolve(app, "app/[locale]/st/[level]/[week]/page.tsx");
const route = readFileSync(routePath, "utf8");

/** One question of a read-along book, as the week data holds it. */
interface Question {
  kind: string;
  ask: { en: string; th: string };
  answer: { page: number; word: string };
}

/** One page of a book, as the week data holds it. */
interface Page {
  text: string;
  image?: { file?: string; caption?: string };
}

/** One book of a week, as the week data holds it. */
interface Book {
  kind: string;
  pages: Page[];
  questions?: Question[];
}

/** The parts of a week that the question screen reads. */
interface WeekShape {
  meta: { level: number; week: number; key: string; status: string };
  books: Book[];
  approval?: Record<string, { status: string; date?: string; words?: string } | undefined>;
}

/** The labels of the reader controls. */
const readerLabels = {
  readToMe: "Read it to me",
  myTurn: "My turn",
  slow: "Slow",
  previousPage: "Previous page",
  nextPage: "Next page",
  audioError: "Sound could not be played",
  finished: "Book finished",
};

/** The date of an approved loops part in a test copy. */
const approvalDate = "2026-11-04";

/** The approval words of an approved loops part in a test copy. */
const approvalWords = '"Loops approved" (2026-11-04)';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Creates a copy of the shipped week and leaves the shipped file alone. */
function weekCopy(source = week): WeekShape {
  return structuredClone(source) as unknown as WeekShape;
}

/** Sets the loops part of a week copy. */
function setLoops(copy: WeekShape, loops: { status: string; date?: string; words?: string }): void {
  const approval = { ...(copy.approval ?? {}) };
  approval.loops = loops;
  copy.approval = approval;
}

/** Creates a copy of the shipped week with an approved loops part. */
function approvedWeek(source = week): WeekShape {
  const copy = weekCopy(source);
  setLoops(copy, { status: "approved", date: approvalDate, words: approvalWords });
  return copy;
}

/** Creates a copy of the shipped week with a draft loops part. */
function draftWeek(source = week): WeekShape {
  const copy = weekCopy(source);
  setLoops(copy, { status: "draft" });
  return copy;
}

/** Creates a copy of the shipped week with no loops part. */
function weekWithoutLoops(source = week): WeekShape {
  const copy = weekCopy(source);
  for (const book of copy.books) delete book.questions;
  const approval = { ...(copy.approval ?? {}) };
  delete approval.loops;
  copy.approval = approval;
  return copy;
}

/** Creates a copy of the shipped week with no approval part. */
function weekWithoutApproval(source = week): WeekShape {
  const copy = weekCopy(source);
  delete copy.approval;
  return copy;
}

/** Reads the read-along book of a week copy. */
function readAlongBook(copy: WeekShape): Book {
  const book = copy.books.find((entry) => entry.kind === "readalong");
  expect(book, "the shipped week must include a read-along book").toBeDefined();
  return book as Book;
}

/** Loads the question rule module and reports a missing implementation as an assertion. */
async function loadRule() {
  const modulePath = "../lib/questions";
  try {
    return await import(/* @vite-ignore */ modulePath);
  } catch (error) {
    expect(
      error,
      "Storytime must add the question rule module at apps/storytime/lib/questions.ts",
    ).toBeUndefined();
    throw error;
  }
}

/** Loads the client reader and reports a missing implementation as an assertion. */
async function loadReader() {
  const modulePath = "../app/[locale]/st/[level]/[week]/reader";
  try {
    return (await import(/* @vite-ignore */ modulePath)).StorytimeReader;
  } catch (error) {
    expect(error, "Storytime must keep the client reader at the documented path").toBeUndefined();
    throw error;
  }
}

describe("Phase 3 Storytime loops-off rule", () => {
  it("shows the question screen for an approved week at level 2", async () => {
    const rule = await loadRule();
    const copy = approvedWeek();
    expect(
      rule.questionScreenShows(copy, 2),
      "the question screen must show for an approved week at level 2",
    ).toBe(true);
  });

  it("shows no question screen for a week with no loop field", async () => {
    const rule = await loadRule();
    const copy = weekWithoutLoops();
    expect(
      rule.questionScreenShows(copy, 2),
      "the question screen must not show for a week with no loop field",
    ).toBe(false);
  });

  it("shows no question screen for a week with no approval part", async () => {
    const rule = await loadRule();
    const copy = weekWithoutApproval();
    expect(
      rule.questionScreenShows(copy, 2),
      "the question screen must not show for a week with no approval part",
    ).toBe(false);
  });

  it("shows no question screen when the approval part has no loops part", async () => {
    const rule = await loadRule();
    const copy = weekCopy();
    const approval = { ...(copy.approval ?? {}) };
    delete approval.loops;
    copy.approval = approval;
    expect(
      rule.questionScreenShows(copy, 2),
      "the question screen must not show when approval.loops is absent",
    ).toBe(false);
  });

  it("shows no question screen for a draft week", async () => {
    const rule = await loadRule();
    const copy = draftWeek();
    expect(
      rule.questionScreenShows(copy, 2),
      "the question screen must not show for a draft week",
    ).toBe(false);
  });

  it("shows no question screen for an approved week at level 1", async () => {
    const rule = await loadRule();
    const copy = approvedWeek();
    copy.meta.level = 1;
    copy.meta.key = "st1/1";
    expect(
      rule.questionScreenShows(copy, 1),
      "the question screen must not show for an approved week at level 1",
    ).toBe(false);
  });

  it("shows the question screen for an approved week at levels 2 to 4 only", async () => {
    const rule = await loadRule();
    const copy = approvedWeek();
    for (const level of [2, 3, 4]) {
      expect(
        rule.questionScreenShows(copy, level),
        `the question screen must show for an approved week at level ${level}`,
      ).toBe(true);
    }
    for (const level of [1, 5]) {
      expect(
        rule.questionScreenShows(copy, level),
        `the question screen must not show for an approved week at level ${level}`,
      ).toBe(false);
    }
  });

  it("turns the pages and ends the book as before on a week with the loops off", async () => {
    const Reader = await loadReader();
    const copy = draftWeek();
    const book = readAlongBook(copy);
    const { container } = render(<Reader book={book} locale="en" labels={readerLabels} />);
    const firstImage = container.querySelector("img")?.getAttribute("src");
    expect(firstImage, "the reader must show the picture of the first page").toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: readerLabels.nextPage }));
    // AC-1.5 (look track): a press on Next keeps the old page until the new picture loads, so the
    // test sends the load event of the new picture, the second img of the reader.
    fireEvent.load(container.querySelectorAll("img")[1]!);
    expect(
      container.querySelector("img")?.getAttribute("src"),
      "the reader must turn the page",
    ).not.toBe(firstImage);
    for (let index = 1; index < book.pages.length; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: readerLabels.nextPage }));
    }
    expect(
      screen.getByText(readerLabels.finished),
      "the reader must end the book as before",
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-choice-page]"),
      "a week with the loops off must show no question screen",
    ).toBeNull();
    expect(
      container.querySelector("[data-question-screen]"),
      "a week with the loops off must show no question screen",
    ).toBeNull();
  });

  it("gates the question screen in the week page", () => {
    expect(
      route,
      "the week page must gate the question screen with the question rule",
    ).toMatch(/questionScreenShows/);
  });
});
