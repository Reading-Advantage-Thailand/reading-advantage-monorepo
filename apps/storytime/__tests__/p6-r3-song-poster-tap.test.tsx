// @vitest-environment jsdom
/**
 * Task 6.2, round 3 (PM 2026-11-13 13:25), item (2): the song on a phone.
 *
 * PM words, quoted exactly: "(2) Song on a phone: the Play button sits at y=1044, one scroll
 * under the video. Add to 6.2: a tap on the video (poster) starts and pauses the song, with a
 * visible play mark on the poster; keep the button."
 *
 * The contract of this file:
 * - A tap (click) on the video element starts the song when it is paused, and pauses it when it
 *   plays. The rule holds on the phone video (`data-phone="true"`) and on the regular video.
 * - A play mark sits inside the song stage. The hook is the attribute `data-play-mark`. The mark
 *   has an accessible name: the translated play label (`labels.play`). It is visible while the
 *   song is paused or ended, and it is gone or not visible while the song plays.
 * - A tap on the mark starts the song once. The mark and the stage must not both toggle, so one
 *   tap never starts and pauses the song in the same gesture.
 * - The Play button stays (the direct `button` child of `.song-part`) and keeps working.
 *
 * The test records every `play` and `pause` call on the real media element and keeps its own
 * `paused` state, so the test sees the state that the component sees.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";

const app = resolve(import.meta.dirname, "..");
const shipped = weekSchema.parse(JSON.parse(readFileSync(resolve(app, "content/l2/w01.json"), "utf8")));

/** The translated labels of the fixture; they differ from the English default. */
const LABELS = { play: "เล่นเพลง", pause: "หยุดเพลง" };

let plays: HTMLMediaElement[] = [];
let pauses: HTMLMediaElement[] = [];
const pausedState = new WeakMap<HTMLMediaElement, boolean>();
let pausedDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  plays = [];
  pauses = [];
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
    plays.push(this);
    pausedState.set(this, false);
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
    pauses.push(this);
    pausedState.set(this, true);
    this.dispatchEvent(new Event("pause"));
  });
  pausedDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "paused");
  Object.defineProperty(HTMLMediaElement.prototype, "paused", {
    configurable: true,
    get(this: HTMLMediaElement) {
      return pausedState.get(this) ?? true;
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (pausedDescriptor) Object.defineProperty(HTMLMediaElement.prototype, "paused", pausedDescriptor);
});

/** Sets the phone media query result of the next render. */
function setPhone(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

/**
 * Renders the song and returns the video, the stage, and the Play button.
 * @param phone `true` for the portrait phone pair.
 * @returns The render result and the three elements.
 */
async function renderSong(phone: boolean) {
  const { StorytimeSong } = await import("../app/[locale]/st/[level]/[week]/song");
  setPhone(phone);
  const song = structuredClone(shipped.song!) as NonNullable<StorytimeWeek["song"]>;
  const urls: Record<string, string> = {};
  for (const file of [song.audio, song.video, song.videoPhone, song.poster, song.posterPhone]) {
    if (file) urls[file] = `https://media.example/${file}`;
  }
  const result = render(<StorytimeSong song={song} mediaUrls={urls} labels={LABELS} />);
  const stage = result.container.querySelector<HTMLElement>(".song-stage")!;
  const video = result.container.querySelector<HTMLVideoElement>("video")!;
  const button = result.container.querySelector<HTMLButtonElement>(".song-part > button")!;
  expect(stage.getAttribute("data-phone"), "the fixture picks the phone pair or not").toBe(phone ? "true" : "false");
  expect(video, "the song renders a video").not.toBeNull();
  expect(button, "the song keeps its Play button as a direct child of the part").not.toBeNull();
  return { ...result, stage, video, button };
}

/** Finds the play mark inside the stage. */
const markOf = (stage: HTMLElement): HTMLElement | null => stage.querySelector<HTMLElement>("[data-play-mark]");

/** The accessible name of an element: its `aria-label`, else its text. */
const nameOf = (element: HTMLElement): string =>
  (element.getAttribute("aria-label") ?? element.textContent ?? "").trim();

/** Reports whether the mark shows: it exists and it is visible. */
function markShows(stage: HTMLElement): boolean {
  const mark = markOf(stage);
  if (!mark) return false;
  try {
    expect(mark).toBeVisible();
    return true;
  } catch {
    return false;
  }
}

describe.each([
  ["the phone video (data-phone true)", true],
  ["the regular video (data-phone false)", false],
])("a tap on the song video on %s", (_name, phone) => {
  it("starts the song when it is paused", async () => {
    const { video } = await renderSong(phone);
    fireEvent.click(video);
    expect(plays, "one play call on the video").toEqual([video]);
    expect(pauses, "no pause call").toHaveLength(0);
  });

  it("pauses the song when it plays", async () => {
    const { video } = await renderSong(phone);
    fireEvent.click(video);
    fireEvent.click(video);
    expect(plays).toEqual([video]);
    expect(pauses, "the second tap pauses").toEqual([video]);
  });

  it("starts the song again with the third tap", async () => {
    const { video } = await renderSong(phone);
    fireEvent.click(video);
    fireEvent.click(video);
    fireEvent.click(video);
    expect(plays, "the tap, then the tap after the pause").toEqual([video, video]);
    expect(pauses).toHaveLength(1);
  });

  it("shows a play mark inside the stage while the song is paused, named by the play label", async () => {
    const { stage } = await renderSong(phone);
    const mark = markOf(stage);
    expect(mark, "a [data-play-mark] element inside .song-stage").not.toBeNull();
    expect(nameOf(mark!), "the accessible name of the mark").toBe(LABELS.play);
    expect(markShows(stage), "the mark is visible").toBe(true);
  });

  it("hides the play mark while the song plays and shows it after a pause and at the end", async () => {
    const { stage, video } = await renderSong(phone);
    fireEvent.click(video);
    expect(markShows(stage), "no mark while the song plays").toBe(false);
    fireEvent.click(video);
    expect(markShows(stage), "the mark returns after a pause").toBe(true);
    fireEvent.click(video);
    expect(markShows(stage), "no mark while the song plays again").toBe(false);
    pausedState.set(video, true);
    fireEvent(video, new Event("ended"));
    expect(markShows(stage), "the mark returns when the song ends").toBe(true);
  });

  it("starts the song once with a tap on the play mark", async () => {
    const { stage, video } = await renderSong(phone);
    const mark = markOf(stage);
    expect(mark, "a [data-play-mark] element inside .song-stage").not.toBeNull();
    fireEvent.click(mark!);
    expect(plays, "one play call").toEqual([video]);
    expect(pauses, "the tap never starts and pauses in one gesture").toHaveLength(0);
    expect(markShows(stage), "the mark hides while the song plays").toBe(false);
  });

  it("keeps the Play button working, and the button label follows the state", async () => {
    const { stage, video, button } = await renderSong(phone);
    expect(button).toHaveTextContent(LABELS.play);
    fireEvent.click(button);
    expect(plays).toEqual([video]);
    expect(button).toHaveTextContent(LABELS.pause);
    expect(markShows(stage), "no mark while the button started the song").toBe(false);
    fireEvent.click(button);
    expect(pauses).toEqual([video]);
    expect(button).toHaveTextContent(LABELS.play);
    expect(markShows(stage), "the mark returns after the button paused the song").toBe(true);
  });

  it("lets a tap on the video pause a song that the button started", async () => {
    const { video, button } = await renderSong(phone);
    fireEvent.click(button);
    fireEvent.click(video);
    expect(pauses, "the video tap pauses").toEqual([video]);
    expect(button).toHaveTextContent(LABELS.play);
  });
});
