// @vitest-environment jsdom
/**
 * Task 6.2, round 3 (PM 2026-11-13 13:25), item (6): the Workbooks clip fields.
 *
 * PM words, quoted exactly: "(6) Next for Storytime: wire the Workbooks fields when the packages
 * land (14:00): opening.wordClips, focus.family.wordClips, focus.trickyWordClips,
 * books[].audio.sentenceClips; start the Red for the sentence button now so that Green starts at
 * the hand-off."
 *
 * The packages in `~/Desktop/handoff/` did not hold the new fields when this Red was written (the
 * newest w01 package, r4, holds only `books[].audio.wordClips`). The shapes below are INFERRED
 * from the field names and from the existing `books[].audio.wordClips` and `sentenceClips` maps.
 * The defaults of this round, until the hand-off shows another shape:
 * - `opening.wordClips`, `focus.family.wordClips`, and `focus.trickyWordClips` are each a map of
 *   the lower-case word to one whole clip file. The key and the path follow the rules of
 *   `books[].audio.wordClips`. Each map defaults to `{}`.
 * - `books[].audio.sentenceClips` stays as task 6.2 finding 2 built it (the page number to a clip
 *   file). Its button rows already pass in `p6-look-findings-sentence-clips.test.tsx`, so this
 *   file holds no copy of them.
 * - The receiver lists each clip with the kind `word-clip` and the media rules of the other word
 *   clips.
 * - The opening routine of the teacher lesson flow shows its prompts as text. A word of a prompt
 *   with a clip in `opening.wordClips` becomes a button with the word as its name. The family
 *   words and the tricky words of the teacher week view do the same. The tricky words of the
 *   child decodable part also read `focus.trickyWordClips` when the book map has no clip.
 * - A tap plays the whole clip from 0: no `currentTime` seek and no stop timer (the order of
 *   2026-11-13: no sliced audio). A word with no clip stays plain text.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";
import { mediaOf, mediaPathsOf, receiveWeeks } from "../scripts/receive-weeks";

const app = resolve(import.meta.dirname, "..");
const sourceText = readFileSync(resolve(app, "content/l2/w01.json"), "utf8");
const raw = (): Record<string, any> => JSON.parse(sourceText);

/** The clip maps of the fixture: the Workbooks fields of this round. */
const OPENING = {
  nose: "l2/media/w01/opening/wa-nose.mp3",
  sun: "l2/media/w01/opening/wa-sun.mp3",
};
const FAMILY = {
  hello: "l2/media/w01/family/wa-hello.mp3",
  teacher: "l2/media/w01/family/wa-teacher.mp3",
};
const TRICKY = {
  a: "l2/media/w01/tricky/wa-a.mp3",
  can: "l2/media/w01/tricky/wa-can.mp3",
};
const SENTENCES = { "1": "l2/media/w01/sentences/s01.mp3" };

/** The week source with the four Workbooks clip maps put in. */
function sourceWithClips(): Record<string, any> {
  const data = raw();
  data.opening.wordClips = { ...OPENING };
  data.focus.family.wordClips = { ...FAMILY };
  data.focus.trickyWordClips = { ...TRICKY };
  data.books.find((book: { kind: string }) => book.kind === "decodable").audio.sentenceClips = { ...SENTENCES };
  return data;
}

const weekWithClips = (): StorytimeWeek => weekSchema.parse(sourceWithClips());

/** One of the three new maps, as the contract parses it. */
type Maps = { opening?: { wordClips?: unknown }; focus: { trickyWordClips?: unknown; family?: { wordClips?: unknown } } };
const mapsOf = (week: StorytimeWeek): Maps => week as unknown as Maps;

/** The three new maps with the place that holds each. */
const PLACES: Array<[string, (data: Record<string, any>, map: unknown) => void]> = [
  ["opening.wordClips", (data, map) => void (data.opening.wordClips = map)],
  ["focus.family.wordClips", (data, map) => void (data.focus.family.wordClips = map)],
  ["focus.trickyWordClips", (data, map) => void (data.focus.trickyWordClips = map)],
];

describe("the contract of the three new clip maps", () => {
  it("defaults each map to an empty object on a week with none", () => {
    const week = mapsOf(weekSchema.parse(raw()));
    expect(week.opening?.wordClips, "opening.wordClips").toEqual({});
    expect(week.focus.family?.wordClips, "focus.family.wordClips").toEqual({});
    expect(week.focus.trickyWordClips, "focus.trickyWordClips").toEqual({});
  });

  it("keeps each map that a week holds", () => {
    const week = mapsOf(weekWithClips());
    expect(week.opening?.wordClips).toEqual(OPENING);
    expect(week.focus.family?.wordClips).toEqual(FAMILY);
    expect(week.focus.trickyWordClips).toEqual(TRICKY);
  });

  it.each(PLACES.flatMap(([place, set]) => ["Hello", "constructor", "two words", ""].map((key) => [place, key, set] as const)))(
    "rejects the key %s of %s",
    (_place, key, set) => {
      const data = raw();
      set(data, { [key]: "l2/media/w01/words/wa-x.mp3" });
      expect(() => weekSchema.parse(data)).toThrow();
    },
  );

  it.each(PLACES.flatMap(([place, set]) => ["../outside.mp3", "https://media.example/x.mp3", ""].map((file) => [place, file, set] as const)))(
    "rejects the path %s in %s",
    (_place, file, set) => {
      const data = raw();
      set(data, { hello: file });
      expect(() => weekSchema.parse(data)).toThrow();
    },
  );
});

describe("the receiving step with the four clip maps", () => {
  const source = { level: 2, week: 1, source: "l2/w01.json", text: JSON.stringify(sourceWithClips()) };

  it("receives a package that holds the four maps and keeps each map in the written content", () => {
    const [received] = receiveWeeks([source]);
    const written = JSON.parse(received!.contents) as Record<string, any>;
    expect(written.opening.wordClips).toEqual(OPENING);
    expect(written.focus.family.wordClips).toEqual(FAMILY);
    expect(written.focus.trickyWordClips).toEqual(TRICKY);
    const decodable = written.books.find((book: { kind: string }) => book.kind === "decodable");
    expect(decodable.audio.sentenceClips).toEqual(SENTENCES);
  });

  it.each([
    ["opening.wordClips", Object.values(OPENING), "word-clip"],
    ["focus.family.wordClips", Object.values(FAMILY), "word-clip"],
    ["focus.trickyWordClips", Object.values(TRICKY), "word-clip"],
    ["books[].audio.sentenceClips", Object.values(SENTENCES), "sentence-clip"],
  ])("lists each clip of %s in the media list", (_place, files, kind) => {
    const [received] = receiveWeeks([source]);
    for (const file of files) {
      const entry = received!.media.find((item) => item.file === file);
      expect(entry, `the media list holds ${file}`).toBeDefined();
      expect(entry!.kind).toBe(kind);
    }
  });

  it("leaves no clip path of the four maps out of the media list", () => {
    const week = weekWithClips();
    const listed = new Set(mediaOf(week).map((entry) => entry.file));
    // Only the four clip maps count: the walk also finds `approval.audio.source`, an old path that
    // the media list never held, and that is outside this round.
    const clipMap = /^(opening\.wordClips|focus\.family\.wordClips|focus\.trickyWordClips|books\.[0-9]+\.audio\.sentenceClips)\./;
    const unlisted = mediaPathsOf(week)
      .filter((entry) => clipMap.test(entry.path) && !listed.has(entry.file))
      .map((entry) => entry.path);
    expect(unlisted, "the field paths of the unlisted clip paths").toEqual([]);
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

/** The signed-URL map of every media file of the fixture week. */
function urlsOf(week: StorytimeWeek): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const entry of mediaOf(week)) if (!entry.missing) urls[entry.file] = signed(entry.file);
  return urls;
}

/**
 * Checks that the last tap played one whole clip from 0, with no seek and no stop timer.
 * @param file The clip file that the tap plays.
 * @param count The number of plays that the test expects.
 */
async function expectWholeClip(file: string, count = 1): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
  expect(plays.map((entry) => entry.src)).toEqual(Array(count).fill(signed(file)));
  expect(plays.at(-1)!.time, "the clip starts at 0").toBe(0);
  expect(writes.filter((entry) => entry.value !== 0), "no seek into the clip").toHaveLength(0);
  const before = pauses.length;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(pauses.length, "no stop timer pauses the clip").toBe(before);
}

describe("the tricky words of the child decodable part with focus.trickyWordClips", () => {
  /** A week where `and` has a tricky clip and no book clip, and `can` has neither. */
  function trickyWeek(): StorytimeWeek {
    const data = sourceWithClips();
    const decodable = data.books.find((book: { kind: string }) => book.kind === "decodable");
    delete decodable.audio.wordClips.and;
    delete decodable.audio.wordClips.can;
    data.focus.trickyWordClips = { and: "l2/media/w01/tricky/wa-and.mp3" };
    return weekSchema.parse(data);
  }

  async function renderTricky() {
    const { StorytimeDecodable } = await import("../app/[locale]/st/[level]/[week]/decodable");
    const week = trickyWeek();
    render(<StorytimeDecodable week={week} locale="en" mediaUrls={urlsOf(week)} />);
    return within(screen.getByRole("region", { name: "Tricky words" }));
  }

  it("turns a tricky word with a tricky clip into a button that plays the whole clip", async () => {
    const tricky = await renderTricky();
    const buttons = tricky.queryAllByRole("button", { name: "and" });
    expect(buttons, "one button named and").toHaveLength(1);
    fireEvent.click(buttons[0]!);
    await expectWholeClip("l2/media/w01/tricky/wa-and.mp3");
  });

  it("keeps a tricky word with no clip anywhere as plain text", async () => {
    const tricky = await renderTricky();
    expect(tricky.queryAllByRole("button", { name: "can" })).toHaveLength(0);
    expect(tricky.getByText("can")).toBeInTheDocument();
  });
});

describe("the teacher week view with the clip maps", () => {
  async function renderView() {
    const { TeacherWeekView } = await import("../app/[locale]/teacher/[level]/[week]/week-view");
    const week = weekWithClips();
    render(<TeacherWeekView week={week} locale="en" mediaUrls={urlsOf(week)} />);
    return {
      family: within(screen.getByRole("region", { name: "The family words" })),
      tricky: within(screen.getByRole("region", { name: "The tricky words" })),
    };
  }

  it("turns a family word with a clip into a button that plays the whole clip", async () => {
    const { family } = await renderView();
    const buttons = family.queryAllByRole("button", { name: "hello" });
    expect(buttons, "one button named hello").toHaveLength(1);
    fireEvent.click(buttons[0]!);
    await expectWholeClip(FAMILY.hello);
  });

  it("keeps a family word with no clip as plain text", async () => {
    const { family } = await renderView();
    expect(family.queryAllByRole("button", { name: "boy" })).toHaveLength(0);
    expect(family.getByText("boy")).toBeInTheDocument();
  });

  it("turns a tricky word with a clip into a button that plays the whole clip", async () => {
    const { tricky } = await renderView();
    const buttons = tricky.queryAllByRole("button", { name: "can" });
    expect(buttons, "one button named can").toHaveLength(1);
    fireEvent.click(buttons[0]!);
    await expectWholeClip(TRICKY.can);
  });

  it("keeps a tricky word with no clip as plain text", async () => {
    const { tricky } = await renderView();
    expect(tricky.queryAllByRole("button", { name: "and" })).toHaveLength(0);
    expect(tricky.getByText("and")).toBeInTheDocument();
  });

  it("plays one clip at a time across the family words and the tricky words", async () => {
    const { family, tricky } = await renderView();
    const first = family.queryAllByRole("button", { name: "hello" });
    const second = tricky.queryAllByRole("button", { name: "can" });
    expect(first, "a family button named hello").toHaveLength(1);
    expect(second, "a tricky button named can").toHaveLength(1);
    fireEvent.click(first[0]!);
    fireEvent.click(second[0]!);
    await act(async () => {
      await Promise.resolve();
    });
    expect(plays.map((entry) => entry.src)).toEqual([signed(FAMILY.hello), signed(TRICKY.can)]);
    const last = plays.at(-1)!.element;
    for (const earlier of plays.slice(0, -1)) {
      expect(earlier.element === last || pauses.includes(earlier.element), "the first clip stops").toBe(true);
    }
  });
});

describe("the opening routine of the teacher lesson flow with opening.wordClips", () => {
  async function renderOpening() {
    const { TeacherLessonFlow } = await import("../app/[locale]/teacher/[level]/[week]/[day]/lesson-flow");
    const week = weekWithClips();
    render(<TeacherLessonFlow week={week} day={1} locale="en" mediaUrls={urlsOf(week)} />);
    const section = screen.getByRole("region", { name: "The opening routine" });
    return Object.assign(within(section), { text: () => section.textContent ?? "" });
  }

  it("turns a prompt word with a clip into a button that plays the whole clip", async () => {
    const opening = await renderOpening();
    const buttons = opening.queryAllByRole("button", { name: /^nose$/i });
    expect(buttons, "a button named nose").not.toHaveLength(0);
    fireEvent.click(buttons[0]!);
    await expectWholeClip(OPENING.nose);
  });

  it("matches a capitalised prompt word to the lower-case key", async () => {
    const opening = await renderOpening();
    const buttons = opening.queryAllByRole("button", { name: /^sun$/i });
    expect(buttons, "a button named sun or Sun").not.toHaveLength(0);
    fireEvent.click(buttons[0]!);
    await expectWholeClip(OPENING.sun);
  });

  it("keeps a prompt word with no clip as plain text and keeps the prompt readable", async () => {
    const opening = await renderOpening();
    expect(opening.queryAllByRole("button", { name: /^listen$/i })).toHaveLength(0);
    expect(opening.text(), "the prompt keeps its words in the text").toMatch(
      /Listen: nose\. What is the first sound\?/,
    );
  });
});
