// @vitest-environment jsdom
/**
 * Task 2.2a: a mode switch pauses the word clip (carried Phase 1 items N3 and N4; strategy P2.2
 * `look-clip-mode-switch` and P2.7; the K5 finding of the adversarial round).
 *
 * In "My turn" a tap on a word with a clip plays that clip on its own element. When the child then
 * presses "Read it to me", "Slow", or "My turn" again, the clip keeps playing over the new sound
 * for the length of the clip, and the child hears a double sound. After each switch the clip
 * element must leave the playing set, and at most one element may play (`playing_max`).
 *
 * The harness is the one of `look-adversarial-clips.test.tsx` (the K5 case there stays green):
 * the `play` and `pause` stubs keep a set of the elements that play. The setup case (a clip plays
 * after a tap) passes at the base (named characterization). The three switch cases fail at the
 * base because the reader pauses only the sentence audio.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StorytimeWeek } from "../lib/contracts/week";

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

/** The page 1 words of the shipped reader book. */
const PAGE_ONE_WORDS = ["hello", "i", "am", "pat"];

/** The three switches that must pause the clip (M1 to M3). */
const SWITCHES = [
  { id: "M1", button: labels.readToMe, sound: "sentence" },
  { id: "M2", button: labels.slow, sound: "slow" },
  { id: "M3", button: labels.myTurn, sound: null },
] as const;

interface PlayRecord {
  src: string;
  element: HTMLMediaElement;
}

let plays: PlayRecord[] = [];
const playing = new Set<HTMLMediaElement>();
let playingMax = 0;
let endedListener: ((event: Event) => void) | undefined;

/** The read-along book of one week. */
function readerBook(week: StorytimeWeek): StorytimeWeek["books"][number] {
  return week.books.find((entry) => entry.kind === "readalong")!;
}

/** The shipped week with one clip for each page 1 word. */
function allClipsWeek(): StorytimeWeek {
  const week = structuredClone(shipped);
  const clips: Record<string, string> = {};
  for (const word of PAGE_ONE_WORDS) clips[word] = `words/${word}.mp3`;
  (readerBook(week).audio as unknown as { wordClips: Record<string, string> }).wordClips = clips;
  return week;
}

/** The signed-URL map of one week: a URL for each media file and each clip. */
function mediaUrls(week: StorytimeWeek): Record<string, string> {
  const urls: Record<string, string> = {};
  const book = readerBook(week);
  for (const file of [book.audio?.file, book.audio?.slowFile]) if (file) urls[file] = `https://media.example/${file}`;
  for (const page of book.pages) if (page.image?.file) urls[page.image.file] = `https://media.example/${page.image.file}`;
  for (const word of PAGE_ONE_WORDS) urls[`words/${word}.mp3`] = `https://media.example/words/${word}.mp3`;
  return urls;
}

/** Cuts the reader book to page 1 and renumbers its sentences. */
function pageOne(week: StorytimeWeek): StorytimeWeek["books"][number] {
  const book = readerBook(week);
  book.pages = [book.pages[0]!];
  for (const key of ["sentences", "slowSentences"] as const) {
    const list = book.audio![key];
    if (!list) continue;
    book.audio![key] = list.filter((sentence) => (sentence.page ?? 1) === 1).map((sentence) => ({ ...sentence, page: 1 }));
  }
  return book;
}

/** Loads the client reader. */
async function loadReader() {
  const modulePath = "../app/[locale]/st/[level]/[week]/reader";
  return (await import(/* @vite-ignore */ modulePath)).StorytimeReader as ComponentType<{
    book: StorytimeWeek["books"][number];
    locale: string;
    labels: typeof labels;
    mediaUrls: Record<string, string>;
  }>;
}

/** Renders page 1 and opens "My turn" with a tap on the word "Hello". Returns the clip element. */
async function tapFirstWord() {
  const week = allClipsWeek();
  const Reader = await loadReader();
  const view = render(<Reader book={pageOne(week)} locale="en" labels={labels} mediaUrls={mediaUrls(week)} />);
  fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
  const word = view.container.querySelector<HTMLElement>('[data-word="0"]');
  expect(word, "the reader must render the first word").not.toBeNull();
  fireEvent.click(word!);
  const clip = plays.at(-1);
  expect(clip?.src ?? "", "the tap must play the clip of Hello").toContain("words/hello.mp3");
  return { week, clip: clip!.element, view };
}

/**
 * Finds one mode button. While a clip plays, the My turn button is pressed and shows the playing
 * label instead of its own name (Q4), so the lookup falls back to the one pressed button.
 * @param container The rendered container.
 * @param name The label of the button.
 * @returns The button.
 */
function modeButton(container: HTMLElement, name: string): HTMLElement {
  const named = screen.queryByRole("button", { name });
  if (named) return named;
  const pressed = [...container.querySelectorAll<HTMLElement>("button[aria-pressed='true']")];
  expect(pressed.length, `the ${name} button must be found by name or as the one pressed button`).toBe(1);
  return pressed[0]!;
}

/** Records the highest number of elements that play at once. */
function notePlaying(): void {
  playingMax = Math.max(playingMax, playing.size);
}

beforeEach(() => {
  plays = [];
  playing.clear();
  playingMax = 0;
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
    plays.push({ src: this.src, element: this });
    playing.add(this);
    notePlaying();
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
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
  vi.restoreAllMocks();
  if (endedListener) document.removeEventListener("ended", endedListener, true);
});

describe("a mode switch pauses the word clip (N3, N4)", () => {
  it("setup: a tap in My turn plays one clip and nothing else", async () => {
    const { clip } = await tapFirstWord();
    expect(playing.has(clip), "the clip plays after the tap").toBe(true);
    expect(`playing_max=${playingMax}`).toBe("playing_max=1");
  });

  it.each(SWITCHES)("$id pressing $button pauses the clip and leaves one sound", async ({ button, sound, id }) => {
    const { clip, week, view } = await tapFirstWord();
    const before = plays.length;
    playingMax = 0;
    fireEvent.click(modeButton(view.container, button));
    notePlaying();
    expect(playing.has(clip), `${id}: the clip must leave the playing set after the switch`).toBe(false);
    if (sound) {
      const file = sound === "slow" ? readerBook(week).audio!.slowFile! : readerBook(week).audio!.file!;
      const started = plays.slice(before).at(-1);
      expect(started?.src.split("?")[0]?.endsWith(file) ?? false, `${id}: the new mode must play ${file}`).toBe(true);
      expect(`playing_max=${playingMax}`, `${id}: the clip and the new sound must not overlap`).toBe("playing_max=1");
    } else {
      expect(`playing_max=${playingMax}`, `${id}: no sound plays after My turn again`).toBe("playing_max=0");
    }
    expect(screen.queryByRole("alert"), `${id}: a switch must not raise the alert`).toBeNull();
  });

  it("switches_checked has a floor of 3", () => {
    expect(`switches_checked=${SWITCHES.length}`).toMatch(/^switches_checked=([3-9]|[1-9][0-9]+)$/);
  });
});
