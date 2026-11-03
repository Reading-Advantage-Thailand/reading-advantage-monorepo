// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StorytimeWeek } from "../lib/contracts/week";
import { blendPlanForWord } from "../lib/blend";

const appDir = resolve(import.meta.dirname, "..");
const contentDir = resolve(appDir, "content/l2");
const shippedWeeks = readdirSync(contentDir)
  .filter((file) => /^w[0-9]{2}\.json$/.test(file))
  .map((file) => JSON.parse(readFileSync(resolve(contentDir, file), "utf8")) as StorytimeWeek);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Loads the client decodable and makes a missing module an assertion failure. */
async function loadDecodable() {
  try {
    const modulePath = "../app/[locale]/st/[level]/[week]/decodable";
    return (await import(/* @vite-ignore */ modulePath)).StorytimeDecodable;
  } catch (error) {
    expect(error, "Storytime must provide the client decodable UI").toBeUndefined();
    throw error;
  }
}

/** Creates an independent copy of one shipped week for a behavior-specific case. */
function cloneWeek(source: StorytimeWeek): StorytimeWeek {
  return structuredClone(source);
}

/** Renders the decodable part with one deep clone of a shipped week. */
async function renderDecodable(source: StorytimeWeek) {
  const Decodable = await loadDecodable();
  const week = cloneWeek(source);
  const result = render(<Decodable week={week} locale="en" />);
  const audio = result.container.querySelector("audio");
  expect(audio, "the decodable must render its recorded audio element").not.toBeNull();
  return { ...result, audio: audio as HTMLAudioElement, week };
}

/** Returns a non-empty set of CVC words from shipped later-week decodables. */
function shippedCvcWords() {
  const words = shippedWeeks.flatMap((week) => {
    const book = week.books.find((entry) => entry.kind === "decodable");
    return (book?.soundsPage?.words ?? []).filter((word) => blendPlanForWord(word, week).mode === "blend");
  });
  expect(words, "the shipped CVC word list must not be empty").not.toHaveLength(0);
  return words;
}

describe("Phase 3 Storytime decodable UI", () => {
  it("shows the sounds page and plays the phoneme bank clip on tap", async () => {
    const week = shippedWeeks.find((entry) => entry.meta.week === 1)!;
    const element = week.focus.element!;
    const played: string[] = [];
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
      played.push(this.src);
      return Promise.resolve();
    });
    const { audio } = await renderDecodable(week);
    expect(screen.getByText(element.graphemes.join(" "))).toBeInTheDocument();
    expect(screen.getByText(element.sound)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /sound|phoneme/i }));
    expect(play).toHaveBeenCalledTimes(1);
    expect(audio.getAttribute("src")).toContain(element.audio);
    expect(audio.getAttribute("src")).not.toContain("speechSynthesis");
  });

  it("plays a shipped CVC word's clips in grapheme order before its whole-word recording", async () => {
    const cvc = shippedWeeks.find((week) => week.meta.week === 3);
    expect(cvc, "shipped week 3 must be present").toBeDefined();
    const week = cvc!;
    shippedCvcWords();
    const word = (week.books.find((book) => book.kind === "decodable")?.soundsPage?.words ?? [])
      .find((candidate) => blendPlanForWord(candidate, week).mode === "blend");
    expect(word, "a shipped CVC word must exist").toBeTruthy();
    const played: string[] = [];
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
      played.push(this.src);
      return Promise.resolve();
    });
    const { audio } = await renderDecodable(week);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${word}$`, "i") }));
    expect(play).toHaveBeenCalled();
    expect(audio.getAttribute("src")).toContain("phonemes/daniel/");
    const clips = played.filter((src) => src.includes("phonemes/daniel/"));
    expect(clips).toHaveLength(blendPlanForWord(word!, week).graphemes.length);
    const g3ClipByGrapheme: Record<string, string> = {
      p: "03-p.mp3",
      a: "26-a-short.mp3",
      n: "04-n.mp3",
    };
    const graphemes = blendPlanForWord(word!, week).graphemes;
    expect(graphemes.every((grapheme) => g3ClipByGrapheme[grapheme])).toBe(true);
    expect(clips.map((src) => src.split("/").at(-1))).toEqual(
      graphemes.map((grapheme) => g3ClipByGrapheme[grapheme]),
    );
    expect(played.at(-1)).not.toContain("phonemes/daniel/");
    expect(audio).toBeInTheDocument();
  });

  it("plays every word of the sound book and every tricky word whole", async () => {
    const soundBook = cloneWeek(shippedWeeks.find((week) => week.meta.week === 1)!);
    const cvc = cloneWeek(shippedWeeks.find((week) => week.books.some((book) => book.kind === "decodable" &&
      (book.soundsPage?.words ?? []).some((candidate) => blendPlanForWord(candidate, week).mode === "blend")))!);
    const tricky = cvc.books.find((book) => book.kind === "decodable")?.soundsPage?.tricky?.[0];
    expect(tricky, "a shipped tricky word must exist").toBeTruthy();
    const played: string[] = [];
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
      played.push(this.src);
      return Promise.resolve();
    });
    soundBook.books.find((book) => book.kind === "decodable")!.soundBook = true;
    cvc.focus.trickyWords = [...(cvc.focus.trickyWords ?? []), tricky!];
    const first = await renderDecodable(soundBook);
    const second = await renderDecodable(cvc);
    fireEvent.click(screen.getByRole("button", { name: /^nest$/i }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${tricky}$`, "i") }));
    expect(play).toHaveBeenCalledTimes(2);
    expect(played.every((src) => !src.includes("phonemes/daniel/"))).toBe(true);
    expect(first.week.books.find((book) => book.kind === "decodable")?.soundBook).toBe(true);
    expect(blendPlanForWord("nest", first.week).mode).toBe("whole");
    expect(blendPlanForWord(tricky!, second.week).mode).toBe("whole");
    expect(second.container).toBeInTheDocument();
  });

  it("treats a capital word like its lower-case form", async () => {
    const word = "pan";
    const week = cloneWeek(shippedWeeks.find((entry) => entry.meta.week === 3)!);
    const page = week.books.find((book) => book.kind === "decodable")!.pages.find((entry) => entry.text?.toLowerCase().includes(word.toLowerCase()));
    expect(page, "a shipped CVC word must occur in a decodable page").toBeDefined();
    page!.text = page!.text!.replace(new RegExp(`\\b${word}\\b`, "i"), word[0].toUpperCase() + word.slice(1));
    const { audio } = await renderDecodable(week);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${word.toUpperCase()}$`, "i") }));
    expect(audio.getAttribute("src")).toContain("phonemes/daniel/");
  });

  it("returns a plan for a grapheme set of 200,000 entries without RangeError", () => {
    const week = cloneWeek(shippedWeeks.find((entry) => entry.books.some((book) => book.kind === "decodable" &&
      (book.soundsPage?.words ?? []).some((candidate) => blendPlanForWord(candidate, entry).mode === "blend")))!);
    week.tags.taught = Array.from({ length: 200_000 }, (_, index) => `english.phonics.gpc.g${index}.sound`);
    expect(() => blendPlanForWord("pan", week)).not.toThrow(RangeError);
  });
});
