// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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

/** One play call of the fake media element model. */
interface FakePlay {
  /** The source of the element when the play started. */
  src: string;
}

/** The state of one fake media element. */
interface FakeMediaState {
  /** The source the element holds now. */
  source: string;
  /** The play that waits for the clip to end, or null when no play waits. */
  pending: { resolve: () => void; reject: (error: DOMException) => void } | null;
}

/** The fake media element model of one test. */
interface FakeMedia {
  /** The plays of the test, in order. */
  plays: FakePlay[];
  /** The timeline of the element: every play and every ended event, in order. */
  timeline(): string[];
  /** Restores the prototype and removes the listener. */
  restore(): void;
}

/**
 * Installs a browser-like media element model on the jsdom prototype.
 *
 * A browser ends a pending play when the element loads a new source, and it rejects the play
 * promise with an `AbortError` DOMException. The model never ends a clip on its own: the test
 * fires the `ended` event, and the model settles the pending play when that event fires.
 * @returns The model of the test.
 */
function installFakeMedia(): FakeMedia {
  const plays: FakePlay[] = [];
  const timeline: string[] = [];
  const states = new WeakMap<HTMLMediaElement, FakeMediaState>();
  const srcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src");
  const setAttribute = Element.prototype.setAttribute;

  /** Gives the state of one element. */
  function stateOf(element: HTMLMediaElement): FakeMediaState {
    const found = states.get(element);
    if (found) return found;
    const created: FakeMediaState = { source: "", pending: null };
    states.set(element, created);
    return created;
  }

  /** Loads a new source into the element and aborts the pending play of the old source. */
  function loadSource(element: HTMLMediaElement, source: string): void {
    const state = stateOf(element);
    if (source === state.source) return;
    state.source = source;
    const pending = state.pending;
    if (!pending) return;
    state.pending = null;
    pending.reject(
      new DOMException("The play request was aborted by a new load request.", "AbortError"),
    );
  }

  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
    plays.push({ src: this.src });
    timeline.push(`play ${fileNameOf(this.src)}`);
    return new Promise<void>((resolve, reject) => {
      stateOf(this).pending = { resolve, reject };
    });
  });

  Object.defineProperty(HTMLMediaElement.prototype, "src", {
    configurable: true,
    enumerable: srcDescriptor?.enumerable ?? true,
    get(this: HTMLMediaElement): string {
      return srcDescriptor!.get!.call(this);
    },
    set(this: HTMLMediaElement, value: string) {
      srcDescriptor!.set!.call(this, value);
      loadSource(this, String(value));
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, "setAttribute", {
    configurable: true,
    writable: true,
    value(this: HTMLMediaElement, name: string, value: string) {
      if (String(name).toLowerCase() === "src") loadSource(this, String(value));
      return setAttribute.call(this, name, value);
    },
  });

  const onEnded = (event: Event): void => {
    const element = event.target as HTMLMediaElement | null;
    const state = element ? states.get(element) : undefined;
    if (!state?.pending) return;
    const pending = state.pending;
    state.pending = null;
    timeline.push("ended");
    pending.resolve();
  };
  document.addEventListener("ended", onEnded, true);

  return {
    plays,
    timeline: () => [...timeline],
    restore() {
      document.removeEventListener("ended", onEnded, true);
      Object.defineProperty(HTMLMediaElement.prototype, "src", srcDescriptor!);
      delete (HTMLMediaElement.prototype as unknown as Record<string, unknown>).setAttribute;
    },
  };
}

/**
 * Fires the `ended` event of one element and lets the pending play settle.
 * @param element The media element that ends its clip.
 */
async function fireEnded(element: Element): Promise<void> {
  await act(async () => {
    element.dispatchEvent(new Event("ended", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** The file name of a media source. */
function fileNameOf(src: string): string {
  return src.split("/").at(-1) ?? src;
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

  it("plays a shipped CVC word's clips one at a time in grapheme order, then the whole word", async () => {
    const cvc = shippedWeeks.find((week) => week.meta.week === 3);
    expect(cvc, "shipped week 3 must be present").toBeDefined();
    const week = cvc!;
    shippedCvcWords();
    const book = week.books.find((entry) => entry.kind === "decodable");
    const word = (book?.soundsPage?.words ?? [])
      .find((candidate) => blendPlanForWord(candidate, week).mode === "blend");
    expect(word, "a shipped CVC word must exist").toBeTruthy();
    const graphemes = blendPlanForWord(word!, week).graphemes;
    expect(graphemes.length, "the blend word must hold more than one grapheme").toBeGreaterThan(1);
    const g3ClipByGrapheme: Record<string, string> = {
      p: "03-p.mp3",
      a: "26-a-short.mp3",
      n: "04-n.mp3",
    };
    expect(graphemes.every((grapheme) => g3ClipByGrapheme[grapheme])).toBe(true);
    const clipNames = graphemes.map((grapheme) => g3ClipByGrapheme[grapheme]);
    const wholeFile = book!.audio!.file;
    expect(wholeFile, "the shipped decodable must hold its book recording").toBeTruthy();
    const wholeName = fileNameOf(wholeFile!);
    const expected: string[] = [];
    for (const name of clipNames) expected.push(`play ${name}`, "ended");
    expected.push(`play ${wholeName}`);
    const media = installFakeMedia();
    try {
      const { audio, container } = await renderDecodable(week);
      const phoneme = container.querySelectorAll("audio")[0];
      expect(phoneme, "the decodable must render its phoneme audio element").not.toBeNull();
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${word}$`, "i") }));
      expect(
        media.timeline(),
        "only the first grapheme clip plays after the click",
      ).toEqual(expected.slice(0, 1));
      expect(audio.getAttribute("src")).toContain("phonemes/daniel/");
      for (let index = 1; index <= graphemes.length; index += 1) {
        await fireEnded(phoneme!);
        expect(
          media.timeline(),
          index < graphemes.length
            ? `the clip ${index + 1} plays after the ended event of clip ${index}`
            : "the whole word starts after the ended event of the last clip",
        ).toEqual(expected.slice(0, 2 * index + 1));
      }
      expect(screen.queryByRole("alert"), "an aborted play shows no error alert").toBeNull();
      expect(audio).toBeInTheDocument();
    } finally {
      media.restore();
    }
  });

  it("stops the blend sequence of a first tap when a second tap starts another word", async () => {
    const cvc = shippedWeeks.find((week) => week.meta.week === 3);
    expect(cvc, "shipped week 3 must be present").toBeDefined();
    const week = cvc!;
    const book = week.books.find((entry) => entry.kind === "decodable");
    const wholeFile = book!.audio!.file;
    expect(wholeFile, "the shipped decodable must hold its book recording").toBeTruthy();
    const g3ClipByGrapheme: Record<string, string> = {
      p: "03-p.mp3",
      a: "26-a-short.mp3",
      n: "04-n.mp3",
    };
    const first = "pan";
    const second = "nan";
    const firstPlan = blendPlanForWord(first, week);
    const secondPlan = blendPlanForWord(second, week);
    expect(firstPlan.mode, "the first word must blend").toBe("blend");
    expect(secondPlan.mode, "the second word must blend").toBe("blend");
    const firstClip = g3ClipByGrapheme[firstPlan.graphemes[0]];
    const secondClips = secondPlan.graphemes.map((grapheme) => g3ClipByGrapheme[grapheme]);
    expect(firstClip, "the first word must hold a bank clip").toBeTruthy();
    expect(
      secondClips.every((name) => name),
      "the second word must hold a bank clip for every grapheme",
    ).toBe(true);
    const expected: string[] = [`play ${firstClip}`, `play ${secondClips[0]}`];
    for (const name of secondClips.slice(1)) expected.push("ended", `play ${name}`);
    expected.push("ended", `play ${fileNameOf(wholeFile!)}`);
    const media = installFakeMedia();
    try {
      const { container } = await renderDecodable(week);
      const phoneme = container.querySelectorAll("audio")[0];
      expect(phoneme, "the decodable must render its phoneme audio element").not.toBeNull();
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${first}$`, "i") }));
      expect(
        media.timeline(),
        "the first tap plays only the first grapheme clip",
      ).toEqual([`play ${firstClip}`]);
      const beforeSecondTap = media.timeline().length;
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${second}$`, "i") }));
      expect(
        media.timeline().slice(beforeSecondTap),
        "the second tap starts the new word and stops the old sequence",
      ).toEqual([`play ${secondClips[0]}`]);
      for (let index = 0; index < secondClips.length; index += 1) {
        await fireEnded(phoneme!);
      }
      expect(
        media.timeline(),
        "no clip of the old sequence plays after the new tap",
      ).toEqual(expected);
      expect(screen.queryByRole("alert"), "a stopped sequence shows no error alert").toBeNull();
    } finally {
      media.restore();
    }
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

  it("renders labels passed through the optional labels prop (finding F137)", async () => {
    const week = shippedWeeks.find((entry) => entry.meta.week === 1)!;
    const Decodable = await loadDecodable();
    render(
      <Decodable
        week={cloneWeek(week)}
        locale="en"
        labels={{
          soundOfWeek: "Test sound",
          playSound: "Test play",
          trickyWords: "Test tricky",
          previousPage: "Test back",
          nextPage: "Test forward",
          audioError: "Test error",
        }}
      />,
    );
    expect(screen.getByText("Test play")).toBeInTheDocument();
    expect(screen.queryByText("Play the sound")).toBeNull();
    expect(screen.getByRole("region", { name: "Test sound" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Sound of the week" })).toBeNull();
    expect(screen.getByRole("button", { name: "Test back" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Test forward" })).toBeInTheDocument();
  });
});
