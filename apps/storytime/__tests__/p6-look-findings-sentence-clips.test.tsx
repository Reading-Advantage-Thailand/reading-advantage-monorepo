// @vitest-environment jsdom
/**
 * Task 6.2, Daniel's finding 2 (Tasks id ZVBVandmMXN3VE9OX2REeA, 2026-11-13 08:56): "Then we will
 * need a full sentence button, to."
 *
 * PM order (b): a full-sentence button on each sentence of the phonics section that plays the
 * whole sentence recording, unsliced.
 *
 * Default of this round (open PM question: the field name): no sentence recording exists alone, so
 * the contract takes one optional field, `books[].audio.sentenceClips`. It maps a page number (the
 * string of a positive integer) to one whole clip file. The default is `{}`. A decodable page has
 * one sentence. A page with a clip shows a sentence button that plays the whole clip from its
 * start with no stop timer. A page with no clip shows no button. The label key is `playSentence`
 * of the decodable labels, and the message key is `decPlaySentence` in the English and Thai files.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";

const app = resolve(import.meta.dirname, "..");
const raw = (): unknown => JSON.parse(readFileSync(resolve(app, "content/l2/w01.json"), "utf8"));
const SENTENCE_LABEL = "Play the whole sentence";

/** The sentence clip map of a book audio; the base type has no such field yet. */
type SentenceAudio = { sentenceClips?: Record<string, string> };

/** Parses the shipped w01 with a sentence clip map put into its decodable audio. */
function parseWith(map: unknown): StorytimeWeek {
  const data = structuredClone(raw()) as { books: Array<{ kind: string; audio: Record<string, unknown> }> };
  data.books.find((book) => book.kind === "decodable")!.audio.sentenceClips = map;
  return weekSchema.parse(data);
}

const decodableOf = (week: StorytimeWeek) => week.books.find((book) => book.kind === "decodable")!;
const clipsOf = (week: StorytimeWeek) =>
  (decodableOf(week).audio as unknown as SentenceAudio).sentenceClips;

describe("the contract of sentenceClips (finding 2b)", () => {
  it("defaults to an empty map on a week with no sentence clips", () => {
    expect(clipsOf(weekSchema.parse(raw()))).toEqual({});
  });

  it("accepts a page number mapped to a media file and keeps it", () => {
    const week = parseWith({ "1": "l2/media/w01/sentences/s01.mp3", "8": "l2/media/w01/sentences/s08.mp3" });
    expect(clipsOf(week)).toEqual({
      "1": "l2/media/w01/sentences/s01.mp3",
      "8": "l2/media/w01/sentences/s08.mp3",
    });
  });

  it.each([["0"], ["page1"], ["-1"], ["01"], ["constructor"]])("rejects the page key %s", (key) => {
    expect(() => parseWith({ [key]: "l2/media/w01/sentences/s01.mp3" })).toThrow();
  });

  it.each([["../outside.mp3"], ["https://media.example/s01.mp3"], [""]])("rejects the path %s", (file) => {
    expect(() => parseWith({ "1": file })).toThrow();
  });

  it("lists a sentence clip in the media list of the receiver", async () => {
    const receiver = (await import("../scripts/receive-weeks")) as {
      mediaOf: (week: StorytimeWeek) => Array<{ file: string }>;
    };
    const week = parseWith({ "1": "l2/media/w01/sentences/s01.mp3" });
    expect(receiver.mediaOf(week).map((entry) => entry.file)).toContain("l2/media/w01/sentences/s01.mp3");
  });

  it("holds a decodable sentence label in the English and Thai message files", () => {
    for (const locale of ["en", "th"]) {
      const messages = JSON.parse(readFileSync(resolve(app, `messages/${locale}.json`), "utf8")) as Record<string, string>;
      expect(messages.decPlaySentence?.trim(), `${locale}.json decPlaySentence`).toBeTruthy();
    }
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

/** Renders the decodable part with the sentence label and a full signed-URL map. */
async function renderDecodable(week: StorytimeWeek) {
  const { StorytimeDecodable } = await import("../app/[locale]/st/[level]/[week]/decodable");
  const book = decodableOf(week);
  const urls: Record<string, string> = {};
  for (const file of [book.audio.file, ...Object.values(book.audio.wordClips), ...Object.values(clipsOf(week) ?? {})]) {
    if (file) urls[file] = signed(file);
  }
  return render(
    <StorytimeDecodable week={week} locale="en" mediaUrls={urls} labels={{ playSentence: SENTENCE_LABEL } as never} />,
  );
}

const sentenceButtons = () => screen.queryAllByRole("button", { name: SENTENCE_LABEL });

describe("the sentence button of the decodable (finding 2b)", () => {
  it("plays the whole sentence clip from 0 with no stop timer", async () => {
    const week = parseWith({ "1": "l2/media/w01/sentences/s01.mp3", "3": "l2/media/w01/sentences/s03.mp3" });
    await renderDecodable(week);
    expect(sentenceButtons(), "one sentence button on page 1").toHaveLength(1);
    fireEvent.click(sentenceButtons()[0]!);
    await act(async () => {
      await Promise.resolve();
    });
    expect(plays.map((entry) => entry.src)).toEqual([signed("l2/media/w01/sentences/s01.mp3")]);
    expect(plays[0]!.time, "the clip starts at 0").toBe(0);
    expect(writes.filter((entry) => entry.value !== 0), "no seek into the clip").toHaveLength(0);
    times.set(plays[0]!.element, 30);
    plays[0]!.element.dispatchEvent(new Event("timeupdate"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(pauses, "no stop timer pauses the sentence clip").toHaveLength(0);
  });

  it("never plays the book recording for a sentence tap", async () => {
    const week = parseWith({ "1": "l2/media/w01/sentences/s01.mp3" });
    await renderDecodable(week);
    expect(sentenceButtons(), "one sentence button on page 1").toHaveLength(1);
    fireEvent.click(sentenceButtons()[0]!);
    const book = signed(decodableOf(week).audio.file!);
    expect(plays.filter((entry) => entry.src === book)).toHaveLength(0);
    expect(plays).toHaveLength(1);
  });

  it("shows no sentence button on a page with no clip", async () => {
    const week = parseWith({ "1": "l2/media/w01/sentences/s01.mp3", "3": "l2/media/w01/sentences/s03.mp3" });
    await renderDecodable(week);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(sentenceButtons(), "page 2 holds no clip").toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(sentenceButtons(), "page 3 holds a clip").toHaveLength(1);
  });

  it("shows no sentence button on a week with no sentence clips", async () => {
    await renderDecodable(weekSchema.parse(raw()));
    for (let index = 0; index < 7; index += 1) {
      expect(sentenceButtons(), `page ${index + 1}`).toHaveLength(0);
      fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    }
  });
});
