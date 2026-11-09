// @vitest-environment jsdom
/**
 * Adversarial word clip cases for the Storytime P1.6 round.
 *
 * K1 attacks the schema with inherited-property keys and the 40/41 key length
 * boundary. K2 and K3 bypass the schema and inject hostile clip maps into the
 * live reader (defense in depth): inherited names must not become tap targets,
 * and a `../` value must produce no playable URL. K4 storms the tap path, K5
 * switches mode during a clip (pinned invariants only), K6 drops the signed
 * URL, and K7 puts clips on the decodable book to check for cross-book leaks.
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

/** The four words of page 1, each with a clip in the all-clips fixture. */
const PAGE_ONE_WORDS = ["hello", "i", "am", "pat"];

interface PlayRecord {
  src: string;
  element: HTMLMediaElement;
}

let plays: PlayRecord[] = [];
let pauses: HTMLMediaElement[] = [];
const playing = new Set<HTMLMediaElement>();
let endedListener: ((event: Event) => void) | undefined;

/** Creates a ready deep clone of the shipped week. */
function readyWeek(): StorytimeWeek {
  return structuredClone(shipped);
}

/** The read-along book of one week. */
function readerBook(week: StorytimeWeek): StorytimeWeek["books"][number] {
  return week.books.find((entry) => entry.kind === "readalong")!;
}

/** Adds one clip map to the read-along book audio, bypassing the schema. */
function injectClips(week: StorytimeWeek, clips: Record<string, string>): StorytimeWeek {
  (readerBook(week).audio as unknown as { wordClips: Record<string, string> }).wordClips = clips;
  return week;
}

/** The fixture with a clip for every page-1 word. */
function allClipsWeek(): StorytimeWeek {
  const clips: Record<string, string> = {};
  for (const word of PAGE_ONE_WORDS) clips[word] = `words/${word}.mp3`;
  return injectClips(readyWeek(), clips);
}

/**
 * Builds the signed-URL map of one week. Hostile clip values (starting with
 * `.` or holding `..`) stay unsigned, as the signer would never sign them.
 */
function safeMediaUrls(week: StorytimeWeek): Record<string, string> {
  const urls: Record<string, string> = {};
  const sign = (file: string | undefined) => {
    if (file && !file.startsWith(".") && !file.includes("..")) urls[file] = `https://media.example/${file}`;
  };
  for (const book of week.books) {
    sign(book.audio?.file ?? undefined);
    sign(book.audio?.slowFile ?? undefined);
    for (const page of book.pages) sign(page.image?.file ?? undefined);
    const clips = (book.audio as unknown as { wordClips?: Record<string, string> }).wordClips ?? {};
    for (const file of Object.values(clips)) sign(file);
  }
  return urls;
}

/** Cuts the read-along book to one page and renumbers its sentences to page 1. */
function pageBook(week: StorytimeWeek, page: number): StorytimeWeek["books"][number] {
  const book = readerBook(week);
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

/** Loads the client reader with a named assertion when the module is missing. */
async function loadReader() {
  const modulePath = "../app/[locale]/st/[level]/[week]/reader";
  return (await import(/* @vite-ignore */ modulePath)).StorytimeReader as ComponentType<{
    book: StorytimeWeek["books"][number];
    locale: string;
    labels: typeof labels;
    mediaUrls: Record<string, string>;
  }>;
}

/** Renders page 1 of the reader and returns the view. */
async function renderPage(week: StorytimeWeek, mediaUrls = safeMediaUrls(week)) {
  const Reader = await loadReader();
  return render(<Reader book={pageBook(week, 1)} locale="en" labels={labels} mediaUrls={mediaUrls} />);
}

/** Returns the word element of one display index. */
function wordElement(container: HTMLElement, index: number): HTMLElement {
  const element = container.querySelector<HTMLElement>(`[data-word="${index}"]`);
  expect(element, `the reader must render the word element ${index}`).not.toBeNull();
  return element!;
}

/** Counts the tap targets (clip words) of the rendered page. */
function tapTargets(container: HTMLElement): number {
  return [...container.querySelectorAll<HTMLElement>("[data-word]")].filter((word) =>
    word.hasAttribute("tabindex"),
  ).length;
}

/** The sentence recording of the read-along book. */
function sentenceFile(week: StorytimeWeek): string {
  return readerBook(week).audio!.file!;
}

beforeEach(() => {
  plays = [];
  pauses = [];
  playing.clear();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
    plays.push({ src: this.src, element: this });
    playing.add(this);
    // The browser fires `play`; jsdom does not, so the stub sends it.
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
    pauses.push(this);
    playing.delete(this);
    this.dispatchEvent(new Event("pause"));
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
});

describe("adversarial word clips (K1-K7)", () => {
  it("K1 the schema rejects inherited-property keys and pins the 40/41 key boundary", () => {
    const weekWithClips = (value: unknown): unknown => {
      const week = structuredClone(shipped) as unknown as {
        books: Array<{ kind: string; audio: Record<string, unknown> }>;
      };
      week.books.find((entry) => entry.kind === "readalong")!.audio.wordClips = value;
      return week;
    };
    // A plain lookup `({}).toString` is truthy, so a key allowlist must exclude
    // every inherited name; hasOwn alone cannot, a JSON.parse own key would pass it.
    // ("watch" is not on Object.prototype in V8, so it is a legal key and stays out.)
    const hostileKeys = ["toString", "hasOwnProperty", "valueOf", "constructor", "isPrototypeOf"];
    expect(`hostile_keys=${hostileKeys.length}`).toBe("hostile_keys=5");
    for (const key of hostileKeys) {
      const parsed = weekSchema.safeParse(weekWithClips({ [key]: `words/${key}.mp3` }));
      expect(parsed.success, `the inherited key "${key}" must be rejected`).toBe(false);
    }
    const boundary40 = "a".repeat(40);
    const boundary41 = "a".repeat(41);
    expect(weekSchema.safeParse(weekWithClips({ [boundary40]: "words/long.mp3" })).success, "40 chars must parse").toBe(true);
    expect(weekSchema.safeParse(weekWithClips({ [boundary41]: "words/long.mp3" })).success, "41 chars must be rejected").toBe(false);
  });

  it("K2 a prototype-polluted clip map grants no tap target beyond the own clips", async () => {
    const polluted = JSON.parse(
      '{"toString":"words/to-string.mp3","constructor":"words/constructor.mp3","hello":"words/hello.mp3"}',
    ) as Record<string, string>;
    const week = injectClips(readyWeek(), polluted);
    const { container, unmount } = await renderPage(week);
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    expect(tapTargets(container), "only the own hello clip may be a tap target").toBe(1);
    const before = plays.length;
    fireEvent.click(wordElement(container, 1)); // "I"
    fireEvent.click(wordElement(container, 2)); // "am"
    expect(plays.length, "no inherited name may resolve to a clip").toBe(before);
    fireEvent.click(wordElement(container, 0)); // "Hello"
    expect(plays.length, "the own hello clip must still play").toBe(before + 1);
    expect(plays.at(-1)!.src, "the own clip must play its own file").toContain("words/hello.mp3");
    unmount();
  });

  it("K3 a parent-path clip value yields no playable URL and shows the alert", async () => {
    // The schema already rejects "../"; this case proves the runtime layer never
    // concatenates a base URL onto an unsigned hostile value (kills URL concatenation).
    const week = injectClips(readyWeek(), { hello: "../escape.mp3", am: "words/am.mp3" });
    const { container, unmount } = await renderPage(week);
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    const before = plays.length;
    fireEvent.click(wordElement(container, 0)); // "Hello" holds the hostile value
    expect(plays.length, "an unsigned hostile value must produce no play call").toBe(before);
    expect(
      plays.some((play) => play.src.includes("..")),
      "no play may carry a parent path (kills URL concatenation)",
    ).toBe(false);
    expect(screen.getByRole("alert").textContent, "the failed clip must show the alert").toBe(labels.audioError);
    // The honest clip beside it still works.
    fireEvent.click(wordElement(container, 2)); // "am"
    expect(plays.at(-1)!.src, "the honest clip must keep working").toContain("words/am.mp3");
    unmount();
  });

  it("K4 twenty rapid taps keep one clip element and leave no timer", async () => {
    vi.useFakeTimers();
    const week = allClipsWeek();
    const { container, unmount } = await renderPage(week);
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    const played: HTMLMediaElement[] = [];
    let clipsPlayingMax = 0;
    for (let tap = 0; tap < 20; tap++) {
      const before = plays.length;
      fireEvent.click(wordElement(container, tap % 4));
      const play = plays[before];
      expect(play, `tap ${tap} must play`).toBeTruthy();
      played.push(play!.element);
      clipsPlayingMax = Math.max(clipsPlayingMax, playing.size);
    }
    expect(`taps_checked=20`).toBe("taps_checked=20");
    expect(`clips_playing_max=${clipsPlayingMax}`).toBe("clips_playing_max=1");
    expect(
      new Set(played).size,
      "every tap must reuse the one clip element (a new Audio per tap would leak)",
    ).toBe(1);
    act(() => {
      played.at(-1)!.dispatchEvent(new Event("ended"));
    });
    expect(`timers_after_ended=${vi.getTimerCount()}`).toBe("timers_after_ended=0");
    unmount();
  });

  it("K5 a mode switch during a clip keeps the pinned listen invariants", async () => {
    const week = allClipsWeek();
    const { container, unmount } = await renderPage(week);
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    fireEvent.click(wordElement(container, 0));
    const clipPlay = plays.at(-1)!;
    expect(clipPlay.src, "the tap must play the clip first").toContain("words/hello.mp3");

    fireEvent.click(screen.getByRole("button", { name: labels.readToMe }));
    // Pinned invariants: the sentence file plays, the listen mode is pressed, no alert.
    expect(
      plays.at(-1)!.src.split("?")[0]!.endsWith(sentenceFile(week)),
      "Read it to me must play the sentence file",
    ).toBe(true);
    // A pressed mode button shows the "Playing" label, so find it by state.
    const pressed = [...container.querySelectorAll<HTMLElement>("button[aria-pressed='true']")];
    expect(pressed.length, "exactly one mode must be pressed after the switch").toBe(1);
    expect(pressed[0]!.textContent, "the pressed mode must be the listen mode (shows Playing)").toBe(
      labels.playing,
    );
    expect(screen.queryByRole("alert"), "a mode switch must not raise the alert").toBeNull();
    // Observation (not pinned, reported as a nonblocking finding): the clip element
    // stays in the playing set after the switch, so clip and sentence overlap.
    const clipStillPlaying = playing.has(clipPlay.element);
    expect(
      `clip_still_playing_after_mode_switch=${clipStillPlaying}`,
      "observation record: the clip element keeps playing over the sentence audio",
    ).toBe(`clip_still_playing_after_mode_switch=${clipStillPlaying}`);
    unmount();
  });

  it("K6 a clip with no signed URL shows the alert and the reader keeps working", async () => {
    const week = allClipsWeek();
    const urls = safeMediaUrls(week);
    for (const word of PAGE_ONE_WORDS) delete urls[`words/${word}.mp3`]; // the signer never signed the clips
    const { container, unmount } = await renderPage(week, urls);
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    const before = plays.length;
    fireEvent.click(wordElement(container, 0));
    expect(plays.length, "an unsigned clip must not play").toBe(before);
    expect(screen.getByRole("alert").textContent, "the missing URL must show the alert").toBe(labels.audioError);
    fireEvent.click(screen.getByRole("button", { name: labels.readToMe }));
    expect(
      plays.at(-1)!.src.split("?")[0]!.endsWith(sentenceFile(week)),
      "the reader must keep working after the failed clip",
    ).toBe(true);
    unmount();
  });

  it("K7 clips on the decodable book list as word-clip and never leak into the reader", async () => {
    const week = readyWeek();
    const decodable = week.books.find((entry) => entry.kind === "decodable")!;
    (decodable.audio as unknown as { wordClips: Record<string, string> }).wordClips = {
      cat: "words/cat.mp3",
      sat: "words/sat.mp3",
    };
    const parsed = weekSchema.safeParse(week);
    expect(parsed.success, "wordClips on the decodable book must parse").toBe(true);

    const receiver = (await import(/* @vite-ignore */ "../scripts/receive-weeks")) as {
      mediaOf: (week: StorytimeWeek) => Array<{ file: string; kind: string }>;
    };
    const clips = receiver.mediaOf(parsed.data!).filter((entry) => entry.kind === "word-clip");
    // The r3 take of 2026-11-09 (plan task 3.2) gives the read-along book 12 clips, so the week
    // of this fixture holds 14 clip files: the 12 read-along clips and the 2 decodable clips.
    // The old pin was decodable_clips_listed=2, when only the decodable book held clips (R-EDIT3).
    expect(
      `decodable_clips_listed=${clips.length}`,
      `the receiver must list every clip file with kind word-clip, listed ${clips.length}`,
    ).toBe("decodable_clips_listed=14");
    expect(
      `listed_distinct_clips=${new Set(clips.map((entry) => entry.file)).size}`,
      "every clip file must be listed once",
    ).toBe("listed_distinct_clips=14");
    expect(clips.map((entry) => entry.file).sort(), "the listed files must hold both decodable clips").toEqual([
      "l2/media/w01/words/wa-am.mp3",
      "l2/media/w01/words/wa-ben.mp3",
      "l2/media/w01/words/wa-hello.mp3",
      "l2/media/w01/words/wa-i.mp3",
      "l2/media/w01/words/wa-may.mp3",
      "l2/media/w01/words/wa-mia.mp3",
      "l2/media/w01/words/wa-nan.mp3",
      "l2/media/w01/words/wa-pat.mp3",
      "l2/media/w01/words/wa-pip.mp3",
      "l2/media/w01/words/wa-sam.mp3",
      "l2/media/w01/words/wa-teacher.mp3",
      "l2/media/w01/words/wa-your.mp3",
      "words/cat.mp3",
      "words/sat.mp3",
    ]);

    // The read-along reader renders only its own book: no decodable clip may reach a read-along
    // word. The r3 take of 2026-11-09 (plan task 3.2) gives the read-along book its own clips, so
    // page 1 holds a tap target for each word that holds one. The old pin was 0 tap targets,
    // when the read-along book held no clip (R-EDIT3).
    const readalongClips = new Set(Object.values(readerBook(parsed.data!).audio!.wordClips ?? {}));
    const decodableClips = ["words/cat.mp3", "words/sat.mp3"];
    const { container, unmount } = await renderPage(parsed.data!);
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    const targets = [...container.querySelectorAll<HTMLElement>("[data-word]")].filter((word) =>
      word.hasAttribute("tabindex"),
    );
    expect(
      `tap_targets=${targets.length}`,
      `page 1 holds a tap target for each clipped word, found ${targets.length}`,
    ).toBe("tap_targets=4");
    const before = plays.length;
    for (const target of targets) {
      const word = target.textContent?.trim() ?? "";
      expect(word, "a tap target must hold its word").not.toBe("");
      fireEvent.click(target);
      const src = plays.at(-1)!.src;
      expect(
        readalongClips.has(src.replace("https://media.example/", "")),
        `the tap of "${word}" must play its own read-along clip, played ${src}`,
      ).toBe(true);
      expect(
        decodableClips.some((clip) => src.includes(clip)),
        `the tap of "${word}" must not play a decodable clip`,
      ).toBe(false);
    }
    expect(plays.length, "each read-along tap plays one clip").toBe(before + targets.length);
    unmount();
  });
});
