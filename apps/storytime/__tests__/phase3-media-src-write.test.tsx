// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StorytimeWeek } from "../lib/contracts/week";
import { blendPlanForWord } from "../lib/blend";

const appDir = resolve(import.meta.dirname, "..");
const week3 = JSON.parse(readFileSync(resolve(appDir, "content/l2/w03.json"), "utf8")) as StorytimeWeek;

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

/** The state of one fake media element. */
interface FakeMediaState {
  /** The source the element holds now. */
  source: string;
  /** The play that waits for the clip to end, or null when no play waits. */
  pending: { resolve: () => void; reject: (error: DOMException) => void } | null;
}

/** The fake media element model of one test. */
interface StrictFakeMedia {
  /** The timeline of the element: every play and every ended event, in order. */
  timeline(): string[];
  /** Restores the prototype and removes the listener. */
  restore(): void;
}

/**
 * Installs a spec-strict media element model on the jsdom prototype.
 *
 * Unlike the committed model of `phase3-decodable-ui.test.tsx`, this model aborts a pending play
 * on EVERY write of the src attribute or property, the same value included. The HTML spec runs
 * the media load algorithm on every src write, and a new load rejects the pending play promise
 * with an `AbortError` DOMException. The model never ends a clip on its own: the test fires the
 * `ended` event, and the model settles the pending play when that event fires.
 * @returns The model of the test.
 */
function installStrictFakeMedia(): StrictFakeMedia {
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

  /** Loads a source and aborts the pending play, the same value included. */
  function loadSource(element: HTMLMediaElement, source: string): void {
    const state = stateOf(element);
    state.source = source;
    const pending = state.pending;
    if (!pending) return;
    state.pending = null;
    pending.reject(new DOMException("The play request was aborted by a new load request.", "AbortError"));
  }

  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
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

describe("Phase 3 Storytime decodable media src writes", () => {
  it("plays every clip of a blend word and the whole word when every src write aborts a pending play", async () => {
    const book = week3.books.find((entry) => entry.kind === "decodable");
    const word = (book?.soundsPage?.words ?? [])
      .find((candidate) => blendPlanForWord(candidate, week3).mode === "blend");
    expect(word, "shipped week 3 must hold a blend word").toBeTruthy();
    const graphemes = blendPlanForWord(word!, week3).graphemes;
    expect(graphemes.length, "the blend word must hold more than one grapheme").toBeGreaterThan(1);
    const clipByGrapheme: Record<string, string> = {
      p: "03-p.mp3",
      a: "26-a-short.mp3",
      n: "04-n.mp3",
    };
    expect(graphemes.every((grapheme) => clipByGrapheme[grapheme])).toBe(true);
    const wholeName = fileNameOf(book!.audio!.file!);
    const expected: string[] = [];
    for (const grapheme of graphemes) expected.push(`play ${clipByGrapheme[grapheme]}`, "ended");
    expected.push(`play ${wholeName}`);

    const media = installStrictFakeMedia();
    try {
      const Decodable = await loadDecodable();
      const result = render(<Decodable week={structuredClone(week3)} locale="en" />);
      const phoneme = result.container.querySelectorAll("audio")[0];
      expect(phoneme, "the decodable must render its phoneme audio element").not.toBeNull();
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${word}$`, "i") }));
      expect(media.timeline(), "only the first grapheme clip plays after the click").toEqual(expected.slice(0, 1));
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
    } finally {
      media.restore();
    }
  });
});
