// @vitest-environment jsdom
/**
 * Task 6.2, Daniel's finding 2 (Tasks id ZVBVandmMXN3VE9OX2REeA, 2026-11-13 08:56): "The audio in
 * the phonics section is still completely fucked up. Every single audio clip I clicked on is
 * sliced wrong. Last weekend, I ordered not to slice up and to use individual generations for
 * words."
 *
 * PM order (a): no sliced audio anywhere in Storytime. Every tappable word plays its own generated
 * word clip. A word with no clip is not tappable. A tap handler never plays a time range of a
 * longer file.
 *
 * Scope: the read-to-me page narration of the read-along plays the page range of the book
 * recording. It is not a word tap and not a sentence tap, and this test leaves it alone.
 *
 * The media model records every `play`, every `pause`, and every `currentTime` write on the real
 * elements. A word tap that seeks into the book recording, or that arms a stop timer, fails here.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { blendPlanForWord } from "../lib/blend";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";
import { PHONEME_BANK } from "../lib/phoneme-bank";

const app = resolve(import.meta.dirname, "..");
const shipped = (name: string): StorytimeWeek =>
  weekSchema.parse(JSON.parse(readFileSync(resolve(app, `content/l2/${name}.json`), "utf8")));

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

/** The signed URL of one media file in the fixture. */
const signed = (file: string): string => `https://media.example/${file}`;

/** Builds the signed-URL map: every clip, the book recordings, and the phoneme bank. */
function mediaUrlsOf(week: StorytimeWeek): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const book of week.books) {
    for (const file of [book.audio?.file, book.audio?.slowFile]) if (file) urls[file] = signed(file);
    for (const file of Object.values(book.audio?.wordClips ?? {})) urls[file] = signed(file);
  }
  for (const clip of PHONEME_BANK) urls[clip.file] = signed(clip.file);
  return urls;
}

/** The decodable book of a week. */
const decodableOf = (week: StorytimeWeek) => week.books.find((book) => book.kind === "decodable")!;

/** Renders the decodable part of one week and returns the view. */
async function renderDecodable(week: StorytimeWeek) {
  const { StorytimeDecodable } = await import("../app/[locale]/st/[level]/[week]/decodable");
  return render(<StorytimeDecodable week={week} locale="en" mediaUrls={mediaUrlsOf(week)} />);
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
 * Lets the media clock run well past any word cut and checks that nothing stops or seeks.
 * @param week The week of the render.
 */
async function expectNoCut(week: StorytimeWeek): Promise<void> {
  const book = signed(decodableOf(week).audio.file!);
  const nonZero = writes.filter((entry) => entry.value !== 0);
  expect(
    nonZero,
    `a word tap seeks into a longer file: currentTime written to ${nonZero[0]?.value} on ${nonZero[0]?.src}`,
  ).toHaveLength(0);
  expect(
    plays.filter((entry) => entry.src === book),
    "the book recording is the source of a word tap",
  ).toHaveLength(0);
  for (const entry of plays) {
    times.set(entry.element, 30);
    entry.element.dispatchEvent(new Event("timeupdate"));
  }
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
  expect(pauses, "a stop timer pauses the word clip at a cut end").toHaveLength(0);
}

describe("every word tap plays the own clip of the word, whole (finding 2a)", () => {
  it("plays the own clip of a plain page word from 0 (w01 nest)", async () => {
    const week = shipped("w01");
    await renderDecodable(week);
    fireEvent.click(screen.getByRole("button", { name: /^nest$/i }));
    await settle();
    expect(plays.map((entry) => entry.src)).toEqual([signed(decodableOf(week).audio.wordClips.nest!)]);
    expect(plays[0]!.time, "the clip starts at 0").toBe(0);
    await expectNoCut(week);
  });

  it("plays the own clip of a tricky word from 0 (w01 and)", async () => {
    const week = shipped("w01");
    await renderDecodable(week);
    const tricky = screen.getByRole("region", { name: "Tricky words" });
    fireEvent.click(within(tricky).getByRole("button", { name: /^and$/i }));
    await settle();
    expect(plays.map((entry) => entry.src)).toEqual([signed(decodableOf(week).audio.wordClips.and!)]);
    expect(plays[0]!.time, "the clip starts at 0").toBe(0);
    await expectNoCut(week);
  });

  it("plays the phoneme clips and then the own clip of a blend word (w03 Nan)", async () => {
    const week = shipped("w03");
    const plan = blendPlanForWord("Nan", week);
    expect(plan.mode, "the premise: Nan is a blend word in w03").toBe("blend");
    await renderDecodable(week);
    fireEvent.click(screen.getByRole("button", { name: /^nan$/i }));
    await settle();
    const bank = plan.graphemes.map((grapheme) =>
      signed(PHONEME_BANK.find((clip) => clip.grapheme === grapheme)!.file),
    );
    expect(plays.map((entry) => entry.src)).toEqual([
      ...bank,
      signed(decodableOf(week).audio.wordClips.nan!),
    ]);
    expect(plays[plays.length - 1]!.time, "the word clip starts at 0").toBe(0);
    await expectNoCut(week);
  });

  it("plays the own clip for every word of every w01 page", async () => {
    const week = shipped("w01");
    const book = decodableOf(week);
    await renderDecodable(week);
    const expected = book.pages.reduce((sum, page) => sum + (page.text.match(/[A-Za-z']+/g) ?? []).length, 0);
    let checked = 0;
    for (let index = 0; index < book.pages.length; index += 1) {
      const section = document.querySelector<HTMLElement>(`section[data-page-number="${index + 1}"]`)!;
      for (const button of within(section).queryAllByRole("button")) {
        plays = [];
        writes = [];
        fireEvent.click(button);
        await settle();
        const word = button.textContent!.toLowerCase();
        expect(plays.map((entry) => entry.src), `the tap on ${word} on page ${index + 1}`).toEqual([
          signed(book.audio.wordClips[word]!),
        ]);
        expect(writes.filter((entry) => entry.value !== 0), `no seek for ${word}`).toHaveLength(0);
        checked += 1;
      }
      if (index < book.pages.length - 1) {
        fireEvent.click(screen.getByRole("button", { name: "Next page" }));
      }
    }
    expect(`word_taps_checked=${checked}`).toBe(`word_taps_checked=${expected}`);
  });

  it("renders a word with no clip as plain text, not a button", async () => {
    const week = shipped("w01");
    const book = decodableOf(week);
    delete book.audio.wordClips.nurse;
    delete book.audio.wordClips.can;
    await renderDecodable(week);
    expect(screen.getByRole("button", { name: /^nest$/i }), "a word with a clip stays a button").toBeTruthy();
    const tricky = screen.getByRole("region", { name: "Tricky words" });
    expect(within(tricky).queryByRole("button", { name: /^can$/i }), "a tricky word with no clip").toBeNull();
    expect(within(tricky).getByText("can"), "the tricky word stays on screen as text").toBeTruthy();
    expect(within(tricky).getByRole("button", { name: /^and$/i }), "a tricky word with a clip").toBeTruthy();
    for (let index = 0; index < 5; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    }
    const section = document.querySelector<HTMLElement>('section[data-page-number="6"]')!;
    expect(section.textContent, "the page still shows the word").toContain("nurse");
    expect(within(section).queryByRole("button", { name: /^nurse$/i }), "a page word with no clip").toBeNull();
    expect(plays, "no tap, no sound").toHaveLength(0);
  });
});

/** Lists the client view files under app/ with a path relative to the app root. */
function clientViews(): Array<{ path: string; code: string }> {
  const found: Array<{ path: string; code: string }> = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".tsx")) {
        const source = readFileSync(full, "utf8");
        if (/^\s*"use client";/.test(source)) found.push({ path: relative(app, full), code: stripComments(source) });
      }
    }
  };
  walk(resolve(app, "app"));
  return found;
}

/** Removes the comment lines, so a comment about a range does not count as a use. */
function stripComments(source: string): string {
  return source
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
    .join("\n");
}

/**
 * Cuts the body of one named function out of a source.
 * @param code The source.
 * @param name The function name.
 * @returns The text from the function line to the matching close brace, or null.
 */
function functionBody(code: string, name: string): string | null {
  const start = code.search(new RegExp(`function ${name}\\(`));
  if (start < 0) return null;
  const open = code.indexOf("{", code.indexOf(")", start));
  let depth = 0;
  for (let index = open; index < code.length; index += 1) {
    if (code[index] === "{") depth += 1;
    if (code[index] === "}") {
      depth -= 1;
      if (depth === 0) return code.slice(start, index + 1);
    }
  }
  return null;
}

describe("no tap handler plays a time range of a longer file (finding 2a guard)", () => {
  const SLICE_IDENTIFIER = /\b(seekAndRun|stopAtMediaEnd|armWholeStop|wordBounds|wholeEndRef)\b/g;
  const HANDLER_NAMES = ["onWordTap", "onSentenceTap", "onTrickyTap", "playWhole", "playSentence", "playWord"];
  const FORBIDDEN_IN_HANDLER =
    /\b(seekOrWait|seekAndRun|stopAtMediaEnd|armStop|armWholeStop)\b|\.currentTime\s*=\s*(?!0\s*;)/;

  it("scans the exact client views of the app", () => {
    const paths = clientViews().map((view) => view.path).sort();
    expect(paths).toContain("app/[locale]/st/[level]/[week]/decodable.tsx");
    expect(paths).toContain("app/[locale]/st/[level]/[week]/reader.tsx");
    expect(`client_view_files=${paths.length}`).not.toBe("client_view_files=0");
  });

  it("uses no slice helper in any client view", () => {
    const hits = clientViews().flatMap((view) =>
      (view.code.match(SLICE_IDENTIFIER) ?? []).map((name) => `${view.path}: ${name}`),
    );
    expect(hits, `slice_identifier_hits=${hits.length}`).toEqual([]);
  });

  it("keeps every word and sentence handler free of seeks and stop timers", () => {
    let scanned = 0;
    const offences: string[] = [];
    for (const view of clientViews()) {
      for (const name of HANDLER_NAMES) {
        const body = functionBody(view.code, name);
        if (body === null) continue;
        scanned += 1;
        if (FORBIDDEN_IN_HANDLER.test(body)) offences.push(`${view.path}: ${name}`);
      }
    }
    expect(scanned, `tap_handlers_scanned=${scanned}`).toBeGreaterThanOrEqual(2);
    expect(offences, `tap_handler_offences=${offences.length}`).toEqual([]);
  });
});
