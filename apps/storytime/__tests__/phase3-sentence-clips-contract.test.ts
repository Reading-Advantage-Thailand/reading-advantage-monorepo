// @vitest-environment node
/**
 * The sentence-clips contract of the approved A-42 pin (plan task 2.1, strategy P2 rows S1 to S8).
 *
 * The file reads the pin week sources: the seven hand-off week files of `w01 r6` and `w02` to
 * `w07 r5` (the folder is the source of the media), and the shipped `w08` file, which holds no
 * book. The hand-off week differs from the pin week only at the four `approval.loops` keys, and
 * those keys do not change a book, so the clips of the source are the clips of the pin.
 *
 * A broken copy is a deep clone of a pin week with one change, made inside the test. No week
 * fixture file sits under `__tests__`, and no media file sits in the repository.
 *
 * The rule that the rows pin: the array form of `audio.sentenceClips` holds one entry per
 * sentence of `audio.sentences`, in order, and entry `i` holds the text and the file of sentence
 * `i`. The file names the week, the book, and the sentence: `l2/media/w<nn>/sentences/b<book>-s<jj>.mp3`
 * with the book index and `jj = i + 1`. The map form (page number to file) stays accepted, because
 * the finding 2b rows use it.
 *
 * Rows S1 to S7 fail at the base, because the contract matches array entries to pages, and w02
 * and w07 hold two sentences on each page. Row S8 holds at both pins.
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { weekSchema } from "../lib/contracts/week";
import { receiveWeeks } from "../scripts/receive-weeks";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The hand-off root of the Workbooks packages. */
const handoffRoot = process.env.STORYTIME_HANDOFF_ROOT ?? join(homedir(), "Desktop", "handoff");

/** The weeks of the release, from 1 to 8. */
const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8];

/** The weeks that a hand-off folder holds, from 1 to 7. */
const FOLDER_WEEKS = [1, 2, 3, 4, 5, 6, 7];

/** A week as plain JSON, for a broken copy. */
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** One pin week source. */
interface PinSource {
  /** The week of the level. */
  week: number;
  /** The file that the source came from. */
  file: string;
  /** The source text. */
  text: string;
  /** The source as plain JSON. */
  data: Json;
}

/**
 * Gives the hand-off folder of a week.
 * @param week The week of the level, from 1 to 7.
 * @returns The folder name under the hand-off root.
 */
function folderOf(week: number): string {
  return `w0${week}-storytime-app-package-${week === 1 ? "r6" : "r5"}`;
}

/**
 * Gives the file of a pin week source.
 * @param week The week of the level.
 * @returns The absolute path of the source file.
 */
function pinSourceFile(week: number): string {
  if (week === 8) return resolve(app, "content", "l2", "w08.json");
  return join(handoffRoot, folderOf(week), "l2", `w0${week}.json`);
}

/**
 * Reads one pin week source.
 * @param week The week of the level.
 * @returns The source, or `null` when the file is absent.
 */
function readPinSource(week: number): PinSource | null {
  const file = pinSourceFile(week);
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8");
  return { week, file, text, data: JSON.parse(text) as Json };
}

/**
 * Reads the pin week sources and parses each one with the app contract.
 * @returns The sources, the parsed weeks, the absent sources, and the parse failures.
 */
function readPinWeeks(): {
  sources: PinSource[];
  parsed: Array<{ week: number; data: Json }>;
  absent: string[];
  failures: string[];
} {
  const sources: PinSource[] = [];
  const parsed: Array<{ week: number; data: Json }> = [];
  const absent: string[] = [];
  const failures: string[] = [];
  for (const week of WEEKS) {
    const source = readPinSource(week);
    if (!source) {
      absent.push(`w0${week}: ${pinSourceFile(week)}`);
      continue;
    }
    sources.push(source);
    const result = weekSchema.safeParse(source.data);
    if (result.success) parsed.push({ week, data: source.data });
    else {
      const issues = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      failures.push(`w0${week}: ${issues}`);
    }
  }
  return { sources, parsed, absent, failures };
}

/**
 * Gives the source book of a pin week.
 * @param source The pin week source.
 * @param index The index of the book.
 * @returns The book, or `undefined` when the week holds no such book.
 */
function sourceBook(source: PinSource, index: number): Json | undefined {
  return (source.data.books as Json[] | undefined)?.[index];
}

/**
 * Lists the array entries of the sentence clips of a source book.
 * @param book The source book.
 * @returns The entries of the array form, or an empty array for the map form.
 */
function clipEntries(book: Json | undefined): Array<{ sentence: string; file: string }> {
  const clips = book?.audio?.sentenceClips;
  return Array.isArray(clips) ? (clips as Array<{ sentence: string; file: string }>) : [];
}

/**
 * Lists the sentences of a source book.
 * @param book The source book.
 * @returns The sentences of the narration, in order.
 */
function sentencesOf(book: Json | undefined): Array<{ sentence: string }> {
  const sentences = book?.audio?.sentences;
  return Array.isArray(sentences) ? (sentences as Array<{ sentence: string }>) : [];
}

/**
 * Gives the expected clip file of one sentence of one book.
 * @param week The week of the level.
 * @param bookIndex The index of the book.
 * @param sentenceIndex The zero-based index of the sentence.
 * @returns The file path relative to the content folder.
 */
function expectedClipFile(week: number, bookIndex: number, sentenceIndex: number): string {
  return `l2/media/w0${week}/sentences/b${bookIndex}-s${String(sentenceIndex + 1).padStart(2, "0")}.mp3`;
}

describe("S1 every pin week parses", () => {
  it("parses the eight pin week sources", () => {
    const { sources, parsed, absent, failures } = readPinWeeks();
    console.log(`pin_sources=${sources.length} weeks_parsed=${parsed.length}`);
    expect(absent, "the eight pin week sources are present").toEqual([]);
    expect(sources.length, "pin_sources").toBe(8);
    expect(failures, "every pin week parses with the app contract").toEqual([]);
    expect(parsed.length, "weeks_parsed").toBe(8);
  });
});

describe("S2 to S5 the sentence clips of every pin book", () => {
  it("holds sentence clips in every book of the seven folder weeks", () => {
    const { sources, failures } = readPinWeeks();
    expect(failures, "every pin week parses before its books are counted").toEqual([]);
    let books = 0;
    let withClips = 0;
    const missing: string[] = [];
    for (const source of sources) {
      const sourceBooks = (source.data.books as Json[] | undefined) ?? [];
      sourceBooks.forEach((book, index) => {
        books += 1;
        const clips = book.audio?.sentenceClips;
        const count = Array.isArray(clips) ? clips.length : clips ? Object.keys(clips).length : 0;
        if (count > 0) withClips += 1;
        else missing.push(`w0${source.week} book ${index} (${book.kind}) holds no sentenceClips`);
      });
    }
    console.log(`books_checked=${books} books_with_sentence_clips=${withClips}`);
    expect(missing, `books without sentence clips: ${missing.join(" | ")}`).toEqual([]);
    expect(books, "books_checked").toBe(14);
    expect(withClips, "books_with_sentence_clips").toBe(14);
  });

  it("holds one clip per sentence of the narration", () => {
    const { sources, failures } = readPinWeeks();
    expect(failures, "every pin week parses before its clip counts are checked").toEqual([]);
    let checked = 0;
    let mismatches = 0;
    const details: string[] = [];
    for (const source of sources) {
      ((source.data.books as Json[] | undefined) ?? []).forEach((book, index) => {
        checked += 1;
        const entries = clipEntries(book).length;
        const sentences = sentencesOf(book).length;
        if (entries !== sentences) {
          mismatches += 1;
          details.push(`w0${source.week} book ${index}: ${entries} clips for ${sentences} sentences`);
        }
      });
    }
    console.log(`books_checked=${checked} book_clip_count_mismatches=${mismatches}`);
    expect(details, `clip count mismatches: ${details.join(" | ")}`).toEqual([]);
    expect(checked, "books_checked").toBe(14);
    expect(mismatches, "book_clip_count_mismatches").toBe(0);
  });

  it("keeps entry i equal to sentence i after trim", () => {
    const { sources, failures } = readPinWeeks();
    expect(failures, "every pin week parses before its clip order is checked").toEqual([]);
    let checked = 0;
    let mismatches = 0;
    const details: string[] = [];
    for (const source of sources) {
      ((source.data.books as Json[] | undefined) ?? []).forEach((book, index) => {
        const entries = clipEntries(book);
        const sentences = sentencesOf(book);
        if (entries.length === 0) return;
        checked += 1;
        entries.forEach((entry, entryIndex) => {
          if (entry.sentence.trim() !== (sentences[entryIndex]?.sentence ?? "").trim()) {
            mismatches += 1;
            details.push(
              `w0${source.week} book ${index} entry ${entryIndex}: ${JSON.stringify(entry.sentence)}`,
            );
          }
        });
      });
    }
    console.log(`books_checked=${checked} order_mismatches=${mismatches}`);
    expect(details, `order mismatches: ${details.slice(0, 5).join(" | ")}`).toEqual([]);
    expect(checked, "books_checked").toBe(14);
    expect(mismatches, "order_mismatches").toBe(0);
  });

  it("names the week, the book, and the sentence in every file and repeats none", () => {
    const { sources, failures } = readPinWeeks();
    expect(failures, "every pin week parses before its clip files are checked").toEqual([]);
    const files = new Set<string>();
    let shapeMismatches = 0;
    const details: string[] = [];
    for (const source of sources) {
      ((source.data.books as Json[] | undefined) ?? []).forEach((book, index) => {
        clipEntries(book).forEach((entry, entryIndex) => {
          const expected = expectedClipFile(source.week, index, entryIndex);
          if (entry.file !== expected) {
            shapeMismatches += 1;
            details.push(`w0${source.week} book ${index}: ${entry.file} instead of ${expected}`);
          }
          files.add(entry.file);
        });
      });
    }
    console.log(`file_shape_mismatches=${shapeMismatches} clip_files_unique=${files.size}`);
    expect(details, `file shape mismatches: ${details.slice(0, 5).join(" | ")}`).toEqual([]);
    expect(shapeMismatches, "file_shape_mismatches").toBe(0);
    expect(files.size, "clip_files_unique").toBe(128);
  });
});

describe("S6 a broken copy fails with an issue that names sentenceClips", () => {
  /** One broken copy of the w01 read-along book. */
  const cases: Array<[string, (book: Json) => void]> = [
    ["a count of one less", (book) => (book.audio.sentenceClips as Json[]).pop()],
    [
      "a count of one more",
      (book) =>
        (book.audio.sentenceClips as Json[]).push({
          sentence: "A big red bus.",
          file: "l2/media/w01/sentences/b0-s09.mp3",
        }),
    ],
    [
      "two entries swapped",
      (book) => {
        const clips = book.audio.sentenceClips as Json[];
        const first = clips[0];
        clips[0] = clips[1];
        clips[1] = first;
      },
    ],
    [
      "one wrong sentence",
      (book) => ((book.audio.sentenceClips as Json[])[2].sentence = "A big red bus."),
    ],
    [
      "a duplicate file",
      (book) => {
        const clips = book.audio.sentenceClips as Json[];
        clips[1].file = clips[0].file;
      },
    ],
    ["a parent segment", (book) => ((book.audio.sentenceClips as Json[])[0].file = "../outside.mp3")],
    [
      "an absolute path",
      (book) => ((book.audio.sentenceClips as Json[])[0].file = "/l2/media/w01/sentences/b0-s01.mp3"),
    ],
    [
      "a URL",
      (book) =>
        ((book.audio.sentenceClips as Json[])[0].file = "https://media.example/b0-s01.mp3"),
    ],
    [
      "a decodable file on the read-along book",
      (book) => ((book.audio.sentenceClips as Json[])[0].file = "l2/media/w01/sentences/b1-s01.mp3"),
    ],
  ];

  it("refuses each of the nine broken copies for the sentence clips", () => {
    const source = readPinSource(1);
    expect(source, "the w01 r6 pin source is present").not.toBeNull();
    let refusals = 0;
    const problems: string[] = [];
    for (const [name, mutate] of cases) {
      const copy = structuredClone(source!.data) as Json;
      mutate(copy.books[0] as Json);
      const result = weekSchema.safeParse(copy);
      if (result.success) {
        problems.push(`${name}: the contract accepts the broken copy`);
        continue;
      }
      const issue = result.error.issues.find((item) => item.path.includes("sentenceClips"));
      if (!issue) {
        problems.push(`${name}: no issue names sentenceClips`);
        continue;
      }
      refusals += 1;
    }
    console.log(`broken_copies=${cases.length} refusals=${refusals}`);
    expect(problems, `broken copies that pass: ${problems.join(" | ")}`).toEqual([]);
    expect(cases.length, "broken_copies").toBe(9);
    expect(refusals, "refusals").toBe(9);
  });
});

describe("S7 the receiver keeps the source text unchanged", () => {
  it("writes the seven folder weeks with the source text", () => {
    let unchanged = 0;
    const errors: string[] = [];
    for (const week of FOLDER_WEEKS) {
      const source = readPinSource(week);
      expect(source, `the w0${week} hand-off source is present`).not.toBeNull();
      try {
        const received = receiveWeeks([
          { level: 2, week, source: `l2/w0${week}.json`, text: source!.text },
        ]);
        if (received[0]?.contents === source!.text) unchanged += 1;
        else errors.push(`w0${week}: the received text differs from the source text`);
      } catch (error) {
        errors.push(`w0${week}: ${(error as Error).message.slice(0, 160)}`);
      }
    }
    console.log(`sources_received=${FOLDER_WEEKS.length} source_text_unchanged=${unchanged}`);
    expect(errors, `weeks that the receiver changes or refuses: ${errors.join(" | ")}`).toEqual([]);
    expect(unchanged, "source_text_unchanged").toBe(7);
  });
});

describe("S8 the map form stays accepted", () => {
  it("accepts the page number to file form of the finding 2b rows", () => {
    const source = readPinSource(1);
    expect(source, "the w01 r6 pin source is present").not.toBeNull();
    const copy = structuredClone(source!.data) as Json;
    copy.books[0].audio.sentenceClips = {
      "1": "l2/media/w01/sentences/b0-s01.mp3",
      "3": "l2/media/w01/sentences/b0-s03.mp3",
    };
    const accepted = weekSchema.safeParse(copy).success;
    console.log(`map_form_accepted=${accepted ? 1 : 0}`);
    expect(accepted, "map_form_accepted").toBe(true);
  });

  it("keeps the w01 source books of the read-along and the decodable in order", () => {
    const source = readPinSource(1);
    expect(source, "the w01 r6 pin source is present").not.toBeNull();
    expect(sourceBook(source!, 0)?.kind, "book 0 is the read-along").toBe("readalong");
    expect(sourceBook(source!, 1)?.kind, "book 1 is the decodable").toBe("decodable");
  });
});
