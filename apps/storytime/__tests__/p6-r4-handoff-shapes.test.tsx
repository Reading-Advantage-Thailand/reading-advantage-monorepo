// @vitest-environment jsdom
/**
 * Task 6.2, round 3, Red r4: the REAL shape of the Workbooks hand-off.
 *
 * The packages landed: `~/Desktop/handoff/w01-storytime-app-package-r5` and
 * `w02-storytime-app-package-r4` to `w07-storytime-app-package-r4`. The orchestrator read w01 r5,
 * and this file was checked against all seven weeks.
 *
 * What the seven weeks hold (checked in this round):
 * - `opening.wordClips`, `focus.family.wordClips`, and `focus.trickyWordClips` are maps from a
 *   lower-case word to a path such as `l2/media/w01/words/wa-boy.mp3`. The shape matches the
 *   shape that `p6-r3-workbooks-clips.test.tsx` pinned. One week differs in a detail: w02 lists the
 *   tricky word `I` with a capital, and its clip key is the lower-case `i`. So the lookup of a
 *   tricky word lower-cases the word, and the contract must not tie the key to the tricky word.
 * - `books[].audio.sentenceClips` exists on the decodable book only. It is an ARRAY of
 *   `{ "sentence": "A nest.", "file": "l2/media/w01/sentences/b1-s01.mp3" }`: 8 entries for the 8
 *   pages, in page order, each `sentence` equal to the page text, each file unique. The read-along
 *   book holds no `sentenceClips`. Two weeks repeat a sentence on two pages (w02: "Nan can.",
 *   "Can I?", "I can!"; w06: "Tap, tap, tap!") and the entries of the repeats hold different files
 *   (`b1-s01` and `b1-s04`). `sentences/manifest.json` adds only production data (take, length,
 *   peak, the recognized text, a digest) with the same file names in the same order; the app needs
 *   nothing from it, and no week field names it.
 * - Every package fails the contract of HEAD at one place only: `books.1.audio.sentenceClips:
 *   Expected object, received array`.
 *
 * Pinned rules of this file (defaults until the PM says otherwise):
 * - The contract accepts the array form. The map form (page number to file) stays accepted too,
 *   because `p6-look-findings-sentence-clips.test.tsx` uses it.
 * - MATCHING RULE: a decodable page takes the first entry of the array, in array order and not yet
 *   taken by an earlier page, whose trimmed `sentence` equals the trimmed page text. A repeated
 *   sentence therefore takes the entries in order (page 1 takes `b1-s01`, page 4 takes `b1-s04`),
 *   and the order of entries with different texts does not matter.
 * - A page with no matching entry has no sentence button.
 * - An entry that no page takes (its sentence matches no page, or all pages with that text are
 *   taken) is REPORTED, not dropped: the contract fails with an issue whose path holds
 *   `sentenceClips` and whose message holds the sentence text, and the receiver refuses the week
 *   with a message that names `sentenceClips`.
 * - The full-sentence button plays the matched file from 0 with no seek and no stop timer.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";
import { receiveWeeks } from "../scripts/receive-weeks";

const app = resolve(import.meta.dirname, "..");
const sourceText = readFileSync(resolve(app, "content/l2/w01.json"), "utf8");
const raw = (): Record<string, any> => JSON.parse(sourceText);

/** The 8 entries of w01 r5, as the package holds them. */
const W01_SENTENCES = [
  { sentence: "A nest.", file: "l2/media/w01/sentences/b1-s01.mp3" },
  { sentence: "A net.", file: "l2/media/w01/sentences/b1-s02.mp3" },
  { sentence: "A nut.", file: "l2/media/w01/sentences/b1-s03.mp3" },
  { sentence: "A nose.", file: "l2/media/w01/sentences/b1-s04.mp3" },
  { sentence: "A neck.", file: "l2/media/w01/sentences/b1-s05.mp3" },
  { sentence: "A nurse.", file: "l2/media/w01/sentences/b1-s06.mp3" },
  { sentence: "A nest and a nut.", file: "l2/media/w01/sentences/b1-s07.mp3" },
  { sentence: "Nan can nod!", file: "l2/media/w01/sentences/b1-s08.mp3" },
];
const fileOf = (n: number): string => `l2/media/w01/sentences/b1-s0${n}.mp3`;

/** The w01 source with a `sentenceClips` value put into its decodable audio. */
function sourceWith(sentenceClips: unknown, mutate?: (decodable: Record<string, any>) => void): Record<string, any> {
  const data = raw();
  const decodable = data.books.find((book: { kind: string }) => book.kind === "decodable");
  decodable.audio.sentenceClips = sentenceClips;
  mutate?.(decodable);
  return data;
}

/** Parses a source; a refusal is an assertion failure that names the issues. */
function parseOk(data: Record<string, any>): StorytimeWeek {
  const result = weekSchema.safeParse(data);
  expect(
    result.success ? "" : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
    "the contract accepts the package",
  ).toBe("");
  return result.success ? result.data : (undefined as never);
}

describe("the contract of the array form of sentenceClips", () => {
  it("accepts the 8 entries of the w01 r5 package", () => {
    parseOk(sourceWith(W01_SENTENCES.map((entry) => ({ ...entry }))));
  });

  it("still accepts the map form of finding 2b (characterization)", () => {
    parseOk(sourceWith({ "1": fileOf(1), "3": fileOf(3) }));
  });

  it.each([
    ["an entry with no file", [{ sentence: "A nest." }]],
    ["an entry with no sentence", [{ file: fileOf(1) }]],
    ["an entry with an empty sentence", [{ sentence: "", file: fileOf(1) }]],
    ["an entry that is a string", [fileOf(1)]],
    ["a parent segment in a file", [{ sentence: "A nest.", file: "../outside.mp3" }]],
    ["a URL in a file", [{ sentence: "A nest.", file: "https://media.example/s01.mp3" }]],
    ["an empty file", [{ sentence: "A nest.", file: "" }]],
  ])("rejects %s", (_name, value) => {
    expect(weekSchema.safeParse(sourceWith(value)).success).toBe(false);
  });

  it("defaults a decodable book with no sentenceClips to no clip", async () => {
    // The read-along book of the real packages holds no sentenceClips; the parsed week must stay
    // parseable and the decodable part must show no sentence button.
    parseOk(raw());
    parseOk(sourceWith(undefined));
  });
});

describe("an entry that no page takes is reported", () => {
  const stray = [...W01_SENTENCES, { sentence: "A big red bus.", file: fileOf(8).replace("s08", "s09") }];

  // The rows that reject a bad value pass at HEAD, because HEAD rejects the whole array form. They
  // guard Green; the accept row above and the rows that name the sentence carry the Red.
  it("fails the contract with an issue that names sentenceClips and the sentence", () => {
    const result = weekSchema.safeParse(sourceWith(stray));
    expect(result.success, "a stray entry is not dropped silently").toBe(false);
    if (result.success) return;
    const issue = result.error.issues.find((item) => item.path.includes("sentenceClips"));
    expect(issue, "an issue with sentenceClips in its path").toBeDefined();
    expect(issue!.message).toContain("A big red bus.");
  });

  it("fails when a sentence appears in more entries than pages", () => {
    const twice = [...W01_SENTENCES, { sentence: "A nest.", file: fileOf(8).replace("s08", "s09") }];
    const result = weekSchema.safeParse(sourceWith(twice));
    expect(result.success, "the second entry of a one-page sentence is reported").toBe(false);
    if (result.success) return;
    const issue = result.error.issues.find((item) => item.path.includes("sentenceClips"));
    expect(issue?.message, "the issue names the sentence").toContain("A nest.");
  });

  it("makes the receiver refuse the week with a message that names sentenceClips", () => {
    const text = JSON.stringify(sourceWith(stray));
    expect(() => receiveWeeks([{ level: 2, week: 1, source: "l2/w01.json", text }])).toThrow(
      /sentenceClips[\s\S]*A big red bus\./,
    );
  });
});

describe("the receiving step with the array form", () => {
  const text = JSON.stringify(sourceWith(W01_SENTENCES.map((entry) => ({ ...entry }))));

  it("lists the file of each entry in the media list as a sentence clip", () => {
    let media: Array<{ file: string; kind: string }> = [];
    try {
      media = receiveWeeks([{ level: 2, week: 1, source: "l2/w01.json", text }])[0]!.media;
    } catch (error) {
      expect((error as Error).message, "the receiver accepts the w01 r5 shape").toBe("");
    }
    const listed = media.filter((item) => item.kind === "sentence-clip").map((item) => item.file);
    expect(listed.sort()).toEqual(W01_SENTENCES.map((entry) => entry.file).sort());
  });

  it("keeps the source text unchanged in the written content", () => {
    let contents = "";
    try {
      contents = receiveWeeks([{ level: 2, week: 1, source: "l2/w01.json", text }])[0]!.contents;
    } catch (error) {
      expect((error as Error).message, "the receiver accepts the w01 r5 shape").toBe("");
    }
    expect(contents).toBe(text);
  });
});

/** One recorded `play` call. */
interface PlayRecord {
  element: HTMLMediaElement;
  src: string;
  time: number;
}

let plays: PlayRecord[] = [];
let pauses: HTMLMediaElement[] = [];
let writes: Array<{ src: string; value: number }> = [];
const times = new WeakMap<HTMLMediaElement, number>();
let timeDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  plays = [];
  pauses = [];
  writes = [];
  vi.useFakeTimers();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
    plays.push({ element: this, src: this.src, time: times.get(this) ?? 0 });
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
    pauses.push(this);
  });
  timeDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "currentTime");
  Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
    configurable: true,
    get(this: HTMLMediaElement) {
      return times.get(this) ?? 0;
    },
    set(this: HTMLMediaElement, value: number) {
      writes.push({ src: this.src, value: Number(value) });
      times.set(this, Number(value));
    },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (timeDescriptor) Object.defineProperty(HTMLMediaElement.prototype, "currentTime", timeDescriptor);
});

const signed = (file: string): string => `https://media.example/${file}`;

/**
 * Renders the decodable part of a source.
 * @param data The week source.
 * @returns The render result.
 */
async function renderDecodable(data: Record<string, any>) {
  const { StorytimeDecodable } = await import("../app/[locale]/st/[level]/[week]/decodable");
  const week = parseOk(data);
  const urls: Record<string, string> = {};
  for (const book of week.books) {
    for (const file of [book.audio.file, ...Object.values(book.audio.wordClips)]) if (file) urls[file] = signed(file);
  }
  for (let n = 1; n <= 9; n += 1) urls[fileOf(n)] = signed(fileOf(n));
  return render(<StorytimeDecodable week={week} locale="en" mediaUrls={urls} />);
}

const sentenceButtons = () => screen.queryAllByRole("button", { name: "Play the whole sentence" });
const next = () => fireEvent.click(screen.getByRole("button", { name: "Next page" }));

/** Taps the sentence button of the page on screen and returns the file that played. */
async function tapSentence(): Promise<string | undefined> {
  const before = plays.length;
  const buttons = sentenceButtons();
  expect(buttons, "one sentence button on the page").toHaveLength(1);
  fireEvent.click(buttons[0]!);
  await act(async () => {
    await Promise.resolve();
  });
  return plays.length === before + 1 ? plays.at(-1)!.src : undefined;
}

describe("the sentence button with the array form", () => {
  it("plays the file of its own sentence on each of the 8 pages, from 0, with no seek and no stop timer", async () => {
    await renderDecodable(sourceWith(W01_SENTENCES.map((entry) => ({ ...entry }))));
    for (let page = 1; page <= 8; page += 1) {
      expect(await tapSentence(), `page ${page}`).toBe(signed(fileOf(page)));
      expect(plays.at(-1)!.time, `page ${page} starts at 0`).toBe(0);
      if (page < 8) next();
    }
    expect(writes.filter((entry) => entry.value !== 0), "no seek into a clip").toHaveLength(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(pauses, "no stop timer").toHaveLength(0);
  });

  it("matches by the sentence text, so the order of the array does not matter", async () => {
    await renderDecodable(sourceWith(W01_SENTENCES.map((entry) => ({ ...entry })).reverse()));
    expect(await tapSentence(), "page 1").toBe(signed(fileOf(1)));
    next();
    expect(await tapSentence(), "page 2").toBe(signed(fileOf(2)));
  });

  it("matches after trimming the sentence and the page text", async () => {
    const padded = W01_SENTENCES.map((entry) => ({ ...entry }));
    padded[0]!.sentence = "  A nest.\n";
    await renderDecodable(sourceWith(padded));
    expect(await tapSentence()).toBe(signed(fileOf(1)));
  });

  it("shows no button on a page whose sentence has no entry", async () => {
    const partial = [W01_SENTENCES[0]!, W01_SENTENCES[2]!].map((entry) => ({ ...entry }));
    await renderDecodable(sourceWith(partial));
    expect(sentenceButtons(), "page 1 has an entry").toHaveLength(1);
    next();
    expect(sentenceButtons(), "page 2 has no entry").toHaveLength(0);
    next();
    expect(sentenceButtons(), "page 3 has an entry").toHaveLength(1);
  });

  it("gives a repeated sentence its own file on each page (the w02 and w06 case)", async () => {
    // Page 4 repeats the text of page 1, and the entries hold the files b1-s01 and b1-s04.
    const repeated = W01_SENTENCES.map((entry) => ({ ...entry }));
    repeated[3] = { sentence: "A nest.", file: fileOf(4) };
    await renderDecodable(
      sourceWith(repeated, (decodable) => {
        decodable.pages[3].text = "A nest.";
        decodable.audio.sentences[3].sentence = "A nest.";
      }),
    );
    expect(await tapSentence(), "page 1").toBe(signed(fileOf(1)));
    next();
    next();
    next();
    expect(await tapSentence(), "page 4 repeats the text and plays its own file").toBe(signed(fileOf(4)));
  });

  it("keeps the map form working (characterization of finding 2b)", async () => {
    await renderDecodable(sourceWith({ "1": fileOf(1), "3": fileOf(3) }));
    expect(await tapSentence()).toBe(signed(fileOf(1)));
  });
});

describe("the lower-case lookup of a tricky word (the w02 case: the word is I, the key is i)", () => {
  /** A week where the tricky word is `I`, its clip key is `i`, and no book clip names it. */
  function capitalTricky(): Record<string, any> {
    const data = raw();
    data.focus.trickyWords = ["I"];
    data.focus.trickyWordClips = { i: "l2/media/w01/words/wa-i.mp3" };
    const decodable = data.books.find((book: { kind: string }) => book.kind === "decodable");
    decodable.soundsPage.tricky = ["I"];
    for (const key of ["a", "and", "can"]) delete decodable.audio.wordClips[key];
    return data;
  }

  it("accepts a clip key that differs in case from the tricky word", () => {
    parseOk(capitalTricky());
  });

  it("plays the clip in the tricky section of the decodable part", async () => {
    await renderDecodable(capitalTricky());
    const tricky = within(screen.getByRole("region", { name: "Tricky words" }));
    const buttons = tricky.queryAllByRole("button", { name: "I" });
    expect(buttons, "one button named I").toHaveLength(1);
    fireEvent.click(buttons[0]!);
    await act(async () => {
      await Promise.resolve();
    });
    expect(plays.map((entry) => entry.src)).toEqual([signed("l2/media/w01/words/wa-i.mp3")]);
    expect(plays[0]!.time).toBe(0);
  });

  it("plays the clip in the tricky section of the teacher week view", async () => {
    const { TeacherWeekView } = await import("../app/[locale]/teacher/[level]/[week]/week-view");
    render(
      <TeacherWeekView
        week={parseOk(capitalTricky())}
        locale="en"
        mediaUrls={{ "l2/media/w01/words/wa-i.mp3": signed("l2/media/w01/words/wa-i.mp3") }}
      />,
    );
    const tricky = within(screen.getByRole("region", { name: "The tricky words" }));
    const buttons = tricky.queryAllByRole("button", { name: "I" });
    expect(buttons, "one button named I").toHaveLength(1);
    fireEvent.click(buttons[0]!);
    await act(async () => {
      await Promise.resolve();
    });
    expect(plays.map((entry) => entry.src)).toEqual([signed("l2/media/w01/words/wa-i.mp3")]);
  });
});

describe("the real packages of the hand-off (read only; the rows run when the folder exists)", () => {
  const root = process.env.STORYTIME_HANDOFF_ROOT ?? join(homedir(), "Desktop", "handoff");
  const packages = [1, 2, 3, 4, 5, 6, 7].map((week) => {
    const name = `w0${week}-storytime-app-package-${week === 1 ? "r5" : "r4"}`;
    return { week, file: join(root, name, "l2", `w0${week}.json`) };
  });
  const present = packages.every((entry) => existsSync(entry.file));

  it.runIf(present)("receives all seven weeks and lists 8 sentence clips for each", () => {
    let weeksChecked = 0;
    let sentenceFiles = 0;
    for (const entry of packages) {
      const text = readFileSync(entry.file, "utf8");
      let received;
      try {
        received = receiveWeeks([{ level: 2, week: entry.week, source: entry.file, text }])[0]!;
      } catch (error) {
        expect((error as Error).message, `the receiver accepts w0${entry.week}`).toBe("");
        continue;
      }
      weeksChecked += 1;
      sentenceFiles += received.media.filter((item) => item.kind === "sentence-clip").length;
    }
    console.log(`real_packages_checked=${weeksChecked} sentence_files_listed=${sentenceFiles}`);
    expect(weeksChecked, "real_packages_checked").toBe(7);
    expect(sentenceFiles, "sentence_files_listed").toBe(56);
  });
});
