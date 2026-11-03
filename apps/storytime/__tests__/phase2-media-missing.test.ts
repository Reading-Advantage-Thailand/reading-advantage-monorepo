// Review A F2 (round 5, 2026-11-02): the shipped pages hold an image entry with no file, so the
// receiver must list each page picture without a file as a missing item, with its book kind and
// page number. The test reads the shipped week files only.
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, "..");
const root = resolve(app, "../..");
const weekDirectory = resolve(app, "content", "l2");

/** One media entry of the receiving step. */
interface MediaItem {
  file: string;
  kind: string;
  rule: string;
  missing?: string;
}

/** The result of the receiving step for one week. */
interface ReceivedWeek {
  path: string;
  contents: string;
  media: MediaItem[];
}

/** One book page of a week. */
interface WeekPage {
  image?: { file?: string; prompt?: string } & Record<string, unknown>;
}

/** One book of a week. */
interface WeekBook {
  kind: string;
  pages: WeekPage[];
}

/**
 * Loads the receiving step and picks its week function.
 * @returns The function that receives one week.
 */
async function loadReceiveWeek(): Promise<(week: unknown) => ReceivedWeek> {
  const path = resolve(app, "scripts/receive-weeks.ts");
  expect(existsSync(path), "Missing receiving step: apps/storytime/scripts/receive-weeks.ts").toBe(
    true,
  );
  const loaded = (await import(/* @vite-ignore */ path)) as Record<string, unknown>;
  const receiveWeek = loaded["receiveWeek"];
  expect(receiveWeek, "The receiving step exports no receiveWeek").toBeTypeOf("function");
  return receiveWeek as (week: unknown) => ReceivedWeek;
}

/**
 * Reads a shipped week file.
 * @param file The file name inside apps/storytime/content/l2.
 * @returns The parsed week.
 */
function readWeek(file: string): { books: WeekBook[] } {
  const path = resolve(weekDirectory, file);
  expect(existsSync(path), `Missing handed-off week: ${relative(root, path)} (task 2.1)`).toBe(
    true,
  );
  return JSON.parse(readFileSync(path, "utf8")) as { books: WeekBook[] };
}

/**
 * Counts the pages that hold an image entry without a file.
 * @param week The week.
 * @returns The count.
 */
function pagesWithImageNoFile(week: { books: WeekBook[] }): number {
  return week.books.reduce(
    (count, book) =>
      count + book.pages.filter((page) => page.image && !page.image.file).length,
    0,
  );
}

describe("Review A F2 the page pictures without a file are missing items", () => {
  it("lists every page picture of the published week that has no file as missing", async () => {
    const receiveWeek = await loadReceiveWeek();
    const week = readWeek("w01.json");
    const result = receiveWeek(week);
    const missing = result.media.filter(
      (item) => item.missing !== undefined && item.kind === "book-page-picture",
    );
    const expected = pagesWithImageNoFile(week);
    expect(
      missing.length,
      `The media list holds ${missing.length} missing items, and the week has ${expected} pages with an image and no file (A4)`,
    ).toBe(expected);
    for (const item of missing) {
      expect(item.kind, `The missing item ${item.file} names no kind`).toBe("book-page-picture");
      expect(item.rule, `The missing item ${item.file} names no rule`).toBeTruthy();
      expect(
        item.missing,
        `The missing item ${item.file} names no page: ${item.missing}`,
      ).toMatch(/page \d+ of the .+ book/);
    }
  });

  it("lists a page with an image entry and no file as missing", async () => {
    const receiveWeek = await loadReceiveWeek();
    const week = readWeek("w01.json");
    week.books[0]!.pages[0]!.image = { prompt: "a cat" };
    const result = receiveWeek(week);
    const item = result.media.find((entry) => entry.missing?.includes("page 1 of the"));
    expect(item, "The page with an image entry and no file is not listed as missing").toBeDefined();
    expect(item!.kind).toBe("book-page-picture");
  });

  it("lists a page picture with a file as a normal media item", async () => {
    const receiveWeek = await loadReceiveWeek();
    const week = readWeek("w01.json");
    week.books[0]!.pages[0]!.image = { prompt: "a cat", file: "l2/media/w01/pages/1.jpg" };
    const result = receiveWeek(week);
    const item = result.media.find((entry) => entry.file === "l2/media/w01/pages/1.jpg");
    expect(item, "The page picture with a file is not in the media list").toBeDefined();
    expect(item!.missing, "The page picture with a file is marked missing").toBeUndefined();
  });
});

describe("Round 6 F9 and F27 the missing list covers every picture entry", () => {
  it("lists a cover and a family-word picture with an image entry and no file as missing", async () => {
    const receiveWeek = await loadReceiveWeek();
    const week = readWeek("w01.json") as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    week.books[0].cover = { prompt: "a cover" };
    week.focus.family = { words: [{ word: "tap", image: { prompt: "a tap" } }], max: 8 };
    const media = receiveWeek(week).media;
    const cover = media.find((item) => item.file === "books.0.cover");
    expect(cover?.missing, "The cover without a file is not listed as missing").toMatch(/cover of the .+ book/);
    expect(cover?.file).toBe("books.0.cover");
    const family = media.find((item) => item.kind === "family-word-picture");
    expect(family?.missing, "The family picture without a file is not listed as missing").toMatch(/tap/);
    expect(family?.file).toBe("focus.family.words.0.image");
  });

  it("lists a cover and a family-word picture with a file as normal items", async () => {
    const receiveWeek = await loadReceiveWeek();
    const week = readWeek("w01.json") as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    week.books[0].cover = { file: "covers/one.png" };
    week.focus.family = { words: [{ word: "tap", image: { file: "words/tap.png" } }], max: 8 };
    const media = receiveWeek(week).media;
    for (const file of ["covers/one.png", "words/tap.png"]) {
      const item = media.find((entry) => entry.file === file);
      expect(item, `${file} is not in the media list`).toBeDefined();
      expect(item!.missing).toBeUndefined();
    }
  });

  it("keeps a missing picture when a real file has the name of its field path (F27)", async () => {
    const receiveWeek = await loadReceiveWeek();
    const week = readWeek("w01.json") as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    week.books[0].cover = { file: "books.0.pages.0.image" };
    week.books[0].pages[0].image = { prompt: "page one" };
    const media = receiveWeek(week).media;
    const same = media.filter((item) => item.file === "books.0.pages.0.image");
    expect(same.map((item) => item.missing === undefined)).toEqual(expect.arrayContaining([true, false]));
    expect(same.find((item) => item.missing)?.kind).toBe("book-page-picture");
    expect(same.find((item) => !item.missing)?.kind).toBe("book-cover");
  });
});
