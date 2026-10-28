// @vitest-environment node
// AC-6.1 and rule 10.2 of the Phase 2 test strategy. The timing functions of plan task 2.4 live
// in the shared package packages/read-along. The test reads the shipped week files only.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(packageRoot, "../..");
const weekDirectory = resolve(root, "apps/storytime/content/l2");
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

/** The seconds a word cut starts before the word (rule 10.2). */
const CUT_LEAD_IN_SECONDS = 0.03;

/** One word of a sentence timing. */
interface WordTiming {
  word: string;
  start: number;
  end: number;
}

/** One sentence of a book audio. */
interface SentenceTiming {
  sentence: string;
  startTime: number;
  endTime: number;
  page?: number;
  words: WordTiming[];
}

/** The position of the voice in the sentences. */
interface ReadAlongPosition {
  sentenceIndex: number;
  wordIndex: number;
}

/** The bounds of a word cut. */
interface CutBounds {
  start: number;
  end: number;
}

/**
 * Lists the files of the shared package.
 * @param withTests Whether the test files count.
 * @returns The file paths.
 */
function packageFiles(withTests: boolean): string[] {
  const files: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (["node_modules", "dist", ".turbo"].includes(entry.name)) continue;
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (
        /\.[cm]?[jt]sx?$/.test(entry.name) &&
        (withTests || !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(entry.name))
      ) {
        files.push(path);
      }
    }
  };
  walk(packageRoot);
  return files;
}

/**
 * Finds the file that defines an export of the shared package.
 * @param name The export name.
 * @returns The file path.
 */
function findDefinition(name: string): string {
  const pattern = new RegExp(
    `export\\s+(?:async\\s+)?(?:function|const|let|var|class)\\s+${name}\\b`,
  );
  for (const file of packageFiles(false)) {
    if (pattern.test(readFileSync(file, "utf8"))) return file;
  }
  expect.fail(`The shared package exports no ${name} (task 2.3)`);
}

/**
 * Loads an export of the shared package.
 * @param name The export name.
 * @returns The exported value.
 */
async function loadExport<T>(name: string): Promise<T> {
  const path = findDefinition(name);
  let loaded: Record<string, unknown> = {};
  try {
    loaded = (await import(/* @vite-ignore */ path)) as Record<string, unknown>;
  } catch (error) {
    expect.fail(`Cannot load ${name} from ${relative(root, path)}: ${(error as Error).message}`);
  }
  expect(loaded[name], `The module ${relative(root, path)} exports no ${name}`).toBeDefined();
  return loaded[name] as T;
}

/**
 * Reads a shipped week file.
 * @param file The file name inside apps/storytime/content/l2.
 * @returns The parsed week.
 */
function readWeek(file: string): {
  books: Array<{
    kind: string;
    audio?: { sentences: SentenceTiming[] };
  }>;
} {
  const path = resolve(weekDirectory, file);
  expect(existsSync(path), `Missing handed-off week: ${relative(root, path)} (task 2.1)`).toBe(true);
  return JSON.parse(readFileSync(path, "utf8")) as {
    books: Array<{ kind: string; audio?: { sentences: SentenceTiming[] } }>;
  };
}

/**
 * Groups the sentences of a book by their page.
 * @param sentences The sentences of the book.
 * @returns The sentences of each page.
 */
function sentencesByPage(sentences: SentenceTiming[]): Map<number, SentenceTiming[]> {
  const pages = new Map<number, SentenceTiming[]>();
  for (const sentence of sentences) {
    const page = sentence.page ?? 1;
    const group = pages.get(page) ?? [];
    group.push(sentence);
    pages.set(page, group);
  }
  return pages;
}

/**
 * Finds the first shipped page with two or more sentences.
 * @returns The page number, its sentences, and the week file.
 */
function findTwoSentencePage(): { file: string; page: number; sentences: SentenceTiming[] } {
  for (const file of WEEK_FILES) {
    const week = readWeek(file);
    for (const book of week.books) {
      const sentences = book.audio?.sentences ?? [];
      for (const [page, group] of sentencesByPage(sentences)) {
        if (group.length >= 2) return { file, page, sentences: group };
      }
    }
  }
  expect.fail("No shipped week holds a page with two sentences (task 2.1)");
}

describe("AC-6.1 every sentence of a shipped page seeks and lights up", () => {
  it("finds a shipped page with two sentences", () => {
    const weeks = WEEK_FILES.map((file) => readWeek(file));
    expect(weeks.length, "The test must read eight shipped weeks (A4)").toBe(8);
    const found = findTwoSentencePage();
    expect(found.sentences.length, "The shipped page holds no two sentences").toBeGreaterThan(1);
  });

  it("seeks to each sentence of the page and lights it up", async () => {
    const found = findTwoSentencePage();
    const seekTimeForSentence = await loadExport<(sentence: SentenceTiming) => number>(
      "seekTimeForSentence",
    );
    const findPosition = await loadExport<
      (
        sentences: SentenceTiming[],
        time: number,
        previous: ReadAlongPosition,
      ) => ReadAlongPosition
    >("findPosition");
    const noPosition = await loadExport<ReadAlongPosition>("NO_POSITION").catch(() => ({
      sentenceIndex: -1,
      wordIndex: -1,
    }));
    for (const [index, sentence] of found.sentences.entries()) {
      const time = seekTimeForSentence(sentence);
      expect(
        time,
        `The seek time of sentence ${index} of ${found.file} is negative`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        time,
        `The seek time of sentence ${index} of ${found.file} starts after the sentence`,
      ).toBeLessThanOrEqual(sentence.startTime);
      expect(
        time,
        `The seek time of sentence ${index} of ${found.file} starts too early`,
      ).toBeGreaterThanOrEqual(sentence.startTime - 0.2);
      const position = findPosition(found.sentences, time, noPosition);
      expect(
        position.sentenceIndex,
        `Sentence ${index} of ${found.file} does not light up at its seek time`,
      ).toBe(index);
    }
  });
});

describe("rule 10.2 the bounds of a word cut", () => {
  it("starts 30 ms before the word and ends at its measured end", async () => {
    const found = findTwoSentencePage();
    const wordCutBounds = await loadExport<(word: WordTiming) => CutBounds>("wordCutBounds");
    let checked = 0;
    for (const sentence of found.sentences) {
      for (const [index, word] of sentence.words.entries()) {
        const bounds = wordCutBounds(word);
        expect(
          bounds.start,
          `The cut of the word ${word.word} starts at the wrong time`,
        ).toBe(Math.max(0, word.start - CUT_LEAD_IN_SECONDS));
        expect(
          bounds.end,
          `The cut of the word ${word.word} ends at the wrong time`,
        ).toBe(word.end);
        const next = sentence.words[index + 1];
        if (next && next.start !== word.end) {
          expect(
            bounds.end,
            `The cut of the word ${word.word} ends at the start of the next word`,
          ).not.toBe(next.start);
        }
        checked++;
      }
    }
    expect(checked, "The shipped page holds no word (A4)").toBeGreaterThan(0);
  });
});
