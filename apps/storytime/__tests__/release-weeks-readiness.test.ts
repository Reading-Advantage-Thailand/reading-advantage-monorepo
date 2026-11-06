// @vitest-environment node
/**
 * The readiness of the weeks of the at-home release (plan task 1.3, strategy P1.1, cases W1 to W6).
 *
 * The file reads the shipped week files and runs the loader of the app on them. No week fixture
 * file sits under `__tests__`. A broken copy is a deep clone of a shipped week with one change,
 * made inside the test. A clone runs through the loader in a temporary content folder under the
 * temp folder of the system.
 *
 * The pictures case and the teacher lines case fail at the old pin and pass at the release pin.
 * The other cases hold at both pins. Each broken copy case proves that the check of its case
 * detects the change.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadVisibleWeek } from "../lib/content";
import { isWeekReady, missingPagePictures, readinessBlocker } from "../lib/readiness";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentDirectory = resolve(app, "content");
const weekDirectory = resolve(contentDirectory, "l2");

/** The weeks of the release that stay draft, from 2 to 8. */
const DRAFT_WEEKS = [2, 3, 4, 5, 6, 7, 8];

/** The draft weeks that hold their page pictures at the release pin, from 2 to 7. */
const PICTURE_WEEKS = [2, 3, 4, 5, 6, 7];

/** The teacher line of the r2 hand-off, in English. */
const COLOR_OWN_BOOK_EN = "Each child colors their own book.";

/** The teacher line of the r2 hand-off, in Thai. */
const COLOR_OWN_BOOK_TH = "เด็ก ๆ ระบายสีหนังสือเล่มเล็กของตัวเอง";

/** The teacher line that the r2 hand-off replaces. */
const OLD_PAIR_BOOKS = "books (one for each pair)";

/** A week as plain JSON, for a broken copy. */
interface Json {
  meta: { status: string; [key: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const previousContentDir = process.env.STORYTIME_CONTENT_DIR;
const previousDraftSwitch = process.env.STORYTIME_SHOW_DRAFT_MEDIA;

beforeEach(() => {
  delete process.env.STORYTIME_CONTENT_DIR;
  delete process.env.STORYTIME_SHOW_DRAFT_MEDIA;
});

afterEach(() => {
  if (previousContentDir === undefined) delete process.env.STORYTIME_CONTENT_DIR;
  else process.env.STORYTIME_CONTENT_DIR = previousContentDir;
  if (previousDraftSwitch === undefined) delete process.env.STORYTIME_SHOW_DRAFT_MEDIA;
  else process.env.STORYTIME_SHOW_DRAFT_MEDIA = previousDraftSwitch;
  vi.restoreAllMocks();
});

/**
 * Reads a shipped week file.
 * @param week The week of the level.
 * @returns The parsed week.
 */
function readShippedWeek(week: number): Json {
  const path = resolve(weekDirectory, `w${String(week).padStart(2, "0")}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

/**
 * Loads one shipped week with the loader of the app and records its log lines.
 * @param week The week of the level.
 * @returns The visible week and the log lines of the loader.
 */
async function loadShipped(
  week: number,
): Promise<{ visible: Awaited<ReturnType<typeof loadVisibleWeek>>; warnings: string[] }> {
  process.env.STORYTIME_CONTENT_DIR = contentDirectory;
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const visible = await loadVisibleWeek(2, week);
  const warnings = warn.mock.calls.map((call) => String(call[0]));
  warn.mockRestore();
  return { visible, warnings };
}

/**
 * Loads one clone with the loader of the app and records its log lines.
 *
 * The clone sits in a temporary content folder. The loader reads that folder, not the shipped one.
 * @param week The week of the level.
 * @param clone The clone to load.
 * @returns The visible week and the log lines of the loader.
 */
async function loadClone(
  week: number,
  clone: Json,
): Promise<{ visible: Awaited<ReturnType<typeof loadVisibleWeek>>; warnings: string[] }> {
  const directory = mkdtempSync(resolve(tmpdir(), "storytime-release-weeks-"));
  try {
    const level = resolve(directory, "l2");
    mkdirSync(level, { recursive: true });
    writeFileSync(resolve(level, `w${String(week).padStart(2, "0")}.json`), JSON.stringify(clone));
    process.env.STORYTIME_CONTENT_DIR = directory;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const visible = await loadVisibleWeek(2, week);
    const warnings = warn.mock.calls.map((call) => String(call[0]));
    warn.mockRestore();
    return { visible, warnings };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/**
 * Counts the teacher lines of one language that equal a text.
 * @param week The week.
 * @param language The language of the teacher note.
 * @param text The text of the teacher line.
 * @returns The number of teacher lines with that text.
 */
function countTeacherLines(week: Json, language: "en" | "th", text: string): number {
  let count = 0;
  for (const script of week.scripts ?? []) {
    for (const step of script.steps ?? []) {
      const note = step[language];
      for (const action of note?.studentActions ?? []) {
        if (String(action).trim() === text) count += 1;
      }
    }
  }
  return count;
}

/**
 * Counts the times that a text appears in the scripts of a week.
 * @param week The week.
 * @param text The text to count.
 * @returns The number of appearances.
 */
function countInScripts(week: Json, text: string): number {
  return JSON.stringify(week.scripts ?? []).split(text).length - 1;
}

/**
 * Gives every page of a clone a picture file, so that the clone holds no missing picture.
 * @param clone The clone.
 * @returns The clone.
 */
function withPageFiles(clone: Json): Json {
  for (const book of clone.books ?? []) {
    for (const page of book.pages ?? []) {
      if (page.image) page.image.file = `review/${book.kind}-page.webp`;
    }
  }
  return clone;
}

describe("AC-1.3 the draft weeks of the release stay at 404", () => {
  it("keeps every draft week out of the app and names the draft reason", async () => {
    const weeks = DRAFT_WEEKS.map((week) => readShippedWeek(week));
    expect(weeks.length, "The test must read seven draft weeks (A4)").toBe(7);
    let checked = 0;
    for (const [index, week] of weeks.entries()) {
      const number = DRAFT_WEEKS[index];
      expect(week.meta.status, `The shipped week ${number} is not a draft`).toBe("draft");
      expect(isWeekReady(week), `The shipped week ${number} must not be ready`).toBe(false);
      const { visible, warnings } = await loadShipped(number);
      expect(visible, `The shipped week ${number} must not reach a child`).toBeNull();
      expect(warnings, `The loader must log one line for the week ${number}`).toEqual([
        `storytime week st2/${number} blocked: draft`,
      ]);
      checked += 1;
    }
    expect(checked, "The test must check seven draft weeks (A4)").toBeGreaterThan(0);
    expect(`weeks_checked=${checked}`, "The loader must check the seven draft weeks").toBe(
      "weeks_checked=7",
    );
  });

  it("does not call a published clone a draft week", async () => {
    const clone = withPageFiles(structuredClone(readShippedWeek(2)));
    clone.meta.status = "published";
    const { warnings } = await loadClone(2, clone);
    expect(
      warnings.some((line) => line.includes("blocked: draft")),
      "A published clone must not log the draft reason",
    ).toBe(false);
  });
});

describe("AC-1.3 the eighth week of the release stays a draft", () => {
  it("w08 is received at the new pin and stays draft", async () => {
    const week = readShippedWeek(8);
    expect(week.books.length, "The shipped w08 must hold no book").toBe(0);
    expect(week.meta.status, "The shipped w08 is not a draft").toBe("draft");
    const { visible, warnings } = await loadShipped(8);
    expect(visible, "The shipped w08 must not reach a child").toBeNull();
    expect(warnings, "The loader must log the draft reason for the w08").toEqual([
      "storytime week st2/8 blocked: draft",
    ]);
  });

  it("names the missing picture reason for a published w08 that holds no book", () => {
    const clone = structuredClone(readShippedWeek(8));
    clone.meta.status = "published";
    expect(
      readinessBlocker(clone),
      "A published week that holds no book must name the missing picture reason",
    ).toBe("missing_picture");
  });
});

describe("AC-1.3 the draft weeks of the release hold their page pictures", () => {
  it("gives every page of every draft week its picture file", () => {
    const weeks = PICTURE_WEEKS.map((week) => readShippedWeek(week));
    expect(weeks.length, "The test must read six draft weeks (A4)").toBe(6);
    let pagesWithFile = 0;
    for (const [index, week] of weeks.entries()) {
      const number = PICTURE_WEEKS[index];
      expect(week.books.length, `The shipped week ${number} must hold two books`).toBe(2);
      for (const book of week.books) {
        expect(book.pages.length, `A book of the week ${number} must hold eight pages`).toBe(8);
        for (const page of book.pages) {
          expect(
            typeof page.image?.file === "string" && page.image.file.length > 0,
            `A page of the week ${number} holds no picture file`,
          ).toBe(true);
          pagesWithFile += 1;
        }
        expect(
          typeof book.cover?.file === "string" && book.cover.file.length > 0,
          `A cover of the week ${number} holds no picture file`,
        ).toBe(true);
      }
      expect(
        missingPagePictures(week).length,
        `The shipped week ${number} holds a page without a picture file`,
      ).toBe(0);
    }
    expect(pagesWithFile, "The test must read the pages of six draft weeks (A4)").toBeGreaterThan(0);
    expect(
      `pages_with_file=${pagesWithFile}`,
      "The six draft weeks must hold 96 pages with a picture file",
    ).toBe("pages_with_file=96");
  });

  it("counts one missing page picture when a clone loses one page file", () => {
    const clone = withPageFiles(structuredClone(readShippedWeek(3)));
    expect(clone.books.length, "The clone must hold two books (A4)").toBe(2);
    expect(
      missingPagePictures(clone).length,
      "A clone with a file on every page must hold no missing picture",
    ).toBe(0);
    delete clone.books[0].pages[0].image.file;
    expect(
      missingPagePictures(clone).length,
      "A clone that lost one page file must count one missing picture",
    ).toBe(1);
  });
});

describe("AC-1.3 the review switch does not open a draft week", () => {
  it("keeps every draft week out of the app when the review switch is on", async () => {
    process.env.STORYTIME_SHOW_DRAFT_MEDIA = "1";
    const weeks = DRAFT_WEEKS.map((week) => readShippedWeek(week));
    expect(weeks.length, "The test must read seven draft weeks (A4)").toBe(7);
    let checked = 0;
    for (const [index, week] of weeks.entries()) {
      const number = DRAFT_WEEKS[index];
      expect(week.meta.status, `The shipped week ${number} is not a draft`).toBe("draft");
      const { visible, warnings } = await loadShipped(number);
      expect(visible, `The shipped week ${number} must not reach a child`).toBeNull();
      expect(warnings, `The loader must log one line for the week ${number}`).toEqual([
        `storytime week st2/${number} blocked: draft`,
      ]);
      checked += 1;
    }
    expect(checked, "The test must check seven draft weeks (A4)").toBeGreaterThan(0);
    expect(`weeks_checked=${checked}`, "The loader must check the seven draft weeks").toBe(
      "weeks_checked=7",
    );
  });

  it("opens the draft media of a published week when the review switch is on", async () => {
    const clone = withPageFiles(structuredClone(readShippedWeek(1)));
    clone.approval.audio.status = "draft";
    const closed = await loadClone(1, clone);
    expect(closed.visible, "A published week with a draft media part must stay out of the app").toBeNull();
    expect(
      closed.warnings.join(" "),
      "The loader must name the media part that is not approved",
    ).toContain("media_not_approved (audio)");
    process.env.STORYTIME_SHOW_DRAFT_MEDIA = "1";
    const open = await loadClone(1, clone);
    expect(open.visible, "The review switch must show the draft media of a published week").not.toBeNull();
  });
});

describe("AC-1.4 the first week of the release is ready", () => {
  it("keeps the first week ready for a child", async () => {
    const week = readShippedWeek(1);
    expect(week.meta.status, "The shipped w01 is not published").toBe("published");
    expect(isWeekReady(week), "The shipped w01 must be ready").toBe(true);
    const { visible } = await loadShipped(1);
    expect(visible, "The shipped w01 must reach a child").not.toBeNull();
  });

  it("names the missing picture reason for a clone that lost one page file", async () => {
    const clone = structuredClone(readShippedWeek(1));
    expect(clone.books.length, "The clone must hold two books (A4)").toBe(2);
    delete clone.books[0].pages[0].image.file;
    const { visible, warnings } = await loadClone(1, clone);
    expect(visible, "A week without a picture file must stay out of the app").toBeNull();
    expect(warnings.join(" "), "The loader must name the missing picture reason").toContain(
      "blocked: missing_picture",
    );
  });
});

describe("AC-1.4 the first week of the release holds the r2 teacher lines", () => {
  it("holds the color own book teacher lines and no old pair books line", () => {
    const week = readShippedWeek(1);
    expect(week.scripts.length, "The shipped w01 must hold its scripts (A4)").toBeGreaterThan(0);
    const english = countTeacherLines(week, "en", COLOR_OWN_BOOK_EN);
    const thai = countTeacherLines(week, "th", COLOR_OWN_BOOK_TH);
    expect(`color_own_book_en=${english}`, "The w01 must hold two English teacher lines").toBe(
      "color_own_book_en=2",
    );
    expect(`color_own_book_th=${thai}`, "The w01 must hold two Thai teacher lines").toBe(
      "color_own_book_th=2",
    );
    const old = countInScripts(week, OLD_PAIR_BOOKS);
    expect(`old_pair_books=${old}`, "The w01 must hold no old pair books line").toBe(
      "old_pair_books=0",
    );
    expect(week.approval.print?.status, "The print approval of the w01 is not approved").toBe(
      "approved",
    );
    expect(
      String(week.approval.thai?.words ?? ""),
      "The Thai approval of the w01 names no color own book words",
    ).toContain("color-own-book");
  });

  it("counts the old pair books line when a clone holds it again", () => {
    const clone = structuredClone(readShippedWeek(1));
    expect(clone.scripts.length, "The clone must hold its scripts (A4)").toBeGreaterThan(0);
    clone.scripts[0].steps[0].en.studentActions.push(OLD_PAIR_BOOKS);
    const old = countInScripts(clone, OLD_PAIR_BOOKS);
    expect(old, "A clone that holds the old line must count it").toBeGreaterThan(0);
  });
});
