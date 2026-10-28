// @vitest-environment node
// AC-3.1 and AC-3.2 of the Phase 2 test strategy. The tests read the shipped week files only.
// The week contract lives in apps/storytime/lib/contracts (plan task 2.2).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(app, "../..");
const weekDirectory = resolve(app, "content", "l2");
const WEEK_FILES = [
  "w01.json",
  "w02.json",
  "w03.json",
  "w04.json",
  "w05.json",
  "w06.json",
  "w07.json",
  "w08.json",
];

/** One sentence of a book audio. */
interface SentenceJson {
  sentence: string;
  startTime: number;
  endTime: number;
  page?: number;
  words: Array<{ word: string; start: number; end: number }>;
}

/** The parts of a week file that these tests read. */
interface WeekJson {
  version: number;
  meta: { status: string; level: number; week: number; title: string };
  books: Array<{
    kind: string;
    soundBook?: boolean;
    title: string;
    pages: Array<{ text: string; image?: unknown }>;
    audio?: { file?: string; slowFile?: string; sentences: SentenceJson[] };
  }>;
  focus: { element?: { graphemes: string[] }; trickyWords: string[] };
  tags: { taught: string[]; reviewed: string[] };
  [key: string]: unknown;
}

/** The result of a schema parse. */
interface ParseResult {
  success: boolean;
  data?: unknown;
  error?: { issues: Array<{ path: Array<string | number>; message: string }> };
}

/** A Zod-like week schema. */
interface WeekSchema {
  safeParse: (value: unknown) => ParseResult;
}

/**
 * Reads a shipped week file.
 * @param file The file name inside apps/storytime/content/l2.
 * @returns The parsed week.
 */
function readWeek(file: string): WeekJson {
  const path = resolve(weekDirectory, file);
  expect(existsSync(path), `Missing handed-off week: ${relative(root, path)} (task 2.1)`).toBe(true);
  return JSON.parse(readFileSync(path, "utf8")) as WeekJson;
}

/**
 * Reads the published week and clones it for a broken copy.
 * @returns The clone of the published week.
 */
function publishedWeek(): WeekJson {
  const week = readWeek("w01.json");
  expect(week.meta.status, "The shipped week 1 must be the published week (task 2.1)").toBe("published");
  return structuredClone(week);
}

/**
 * Tells whether a value is a Zod-like schema.
 * @param value The exported value.
 * @returns Whether the value parses with safeParse.
 */
function isSchema(value: unknown): value is WeekSchema {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { safeParse?: unknown }).safeParse === "function"
  );
}

/**
 * Loads the week contract from apps/storytime/lib/contracts.
 * @returns The week schema of the app.
 */
async function loadWeekSchema(): Promise<WeekSchema> {
  const directory = resolve(app, "lib/contracts");
  expect(
    existsSync(directory),
    "Missing week contract directory: apps/storytime/lib/contracts (task 2.2)",
  ).toBe(true);
  const files = readdirSync(directory).filter(
    (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
  );
  expect(files.length, "The week contract directory holds no module (task 2.2)").toBeGreaterThan(0);
  const schemas: Array<{ name: string; schema: WeekSchema }> = [];
  for (const name of files) {
    const path = resolve(directory, name);
    let loaded: Record<string, unknown> = {};
    try {
      loaded = (await import(/* @vite-ignore */ path)) as Record<string, unknown>;
    } catch (error) {
      expect.fail(
        `Cannot load the week contract ${relative(root, path)}: ${(error as Error).message}`,
      );
    }
    for (const [key, value] of Object.entries(loaded)) {
      if (isSchema(value)) schemas.push({ name: key, schema: value });
    }
  }
  expect(
    schemas.length,
    "No Zod schema is exported from apps/storytime/lib/contracts (task 2.2)",
  ).toBeGreaterThan(0);
  const preferred = schemas.find((entry) => /week/i.test(entry.name)) ?? schemas[0];
  return preferred.schema;
}

/**
 * Lists the field paths of the issues of a failed parse.
 * @param result The parse result.
 * @returns The joined paths.
 */
function issuePaths(result: ParseResult): string[] {
  return (result.error?.issues ?? []).map((issue) => issue.path.join("."));
}

/**
 * Lists the issues of a failed parse as text.
 * @param result The parse result.
 * @returns The issue lines.
 */
function describeIssues(result: ParseResult): string {
  return (result.error?.issues ?? [])
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
}

/**
 * Fails when a parse accepted a broken copy.
 * @param result The parse result of the broken copy.
 * @param label The name of the broken copy.
 * @returns The field paths of the failure.
 */
function expectRejected(result: ParseResult, label: string): string[] {
  expect(result.success, `The contract accepts ${label}`).toBe(false);
  const paths = issuePaths(result);
  expect(paths.length, `The failure of ${label} has no field path (rule 11.1)`).toBeGreaterThan(0);
  expect(
    paths.every((path) => path.length > 0),
    `The failure of ${label} has an empty field path: ${describeIssues(result)}`,
  ).toBe(true);
  return paths;
}

describe("AC-3.1 the week contract parses the shipped weeks", () => {
  it("parses every shipped week from l2/w01 to l2/w08", async () => {
    const weeks = WEEK_FILES.map((file) => readWeek(file));
    expect(weeks.length, "The test must read eight shipped weeks (A4)").toBe(8);
    const schema = await loadWeekSchema();
    for (const week of weeks) {
      const result = schema.safeParse(week);
      expect(
        result.success,
        `The contract rejects a shipped week: ${describeIssues(result)}`,
      ).toBe(true);
    }
  });

  it("accepts a week with a key that the app does not read", async () => {
    const week = readWeek("w01.json");
    const copy: WeekJson = { ...week, extraField: "kept" };
    const schema = await loadWeekSchema();
    const result = schema.safeParse(copy);
    expect(
      result.success,
      `The contract rejects a week with an unknown key: ${describeIssues(result)}`,
    ).toBe(true);
  });

  it("keeps the published week of the milestone", async () => {
    const week = readWeek("w01.json");
    expect(week.meta.status, "The shipped week 1 must be the published week (task 2.1)").toBe(
      "published",
    );
    expect(week.meta.level, "The shipped week 1 must be a level 2 week (task 2.1)").toBe(2);
    expect(week.meta.week, "The shipped week 1 must be the first week (task 2.1)").toBe(1);
  });
});

describe("AC-3.2 each broken copy fails with its field path", () => {
  it("rejects a published week without a book of each kind", async () => {
    const week = publishedWeek();
    const before = week.books.length;
    week.books = week.books.filter((book) => book.kind !== "decodable");
    expect(week.books.length, "The broken copy must lose one book").toBe(before - 1);
    const schema = await loadWeekSchema();
    const paths = expectRejected(schema.safeParse(week), "a published week without a decodable");
    expect(
      paths.some((path) => /book/i.test(path)),
      `The failure names no book field: ${paths.join(" | ")}`,
    ).toBe(true);
  });

  it("rejects a published week with two read-along books", async () => {
    const week = publishedWeek();
    const readalong = week.books.find((book) => book.kind === "readalong");
    expect(readalong, "The published week must have a read-along book (task 2.1)").toBeDefined();
    week.books.push(structuredClone(readalong!));
    const schema = await loadWeekSchema();
    const paths = expectRejected(
      schema.safeParse(week),
      "a published week with two read-along books",
    );
    expect(
      paths.some((path) => /book/i.test(path)),
      `The failure names no book field: ${paths.join(" | ")}`,
    ).toBe(true);
  });

  it("rejects a published week with a page without a picture file", async () => {
    const week = publishedWeek();
    const page = week.books[0]?.pages[0];
    expect(page, "The published week must have a book page (task 2.1)").toBeDefined();
    delete page!.image;
    const schema = await loadWeekSchema();
    const paths = expectRejected(
      schema.safeParse(week),
      "a published week with a page without a picture file",
    );
    expect(
      paths.some((path) => /book|page/i.test(path)),
      `The failure names no page field: ${paths.join(" | ")}`,
    ).toBe(true);
  });

  it("rejects a week whose times are out of order", async () => {
    const week = publishedWeek();
    const sentences = week.books[0]?.audio?.sentences ?? [];
    expect(sentences.length, "The published week must have book sentences (task 2.1)").toBeGreaterThan(0);
    sentences[0].endTime = sentences[0].startTime - 0.1;
    const schema = await loadWeekSchema();
    const paths = expectRejected(schema.safeParse(week), "a week whose times are out of order");
    expect(
      paths.some((path) => /sentence|word|time|audio/i.test(path)),
      `The failure names no timing field: ${paths.join(" | ")}`,
    ).toBe(true);
  });

  it("rejects a week whose version is not 1", async () => {
    const week = publishedWeek();
    week.version = 2;
    const schema = await loadWeekSchema();
    const paths = expectRejected(schema.safeParse(week), "a week whose version is 2");
    expect(
      paths.some((path) => /version/i.test(path)),
      `The failure names no version field: ${paths.join(" | ")}`,
    ).toBe(true);
  });
});
