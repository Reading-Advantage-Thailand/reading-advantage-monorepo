// @vitest-environment jsdom
/**
 * Task 1.10: a word tap plays the word's own clip (AC-1.12; plan 1.10, strategy P1.2 C1 to C9).
 *
 * The reader plays a slice of the sentence audio today, which vowel-links "a nurse" into an "an"
 * sound. The test records every `play` and every `currentTime` write on the real element, so a
 * second `<audio>`, `new Audio`, or a switched `src` all count. The fixture names are the six
 * clips that Workbooks has (hello, am, nan, pat, sam, teacher); the six words without a clip are
 * ben, i, may, mia, pip, your.
 *
 * At the base C2, C3, C4, C6, C7, C9, the schema default and bad cases, and the receiver block
 * fail with an assertion. C1, C5, and C8 are the named characterization cases.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";

const app = resolve(import.meta.dirname, "..");
const shipped = JSON.parse(readFileSync(resolve(app, "content/l2/w01.json"), "utf8")) as StorytimeWeek;
const receivePath = resolve(app, "scripts/receive-weeks.ts");

/** The six clip names that Workbooks has for the reader book (fixture names). */
const CLIPS: Record<string, string> = {
  hello: "words/hello.mp3",
  am: "words/am.mp3",
  nan: "words/nan.mp3",
  pat: "words/pat.mp3",
  sam: "words/sam.mp3",
  teacher: "words/teacher.mp3",
};

/** The six reader words that have no clip today. */
const NO_CLIP = ["ben", "i", "may", "mia", "pip", "your"];

/** The 12 distinct reader-book words. */
const ALL_WORDS = ["hello", "i", "am", "pat", "may", "sam", "mia", "nan", "ben", "your", "teacher", "pip"];

const labels = {
  readToMe: "Read it to me",
  myTurn: "My turn",
  slow: "Slow",
  previousPage: "Previous page",
  nextPage: "Next page",
  audioError: "Sound could not be played",
  finished: "Book finished",
  playing: "Playing",
};

const THAI_AUDIO_ERROR = "เล่นเสียงไม่ได้";

/** One recorded `play` call. */
interface PlayRecord {
  /** The source of the element at the call. */
  src: string;
  /** The element that played. */
  element: HTMLMediaElement;
}

let plays: PlayRecord[] = [];
let pauses: HTMLMediaElement[] = [];
let writes: Array<{ src: string; value: number }> = [];
const playing = new Set<HTMLMediaElement>();
let timeDescriptor: PropertyDescriptor | undefined;
let previousTime: PropertyDescriptor | undefined;
let endedListener: ((event: Event) => void) | undefined;

/** Creates a ready clone of the shipped week. */
function readyWeek(): StorytimeWeek {
  const copy = structuredClone(shipped);
  return copy;
}

/** Adds one clip map to the read-along book audio. */
function withClips(week: StorytimeWeek, clips: Record<string, string>): StorytimeWeek {
  const book = week.books.find((entry) => entry.kind === "readalong")!;
  (book.audio as unknown as { wordClips: Record<string, string> }).wordClips = clips;
  return week;
}

/** The fixture with the six real clips. */
function clipWeek(): StorytimeWeek {
  return withClips(readyWeek(), { ...CLIPS });
}

/** The fixture with a clip for every reader word. */
function allClipsWeek(): StorytimeWeek {
  const clips: Record<string, string> = {};
  for (const word of ALL_WORDS) clips[word] = `words/${word}.mp3`;
  return withClips(readyWeek(), clips);
}

/** Builds the signed-URL map for every media file the read-along book names. */
function mediaUrls(week: StorytimeWeek): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const book of week.books) {
    for (const file of [book.audio?.file, book.audio?.slowFile]) {
      if (file) urls[file] = `https://media.example/${file}`;
    }
    for (const page of book.pages) {
      if (page.image?.file) urls[page.image.file] = `https://media.example/${page.image.file}`;
    }
    const clips = (book.audio as unknown as { wordClips?: Record<string, string> }).wordClips ?? {};
    for (const file of Object.values(clips)) urls[file] = `https://media.example/${file}`;
  }
  return urls;
}

/** Cuts the read-along book to one page and renumbers its sentences to page 1. */
function pageBook(week: StorytimeWeek, page: number): StorytimeWeek["books"][number] {
  const book = week.books.find((entry) => entry.kind === "readalong")!;
  book.pages = [book.pages[page - 1]!];
  for (const key of ["sentences", "slowSentences"] as const) {
    const list = book.audio![key];
    if (!list) continue;
    book.audio![key] = list
      .filter((sentence) => (sentence.page ?? 1) === page)
      .map((sentence) => ({ ...sentence, page: 1 }));
  }
  return book;
}

/** Loads the reader with a named assertion when the module is missing. */
async function loadReader() {
  try {
    const modulePath = "../app/[locale]/st/[level]/[week]/reader";
    return (await import(/* @vite-ignore */ modulePath)).StorytimeReader as ComponentType<{
      book: StorytimeWeek["books"][number];
      locale: string;
      labels: typeof labels;
      mediaUrls: Record<string, string>;
    }>;
  } catch (error) {
    expect(error, "Storytime must provide the client reader").toBeUndefined();
    throw error;
  }
}

/** Renders one page of the reader and returns its container and sentence audio. */
async function renderPage(week: StorytimeWeek, page: number, locale = "en") {
  const Reader = await loadReader();
  const book = pageBook(week, page);
  const view = render(
    <Reader book={book} locale={locale} labels={labels} mediaUrls={mediaUrls(week)} />,
  );
  const audio = view.container.querySelector<HTMLAudioElement>("audio");
  expect(audio, "the reader must render its page audio element").not.toBeNull();
  return { ...view, audio: audio!, book };
}

/** Returns the word element of one display index. */
function wordElement(container: HTMLElement, index: number): HTMLElement {
  const element = container.querySelector<HTMLElement>(`[data-word="${index}"]`);
  expect(element, `the reader must render the word element ${index}`).not.toBeNull();
  return element!;
}

/** Returns the words of one page in display order. */
function pageWordTexts(week: StorytimeWeek, page: number): string[] {
  const book = week.books.find((entry) => entry.kind === "readalong")!;
  return (book.audio!.sentences ?? [])
    .filter((sentence) => (sentence.page ?? 1) === page)
    .flatMap((sentence) => sentence.words)
    .map((word) => word.word);
}

/** The clip of one word in a fixture, or undefined. */
function clipOf(week: StorytimeWeek, word: string): string | undefined {
  const book = week.books.find((entry) => entry.kind === "readalong")!;
  return (book.audio as unknown as { wordClips?: Record<string, string> }).wordClips?.[word.toLowerCase()];
}

/** The sentence recording of the read-along book. */
function sentenceFile(week: StorytimeWeek): string {
  return week.books.find((entry) => entry.kind === "readalong")!.audio!.file!;
}

/** Reports whether a source ends with one media file. */
function endsWithFile(src: string, file: string): boolean {
  return src.split("?")[0]!.endsWith(file);
}

beforeEach(() => {
  plays = [];
  pauses = [];
  writes = [];
  playing.clear();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
    plays.push({ src: this.src, element: this });
    playing.add(this);
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
    pauses.push(this);
    playing.delete(this);
  });
  previousTime = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "currentTime");
  timeDescriptor = previousTime;
  Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
    configurable: true,
    get(this: HTMLMediaElement) {
      return timeDescriptor!.get!.call(this) as number;
    },
    set(this: HTMLMediaElement, value: number) {
      writes.push({ src: this.src, value: Number(value) });
      timeDescriptor!.set!.call(this, value);
    },
  });
  endedListener = (event: Event) => {
    const element = event.target as HTMLMediaElement | null;
    if (element) playing.delete(element);
  };
  document.addEventListener("ended", endedListener, true);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (endedListener) document.removeEventListener("ended", endedListener, true);
  if (previousTime) Object.defineProperty(HTMLMediaElement.prototype, "currentTime", previousTime);
});

describe("Task 1.10 word clip tap (AC-1.12)", () => {
  it("C1 My turn stays silent until a tap", async () => {
    // Named characterization: the mode click pauses and loads no clip.
    const { unmount } = await renderPage(clipWeek(), 1);
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    expect(plays.length, "My turn must not play before a tap").toBe(0);
    expect(
      plays.some((play) => /words\//.test(play.src)),
      "My turn must not load a clip before a tap",
    ).toBe(false);
    unmount();
  });

  it("C2 a tap plays the word's own clip and never the sentence audio", async () => {
    const week = clipWeek();
    const { container, unmount } = await renderPage(week, 1);
    const sentence = sentenceFile(week);
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    fireEvent.click(wordElement(container, 0));
    const expected = CLIPS.hello!;
    expect(plays.length, "one tap must make exactly one play call").toBe(1);
    expect(
      plays[0]!.src,
      `a tap must play the clip ${expected}, played ${plays[0]!.src}`,
    ).not.toBe("");
    expect(
      endsWithFile(plays[0]!.src, expected),
      `a tap must play the clip ${expected}, played ${plays[0]!.src}`,
    ).toBe(true);
    const sentenceWrites = writes.filter((write) => endsWithFile(write.src, sentence) && write.value !== 0);
    expect(
      `sentence_audio_writes=${sentenceWrites.length}`,
      `the sentence audio must receive no currentTime write, received ${sentenceWrites[0]?.value ?? "none"}`,
    ).toBe("sentence_audio_writes=0");
    expect(
      pauses.some((element) => endsWithFile(element.src, sentence)),
      "the tap must not pause the sentence element",
    ).toBe(false);
    unmount();
  });

  it("C3 every word of every page plays its own clip", async () => {
    const pages = [1, 2, 3, 4, 5, 6, 7, 8];
    const fixture = allClipsWeek();
    const wordsChecked = pages.reduce((sum, page) => sum + pageWordTexts(fixture, page).length, 0);
    expect(`pages_run=${pages.length}`).toBe("pages_run=8");
    expect(`taps_checked=${wordsChecked}`).toBe("taps_checked=33");

    const clipsOfFixture = (fixture.books.find((entry) => entry.kind === "readalong")!.audio as unknown as {
      wordClips: Record<string, string>;
    }).wordClips;
    const insertion = Object.values(clipsOfFixture);
    const letterMap: Record<string, string> = {};
    for (const word of ALL_WORDS) {
      const clip = clipsOfFixture[word];
      if (clip && !letterMap[word[0]!]) letterMap[word[0]!] = clip;
    }

    let taps = 0;
    let indexRejected = false;
    let letterRejected = false;
    let sentenceRejected = false;
    for (const page of pages) {
      const words = pageWordTexts(fixture, page);
      const week = allClipsWeek();
      const { container, unmount } = await renderPage(week, page);
      fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
      for (let index = 0; index < words.length; index += 1) {
        const word = words[index]!;
        const before = plays.length;
        fireEvent.click(wordElement(container, index));
        const played = plays[before];
        const expected = clipOf(week, word);
        expect(expected, `${word} must hold a clip in the fixture`).toBeTruthy();
        expect(
          played ? endsWithFile(played.src, expected!) : false,
          `a tap must play the clip ${expected}, played ${played?.src ?? "nothing"}`,
        ).toBe(true);
        if (insertion[index] !== expected) indexRejected = true;
        if (letterMap[word[0]!] !== expected) letterRejected = true;
        if (clipOf(week, words[0]!) !== expected) sentenceRejected = true;
        taps += 1;
      }
      unmount();
    }
    expect(`taps_checked=${taps}`).toBe("taps_checked=33");

    // A clip chosen by index, by first letter, or by the sentence must be rejected by the taps.
    expect(indexRejected, "an index-keyed clip map must be rejected").toBe(true);
    expect(letterRejected, "a first-letter clip map must be rejected").toBe(true);
    expect(sentenceRejected, "a sentence-keyed clip map must be rejected").toBe(true);
  });

  it("C4 a word with no clip is not a tap target", async () => {
    const week = clipWeek();
    const { container, unmount } = await renderPage(week, 1);
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    const noClip = wordElement(container, 1); // "I"
    expect(noClip.textContent, "the no-clip word must be I").toBe("I");
    expect(noClip.hasAttribute("tabindex"), "a no-clip word must have no tabindex").toBe(false);
    expect(noClip.classList.contains("cursor-pointer"), "a no-clip word must not look tappable").toBe(false);
    const before = plays.length;
    fireEvent.click(noClip);
    expect(`no_clip_taps=${1}`).toBe("no_clip_taps=1");
    expect(plays.length, "a click on a no-clip word must play nothing").toBe(before);
    const hello = wordElement(container, 0);
    expect(hello.hasAttribute("tabindex"), "a clip word must be a tap target").toBe(true);
    const targets = [...container.querySelectorAll<HTMLElement>("[data-word]")].filter((word) =>
      word.hasAttribute("tabindex"),
    );
    expect(`tap_targets_p1=${targets.length}`).toBe("tap_targets_p1=3");
    unmount();
  });

  it("C5 a sentence tap plays nothing", async () => {
    // Named characterization: the sentence span calls onWordTap with no word.
    const { container, unmount } = await renderPage(clipWeek(), 1);
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    const sentence = container.querySelector<HTMLElement>('[data-sentence="0"]');
    expect(sentence, "the reader must render the sentence span").not.toBeNull();
    const before = plays.length;
    const writesBefore = writes.length;
    fireEvent.click(sentence!);
    expect(plays.length, "a sentence tap must play nothing").toBe(before);
    expect(writes.length, "a sentence tap must write no currentTime").toBe(writesBefore);
    unmount();
  });

  it("C6 three rapid taps keep one clip at a time and leave no timer", async () => {
    vi.useFakeTimers();
    const week = allClipsWeek();
    const { container, unmount } = await renderPage(week, 1);
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    let clipsPlayingMax = 0;
    const played: HTMLMediaElement[] = [];
    for (const index of [0, 2, 3]) {
      const before = plays.length;
      fireEvent.click(wordElement(container, index));
      const play = plays[before];
      expect(play, `tap ${index} must play`).toBeTruthy();
      const clip = clipOf(week, pageWordTexts(week, 1)[index]!);
      expect(
        play ? endsWithFile(play.src, clip!) : false,
        `tap ${index} must play its clip ${clip}`,
      ).toBe(true);
      played.push(play!.element);
      clipsPlayingMax = Math.max(clipsPlayingMax, playing.size);
    }
    expect(`clips_playing_max=${clipsPlayingMax}`).toBe("clips_playing_max=1");
    act(() => {
      played.at(-1)!.dispatchEvent(new Event("ended"));
    });
    expect(`timers_after_ended=${vi.getTimerCount()}`).toBe("timers_after_ended=0");
    unmount();
  });

  it("C7 a rejected play shows the alert and the next tap plays its clip", async () => {
    vi.useFakeTimers();
    const week = allClipsWeek();
    const { container, unmount } = await renderPage(week, 1);
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(
      new DOMException("blocked", "NotAllowedError"),
    );
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    fireEvent.click(wordElement(container, 0));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole("alert").textContent, "a rejected play must show the English alert").toBe(
      labels.audioError,
    );
    expect(`timers_after_reject=${vi.getTimerCount()}`).toBe("timers_after_reject=0");
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
      plays.push({ src: this.src, element: this });
      playing.add(this);
      return Promise.resolve();
    });
    const before = plays.length;
    fireEvent.click(wordElement(container, 2));
    const play = plays[before];
    expect(
      play ? endsWithFile(play.src, clipOf(week, "am")!) : false,
      "the next tap must play its clip after a rejection",
    ).toBe(true);
    unmount();

    // The Thai locale shows the Thai alert.
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(
      new DOMException("blocked", "NotAllowedError"),
    );
    const thai = await renderPage(week, 1, "th");
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    fireEvent.click(wordElement(thai.container, 0));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole("alert").textContent, "the Thai page must show the Thai alert").toBe(
      THAI_AUDIO_ERROR,
    );
    thai.unmount();
  });

  it("C8 Read it to me and Slow play only the sentence files", async () => {
    // Named characterization: the listen and slow modes keep the sentence audio.
    const week = allClipsWeek();
    const { unmount } = await renderPage(week, 1);
    const sentence = sentenceFile(week);
    const slow = week.books.find((entry) => entry.kind === "readalong")!.audio!.slowFile!;
    fireEvent.click(screen.getByRole("button", { name: labels.readToMe }));
    expect(plays.length, "Read it to me must play the sentence file").toBe(1);
    expect(endsWithFile(plays[0]!.src, sentence), "Read it to me must use the sentence file").toBe(true);
    fireEvent.click(screen.getByRole("button", { name: labels.slow }));
    const slowPlay = plays.at(-1)!;
    expect(endsWithFile(slowPlay.src, slow), "Slow must use the slow sentence file").toBe(true);
    expect(
      plays.some((play) => /words\//.test(play.src)),
      "the modes must not play a word clip",
    ).toBe(false);
    unmount();
  });

  it("C9 a clip error shows the alert and the reader keeps working", async () => {
    const week = allClipsWeek();
    const { container, unmount } = await renderPage(week, 1);
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    fireEvent.click(wordElement(container, 0));
    const play = plays.at(-1);
    expect(play ? endsWithFile(play.src, clipOf(week, "hello")!) : false, "the tap must play the clip").toBe(
      true,
    );
    act(() => {
      play!.element.dispatchEvent(new Event("error"));
    });
    expect(screen.getByRole("alert"), "a clip error must show the alert").toBeTruthy();
    const before = plays.length;
    fireEvent.click(wordElement(container, 2));
    const next = plays[before];
    expect(
      next ? endsWithFile(next.src, clipOf(week, "am")!) : false,
      "the reader must keep working after a clip error",
    ).toBe(true);
    unmount();
  });
});

describe("Task 1.10 schema block (AC-1.12)", () => {
  /** Builds a week with one `wordClips` value. */
  function weekWithClips(value: unknown): unknown {
    const week = structuredClone(shipped) as unknown as {
      books: Array<{ kind: string; audio: Record<string, unknown> }>;
    };
    const book = week.books.find((entry) => entry.kind === "readalong")!;
    book.audio.wordClips = value;
    return week;
  }

  /**
   * Builds a week with no `wordClips` on the read-along book.
   *
   * The r3 take of 2026-11-09 (plan task 3.2) gives the read-along book its own clips, so the
   * absent case removes the map before the parse (R-EDIT3).
   * @returns A clone of the shipped week with the clip map removed.
   */
  function weekWithoutClips(): unknown {
    const week = structuredClone(shipped) as unknown as {
      books: Array<{ kind: string; audio: Record<string, unknown> }>;
    };
    const book = week.books.find((entry) => entry.kind === "readalong")!;
    delete book.audio.wordClips;
    return week;
  }

  it("accepts a clip map and defaults an absent map to an empty object", () => {
    const good = [
      { hello: "words/hello.mp3" },
      {},
    ];
    expect(`schema_good_cases=${good.length}`).toBe("schema_good_cases=2");
    for (const clips of good) {
      const parsed = weekSchema.safeParse(weekWithClips(clips));
      expect(parsed.success, `${JSON.stringify(clips)} must parse`).toBe(true);
    }
    const absent = weekSchema.safeParse(structuredClone(shipped));
    expect(absent.success, "the shipped week must parse").toBe(true);
    // The shipped week now holds clips, so the default case parses the clone with the map removed.
    const noClips = weekSchema.safeParse(weekWithoutClips());
    expect(noClips.success, "a week with no clip map must parse").toBe(true);
    if (noClips.success) {
      const audio = noClips.data.books.find((entry) => entry.kind === "readalong")!.audio as unknown as {
        wordClips?: unknown;
      };
      expect(audio.wordClips, "an absent wordClips must default to {}").toEqual({});
    }
  });

  it("rejects 14 bad clip maps", () => {
    const longValue = `words/${"a".repeat(200)}.mp3`;
    const longKey = "a".repeat(41);
    const bad: Array<{ label: string; value: unknown }> = [
      { label: "URL", value: { hello: "https://x/y.mp3" } },
      { label: "parent", value: { hello: "../x.mp3" } },
      { label: "absolute", value: { hello: "/abs.mp3" } },
      { label: "backslash", value: { hello: "words\\hello.mp3" } },
      { label: "empty value", value: { hello: "" } },
      { label: "number", value: { hello: 3 } },
      { label: "array", value: { hello: ["words/hello.mp3"] } },
      { label: "long value", value: { hello: longValue } },
      { label: "upper-case key", value: { Hello: "words/hello.mp3" } },
      { label: "empty key", value: { "": "words/hello.mp3" } },
      { label: "space key", value: { "hel lo": "words/hello.mp3" } },
      { label: "__proto__", value: JSON.parse('{"__proto__":"words/hello.mp3"}') },
      { label: "constructor", value: { constructor: "words/hello.mp3" } },
      { label: "long key", value: { [longKey]: "words/hello.mp3" } },
    ];
    expect(`schema_bad_cases=${bad.length}`).toBe("schema_bad_cases=14");
    for (const entry of bad) {
      const parsed = weekSchema.safeParse(weekWithClips(entry.value));
      expect(
        parsed.success,
        `wordClips value "${entry.label}" must be rejected, parsed`,
      ).toBe(false);
    }
  });
});

describe("Task 1.10 receiver block (Q16)", () => {
  it("lists every clip file once with kind word-clip", async () => {
    const modulePath = "../scripts/receive-weeks";
    const receiver = (await import(/* @vite-ignore */ modulePath)) as {
      mediaOf: (week: StorytimeWeek) => Array<{ file: string; kind: string }>;
      mediaPathsOf: (week: unknown) => Array<{ path: string; file: string }>;
    };
    const parsed = weekSchema.parse(allClipsWeek());
    const list = receiver.mediaOf(parsed);
    const clips = list.filter((entry) => entry.kind === "word-clip");
    // The r3 take of 2026-11-09 (plan task 3.2) gives the decodable book 11 clips, so the week
    // of this fixture holds 23 clip files: the 12 reader words and the 11 decodable clips.
    // The old pin was listed_clips=12, when only the read-along book held clips (R-EDIT3).
    expect(
      `listed_clips=${clips.length}`,
      `mediaOf must list the 23 clip files, listed ${clips.length}`,
    ).toBe("listed_clips=23");
    const listed = new Set(list.map((entry) => entry.file));
    expect(
      `listed_distinct_clips=${new Set(clips.map((entry) => entry.file)).size}`,
      "every clip file must be listed once",
    ).toBe("listed_distinct_clips=23");
    // The login pin excludes the paths under `approval.`: they are provenance, not media.
    const missing = receiver
      .mediaPathsOf(parsed)
      .filter((entry) => !entry.path.startsWith("approval.") && !listed.has(entry.file));
    expect(
      `walk_not_in_list=${missing.length}`,
      `every media path must be listed, missing ${missing.slice(0, 2).map((entry) => entry.path).join(", ")}`,
    ).toBe("walk_not_in_list=0");
  });
});
