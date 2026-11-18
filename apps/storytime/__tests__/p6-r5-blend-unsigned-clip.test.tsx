// @vitest-environment jsdom
/**
 * Task 6.2, round 5: UX browser check r3, finding B1 of 7172f704.
 *
 * On the review copy, the blend word "mat" of w07 page 3 plays only `phonemes/daniel/05-m.mp3`.
 * Then the browser raises the media error "Empty src attribute", and the own clip
 * `words/wa-mat.mp3` never plays. Reproduced 3 of 3. The cause has two parts:
 *
 * 1. The player. `playBlend` of `decodable.tsx` checks only that the phoneme bank holds a clip for
 *    each grapheme. It does not check that the signed map of the week holds a URL for that clip.
 *    `mediaUrl` gives `""` for an unsigned clip, so the play fails and the sequence stops before
 *    the own clip.
 * 2. The signing. `signWeekMedia` of `lib/media/sign.ts` signs only the media paths that the week
 *    JSON names. `content/l2/w07.json` does not name `phonemes/daniel/26-a-short.mp3`.
 *
 * Both parts are pinned here, and each part alone leaves a gap:
 * - Player rows (P1 to P5): a blend word whose grapheme clip has no signed URL plays its own clip
 *   at once, from 0, with no empty-src play and no error alert. A blend word with every clip
 *   signed keeps the grapheme lead-in, then the own clip (finding F120, PM question N4 keeps it).
 *   These rows build their own `mediaUrls`, so they pass only when the player is fixed.
 * - Signing rows (S1 to S4): the signed map of a week holds every bank clip that its blend words
 *   need. These rows call `signWeekMedia` with a fake storage client, so they pass only when the
 *   signing is fixed.
 * - Join row (J1): the real signed map of w07 drives the real player. This row fails for the
 *   mutant "player check only" (the signing still lacks the clip, so the lead-in is lost).
 *
 * Mutant check (self-check): the mutant "player check only" fails S1, S2, and J1. The mutant
 * "signing only" fails P1, P2, and P4. At HEAD every P, S, and J row below fails on an assertion.
 *
 * The media model records every `play`. A play with no signed source fails with the browser
 * error of the finding, so the model reproduces the browser and the alert shows.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { blendPlanForWord } from "../lib/blend";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";
import { PHONEME_BANK } from "../lib/phoneme-bank";

const app = resolve(import.meta.dirname, "..");

/** The shipped weeks that hold a decodable. */
const WEEK_NAMES = ["w01", "w02", "w03", "w04", "w05", "w06", "w07"] as const;

/** The prefix of every signed URL of this test. */
const SIGNED_PREFIX = "https://media.example/";

/** The media base of the private bucket. */
const MEDIA_BASE = "gs://storytime-app-media";

/** The bank clip of the short a, the clip that w07 does not name. */
const A_SHORT = "phonemes/daniel/26-a-short.mp3";

/** The raw JSON of one shipped week. */
const rawWeek = (name: string): Record<string, unknown> =>
  JSON.parse(readFileSync(resolve(app, `content/l2/${name}.json`), "utf8")) as Record<string, unknown>;

/** The parsed shipped week. */
const shipped = (name: string): StorytimeWeek => weekSchema.parse(rawWeek(name));

/** The decodable book of a week. */
const decodableOf = (week: StorytimeWeek) => week.books.find((book) => book.kind === "decodable")!;

/** The signed URL of one media file in the fixtures. */
const signed = (file: string): string => `${SIGNED_PREFIX}${file}`;

/** The first bank clip of each grapheme, the clip the player plays. */
const BANK_CLIP = new Map<string, string>();
for (const clip of PHONEME_BANK) {
  if (!BANK_CLIP.has(clip.grapheme)) BANK_CLIP.set(clip.grapheme, clip.file);
}

/** One recorded `play` call. */
interface PlayRecord {
  /** The element that played. */
  element: HTMLMediaElement;
  /** The source of the element at the call. */
  src: string;
  /** The `currentTime` of the element at the call. */
  time: number;
}

let plays: PlayRecord[] = [];
const times = new WeakMap<HTMLMediaElement, number>();
let timeDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  plays = [];
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
    plays.push({ element: this, src: this.src, time: times.get(this) ?? 0 });
    if (!this.src.startsWith(SIGNED_PREFIX)) {
      return Promise.reject(new DOMException("Empty src attribute", "NotSupportedError"));
    }
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  timeDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "currentTime");
  Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
    configurable: true,
    get(this: HTMLMediaElement) {
      return times.get(this) ?? 0;
    },
    set(this: HTMLMediaElement, value: number) {
      times.set(this, Number(value));
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (timeDescriptor) Object.defineProperty(HTMLMediaElement.prototype, "currentTime", timeDescriptor);
});

/**
 * Builds the signed map that a page of a week holds when every clip is signed: the book files,
 * the word clips, the tricky-word clips, and the whole phoneme bank.
 * @param week The week.
 * @returns The map from file to signed URL.
 */
function fullMapOf(week: StorytimeWeek): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const book of week.books) {
    for (const file of [book.audio?.file, book.audio?.slowFile]) if (file) urls[file] = signed(file);
    for (const file of Object.values(book.audio?.wordClips ?? {})) urls[file] = signed(file);
  }
  for (const file of Object.values(week.focus?.trickyWordClips ?? {})) urls[file] = signed(file);
  for (const clip of PHONEME_BANK) urls[clip.file] = signed(clip.file);
  return urls;
}

/**
 * Renders the decodable of one week with a signed map.
 * @param week The week.
 * @param mediaUrls The signed map of the page.
 * @returns The render result.
 */
async function renderDecodable(week: StorytimeWeek, mediaUrls: Record<string, string>) {
  const { StorytimeDecodable } = await import("../app/[locale]/st/[level]/[week]/decodable");
  return render(<StorytimeDecodable week={week} locale="en" mediaUrls={mediaUrls} />);
}

/**
 * Lets a blend sequence run to its end: each phoneme clip ends, then the next clip starts.
 * @returns The number of plays after the sequence rests.
 */
async function settle(): Promise<number> {
  for (let round = 0; round < 12; round += 1) {
    const before = plays.length;
    await act(async () => {
      await Promise.resolve();
    });
    const last = plays[plays.length - 1];
    if (last) {
      await act(async () => {
        last.element.dispatchEvent(new Event("ended"));
        await Promise.resolve();
      });
    }
    if (plays.length === before) break;
  }
  return plays.length;
}

/**
 * Turns to w07 page 3, clicks the word "mat", and lets the sequence rest.
 * @returns The plays right after the click, before any clip ends.
 */
async function tapMat(): Promise<string[]> {
  // The view shows one page at a time. "mat" sits on page 3, so the reader turns the page twice.
  for (let turn = 0; turn < 2; turn += 1) {
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  }
  const buttons = screen.getAllByRole("button", { name: /^mat$/i });
  expect(buttons.length, "the premise: w07 shows the word mat as a tap target").toBeGreaterThanOrEqual(1);
  fireEvent.click(buttons[0]!);
  const atOnce = plays.map((entry) => entry.src);
  await settle();
  return atOnce;
}

/** The own clip file of "mat" in w07. */
const matClipOf = (week: StorytimeWeek): string => decodableOf(week).audio.wordClips.mat!;

describe("the player: a blend word with an unsigned grapheme clip plays its own clip at once", () => {
  it("premise: w07 mat is a blend word of m, a, t, and w07 does not name the clip of a", () => {
    const week = shipped("w07");
    expect(blendPlanForWord("mat", week)).toEqual({ mode: "blend", graphemes: ["m", "a", "t"] });
    expect(matClipOf(week), "w07 must hold the own clip of mat").toBeTruthy();
    expect(JSON.stringify(rawWeek("w07")).includes(A_SHORT), "w07 names no clip of the short a").toBe(false);
  });

  it("P1: plays the own clip at once and from 0 when the clip of a is absent from the map", async () => {
    const week = shipped("w07");
    const urls = fullMapOf(week);
    delete urls[A_SHORT];
    await renderDecodable(week, urls);
    const atOnce = await tapMat();
    expect(atOnce, "the own clip plays at the tap, with no lead-in").toEqual([signed(matClipOf(week))]);
    expect(plays.map((entry) => entry.src), "no clip plays after the own clip").toEqual([signed(matClipOf(week))]);
    expect(plays[0]!.time, "the own clip starts at 0").toBe(0);
    expect(plays.filter((entry) => !entry.src.startsWith(SIGNED_PREFIX)), "no play of an empty src").toHaveLength(0);
    expect(screen.queryByRole("alert"), "no error alert shows").toBeNull();
  });

  it("P2: plays the own clip at once when the signed URL of a is an empty string", async () => {
    const week = shipped("w07");
    const urls = fullMapOf(week);
    urls[A_SHORT] = "";
    await renderDecodable(week, urls);
    const atOnce = await tapMat();
    expect(atOnce, "the own clip plays at the tap, with no lead-in").toEqual([signed(matClipOf(week))]);
    expect(plays.map((entry) => entry.src)).toEqual([signed(matClipOf(week))]);
    expect(plays.filter((entry) => !entry.src.startsWith(SIGNED_PREFIX)), "no play of an empty src").toHaveLength(0);
    expect(screen.queryByRole("alert"), "no error alert shows").toBeNull();
  });

  it.each([
    ["m", "phonemes/daniel/05-m.mp3"],
    ["a", A_SHORT],
    ["t", "phonemes/daniel/02-t.mp3"],
  ])("P3: plays the own clip at once when only the clip of %s is unsigned (%s)", async (_grapheme, clipFile) => {
    const week = shipped("w07");
    const urls = fullMapOf(week);
    delete urls[clipFile];
    await renderDecodable(week, urls);
    const atOnce = await tapMat();
    expect(atOnce, "the own clip plays at the tap, with no lead-in").toEqual([signed(matClipOf(week))]);
    expect(plays.map((entry) => entry.src)).toEqual([signed(matClipOf(week))]);
    expect(screen.queryByRole("alert"), "no error alert shows").toBeNull();
  });

  it("P4: plays the own clip at once when no clip of the bank is signed", async () => {
    const week = shipped("w07");
    const urls = fullMapOf(week);
    for (const clip of PHONEME_BANK) delete urls[clip.file];
    await renderDecodable(week, urls);
    const atOnce = await tapMat();
    expect(atOnce, "the own clip plays at the tap, with no lead-in").toEqual([signed(matClipOf(week))]);
    expect(plays.map((entry) => entry.src)).toEqual([signed(matClipOf(week))]);
    expect(screen.queryByRole("alert"), "no error alert shows").toBeNull();
  });

  it("P5: keeps the lead-in when every clip is signed: m, a, t, then the own clip (F120, N4)", async () => {
    const week = shipped("w07");
    await renderDecodable(week, fullMapOf(week));
    const atOnce = await tapMat();
    expect(atOnce, "only the first grapheme clip plays at the tap").toEqual([signed("phonemes/daniel/05-m.mp3")]);
    expect(plays.map((entry) => entry.src)).toEqual([
      signed("phonemes/daniel/05-m.mp3"),
      signed(A_SHORT),
      signed("phonemes/daniel/02-t.mp3"),
      signed(matClipOf(week)),
    ]);
    expect(plays[plays.length - 1]!.time, "the own clip starts at 0").toBe(0);
    expect(screen.queryByRole("alert"), "no error alert shows").toBeNull();
  });
});

/** The storage client of the signing rows: it signs every key and makes no network call. */
const fakeStorage = {
  getSignedUrl: async (key: string): Promise<string> => signed(key),
};

/**
 * Signs one week with the fake storage client.
 * @param week The raw week, or a changed copy of it.
 * @returns The signed map.
 */
async function signMap(week: unknown): Promise<Record<string, string>> {
  const { signWeekMedia } = await import("../lib/media/sign");
  return signWeekMedia(week, { storage: fakeStorage, mediaBase: MEDIA_BASE });
}

/**
 * Lists the words that the decodable of a week shows: the page words, the sounds-page words,
 * the sounds-page tricky words, and the tricky words of the focus.
 * @param week The parsed week.
 * @returns The words, without duplicates.
 */
function decodableWordsOf(week: StorytimeWeek): string[] {
  const book = decodableOf(week);
  const words = new Set<string>();
  for (const page of book.pages) {
    for (const word of page.text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []) words.add(word);
  }
  for (const word of book.soundsPage?.words ?? []) words.add(word);
  for (const word of book.soundsPage?.tricky ?? []) words.add(word);
  for (const word of week.focus?.trickyWords ?? []) words.add(word);
  return [...words];
}

/**
 * Lists the bank clips that the blend words of a week need.
 * @param week The parsed week.
 * @returns The bank clip files, without duplicates.
 */
function neededBankClipsOf(week: StorytimeWeek): string[] {
  const files = new Set<string>();
  for (const word of decodableWordsOf(week)) {
    const plan = blendPlanForWord(word, week);
    if (plan.mode !== "blend") continue;
    for (const grapheme of plan.graphemes) {
      const file = BANK_CLIP.get(grapheme);
      if (file) files.add(file);
    }
  }
  return [...files];
}

describe("the signing: the map of a week holds every bank clip that its blend words need", () => {
  it("S1: the signed map of w07 holds the clip of the short a, and its signed URL is not empty", async () => {
    const map = await signMap(rawWeek("w07"));
    expect(Object.keys(map), "the map must hold the clip of the short a").toContain(A_SHORT);
    expect(map[A_SHORT], "the URL of the clip is a signed URL").toBe(signed(A_SHORT));
  });

  it.each(WEEK_NAMES)("S2: the signed map of %s holds every bank clip of every blend word", async (name) => {
    const week = shipped(name);
    const needed = neededBankClipsOf(week);
    const map = await signMap(rawWeek(name));
    const missing = needed.filter((file) => !map[file]);
    expect(missing, `the clips that blend words of ${name} need and the map lacks`).toEqual([]);
    if (name !== "w01") {
      expect(needed.length, `the premise: ${name} holds at least one blend word`).toBeGreaterThan(0);
    }
  });

  it("S3: the approval prose stays unsigned, and a bank clip needs no approval path", async () => {
    const week = rawWeek("w07");
    (week as { approval?: unknown }).approval = { note: "approval/prose-clip.mp3" };
    const map = await signMap(week);
    expect(Object.keys(map), "an approval path gets no signature").not.toContain("approval/prose-clip.mp3");
    expect(Object.keys(map), "the bank clip of the fix is in the map").toContain(A_SHORT);
  });

  it("S4: an unsafe media path still throws, and the bank clips add no unsafe key", async () => {
    const week = rawWeek("w07");
    (week as { unsafe?: unknown }).unsafe = "../outside/clip.mp3";
    await expect(signMap(week)).rejects.toThrow(/leaves the folder of the week/);
    const clean = await signMap(rawWeek("w07"));
    for (const key of Object.keys(clean)) {
      expect(key.startsWith("/") || key.includes("..") || key.includes("://"), `unsafe key ${key}`).toBe(false);
    }
  });
});

describe("the join: the real signed map of w07 drives the real player", () => {
  it("J1: signs w07, then plays m, a, t, and the own clip of mat (lead-in kept)", async () => {
    const week = shipped("w07");
    const map = await signMap(rawWeek("w07"));
    await renderDecodable(week, map);
    await tapMat();
    expect(plays.map((entry) => entry.src)).toEqual([
      signed("phonemes/daniel/05-m.mp3"),
      signed(A_SHORT),
      signed("phonemes/daniel/02-t.mp3"),
      signed(matClipOf(week)),
    ]);
    expect(screen.queryByRole("alert"), "no error alert shows").toBeNull();
  });
});
