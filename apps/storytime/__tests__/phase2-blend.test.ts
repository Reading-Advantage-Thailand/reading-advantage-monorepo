// @vitest-environment node
// AC-7.1 of the Phase 2 test strategy. The blend function of plan task 2.5 decides whether a
// decodable word plays sound by sound or whole. The tests read the shipped week files only.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(app, "../..");
const weekDirectory = resolve(app, "content", "l2");
const readAlongDirectory = resolve(root, "packages/read-along");
const LATER_WEEKS = [
  "w02.json",
  "w03.json",
  "w04.json",
  "w05.json",
  "w06.json",
  "w07.json",
  "w08.json",
];

/** The plan of one decodable word. */
interface BlendPlan {
  mode: string;
  graphemes: string[];
}

/** The blend function of the app or of the shared package. */
type BlendPlanForWord = (word: string, week: unknown) => BlendPlan;

/** The parts of a week file that the blend test reads. */
interface WeekJson {
  books: Array<{
    kind: string;
    soundBook?: boolean;
    pages: Array<{ text: string }>;
    soundsPage?: { element: string; words: string[]; tricky: string[] };
  }>;
  focus: { trickyWords: string[] };
  [key: string]: unknown;
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
 * Lists the source files of the shared package.
 * @returns The source file paths.
 */
function readAlongSources(): string[] {
  if (!existsSync(readAlongDirectory)) return [];
  const files: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (["node_modules", "dist", ".turbo"].includes(entry.name)) continue;
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (
        /\.[cm]?[jt]sx?$/.test(entry.name) &&
        !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(entry.name)
      ) {
        files.push(path);
      }
    }
  };
  walk(readAlongDirectory);
  return files;
}

/**
 * Loads the blend function from the app or from the shared package.
 * @returns The blend function.
 */
async function loadBlendPlan(): Promise<BlendPlanForWord> {
  const candidates = [
    resolve(app, "lib/blend.ts"),
    resolve(app, "lib/blending.ts"),
    resolve(app, "lib/blend/index.ts"),
    ...readAlongSources(),
  ];
  const found: string[] = [];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    if (!/export\s+(?:async\s+)?(?:function|const|let|var)\s+blendPlanForWord\b/.test(text)) continue;
    let loaded: Record<string, unknown> = {};
    try {
      loaded = (await import(/* @vite-ignore */ path)) as Record<string, unknown>;
    } catch (error) {
      expect.fail(
        `Cannot load the blend function ${relative(root, path)}: ${(error as Error).message}`,
      );
    }
    const value = loaded.blendPlanForWord;
    if (typeof value === "function") return value as BlendPlanForWord;
    found.push(relative(root, path));
  }
  expect.fail(
    `The blend function blendPlanForWord is missing. It must live in apps/storytime/lib/blend.ts or in the shared package (task 2.5). Found: ${found.join(", ")}`,
  );
}

/**
 * Lists the words of a page without its edge punctuation.
 * @param text The page text.
 * @returns The lower-case words of the page.
 */
function pageWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLowerCase())
    .filter((word) => word.length > 0);
}

/**
 * Finds the first later shipped week with CVC words on its sounds page.
 * @returns The week file, the week, and its CVC words.
 */
function findCvcWeek(): { file: string; week: WeekJson; words: string[]; tricky: string[] } {
  for (const file of LATER_WEEKS) {
    const week = readWeek(file);
    const decodable = week.books.find((book) => book.kind === "decodable");
    const soundsPage = decodable?.soundsPage;
    const words = (soundsPage?.words ?? []).filter((word) => /^[a-z]{3}$/.test(word));
    if (words.length > 0) {
      return { file, week, words, tricky: soundsPage?.tricky ?? [] };
    }
  }
  expect.fail("No later shipped week holds a CVC word on its sounds page (task 2.1)");
}

describe("AC-7.1 the blend function of the decodable", () => {
  it("plays every word of the sound book whole", async () => {
    const week = readWeek("w01.json");
    const decodable = week.books.find((book) => book.kind === "decodable");
    expect(decodable, "The shipped week 1 must have a decodable book (task 2.1)").toBeDefined();
    expect(decodable!.soundBook, "The shipped week 1 must be the sound book (task 2.1)").toBe(true);
    const blendPlanForWord = await loadBlendPlan();
    const words = decodable!.pages.flatMap((page) => pageWords(page.text));
    expect(words.length, "The sound book of week 1 holds no word (A4)").toBeGreaterThan(0);
    for (const word of words) {
      const plan = blendPlanForWord(word, week);
      expect(plan.mode, `The word ${word} of the sound book plays sound by sound`).toBe("whole");
    }
  });

  it("plays the CVC words of a later week in grapheme order", async () => {
    const { file, week, words } = findCvcWeek();
    expect(words.length, `The later week ${file} holds no CVC word (A4)`).toBeGreaterThan(0);
    const blendPlanForWord = await loadBlendPlan();
    for (const word of words) {
      const plan = blendPlanForWord(word, week);
      expect(plan.mode, `The CVC word ${word} of ${file} plays whole`).not.toBe("whole");
      expect(plan.graphemes.length, `The CVC word ${word} of ${file} names no grapheme`).toBeGreaterThan(
        0,
      );
      expect(
        plan.graphemes.join(""),
        `The graphemes of the word ${word} of ${file} are out of order`,
      ).toBe(word.toLowerCase());
    }
  });

  it("plays every tricky word whole", async () => {
    const { file, week, tricky } = findCvcWeek();
    expect(tricky.length, `The later week ${file} holds no tricky word (A4)`).toBeGreaterThan(0);
    const blendPlanForWord = await loadBlendPlan();
    for (const word of tricky) {
      const plan = blendPlanForWord(word, week);
      expect(plan.mode, `The tricky word ${word} of ${file} plays sound by sound`).toBe("whole");
    }
  });
});
