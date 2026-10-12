// @vitest-environment jsdom
/**
 * Behavioral replacement for the audio-highlight static case "holds the
 * highlight timer in a ref" (task-reading.tsx half). Skipping ahead in the
 * passage arms the 100 ms intermediate-word timer; unmounting mid-highlight
 * must clear that timer and pause the audio element.
 */
import "@testing-library/jest-dom/vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Article } from "@/types";
import { TaskReading } from "@/components/lesson/task/task-reading";
import { renderWithMessages } from "../../../__tests__/helpers/render-with-messages";

const article: Article = {
  id: "article-1",
  title: "A Test Story",
  summary: "",
  translatedSummary: null,
  translatedPassage: null,
  imageDescription: "",
  passage: "Alpha beta gamma.",
  createdAt: new Date(0),
  rating: 1,
  type: "story",
  cefrLevel: "A1",
  raLevel: 1,
  genre: "fiction",
  audioUrl: "/audio/article-1.mp3",
  sentences: [
    {
      sentence: "Alpha beta gamma.",
      startTime: 0,
      endTime: 3,
      words: [
        { word: "Alpha", start: 0, end: 1 },
        { word: "beta", start: 1, end: 2 },
        { word: "gamma.", start: 2, end: 3 },
      ],
    },
  ],
};

beforeEach(() => {
  Element.prototype.scrollIntoView = () => undefined;
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => undefined;
  HTMLElement.prototype.releasePointerCapture = () => undefined;
  // jsdom cannot play media; stub the transport methods.
  const proto = window.HTMLMediaElement.prototype;
  vi.spyOn(proto, "play").mockImplementation(() => Promise.resolve());
  vi.spyOn(proto, "pause").mockImplementation(() => undefined);
  vi.spyOn(proto, "load").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/**
 * Moves the stubbed playback position of an audio element.
 * @param audio The reader audio element.
 * @param seconds The playback position in seconds.
 */
function setPlaybackTime(audio: HTMLAudioElement, seconds: number): void {
  Object.defineProperty(audio, "currentTime", {
    value: seconds,
    configurable: true,
  });
}

describe("TaskReading highlight loop cleanup", () => {
  let frames: Map<number, FrameRequestCallback>;
  let nextId: number;

  beforeEach(() => {
    frames = new Map();
    nextId = 1;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.set(nextId, cb);
      return nextId++;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("follows the voice with one frame at a time and leaves no frame or timer after unmount", () => {
    const { container, unmount } = renderWithMessages(
      <TaskReading article={article} enableTranslation={false} />,
    );
    const audio = container.querySelector("audio") as HTMLAudioElement;
    expect(audio).not.toBeNull();

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
    const baseline = vi.getTimerCount();

    expect(frames.size).toBe(0);
    act(() => void audio.dispatchEvent(new Event("play")));
    expect(frames.size).toBe(1);

    // A jump of two words lights the third word at once (no 100 ms chain of timers).
    setPlaybackTime(audio, 2.05);
    const [id, run] = [...frames.entries()][0];
    frames.delete(id);
    act(() => run(0));
    expect(container.querySelector(".bg-blue-500")?.textContent).toBe("gamma");
    expect(vi.getTimerCount()).toBe(baseline);

    unmount();

    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(baseline);
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it("stops the loop on pause", () => {
    const { container } = renderWithMessages(<TaskReading article={article} enableTranslation={false} />);
    const audio = container.querySelector("audio") as HTMLAudioElement;
    act(() => void audio.dispatchEvent(new Event("play")));
    expect(frames.size).toBe(1);
    act(() => void audio.dispatchEvent(new Event("pause")));
    expect(frames.size).toBe(0);
  });
});

describe("TaskReading tap and player (same read-along as the article page)", () => {
  it("seeks to the tapped word and plays", () => {
    const { container } = renderWithMessages(<TaskReading article={article} enableTranslation={false} />);
    const audio = container.querySelector("audio") as HTMLAudioElement;
    // The reader waits for metadata before it seeks; model a loaded element.
    Object.defineProperty(audio, "readyState", { value: 4, configurable: true });
    fireEvent.click(screen.getByText("beta"));
    expect(audio.currentTime).toBeCloseTo(0.95, 5);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it("plays the sentence when the student taps the band outside a word", () => {
    const { container } = renderWithMessages(<TaskReading article={article} enableTranslation={false} />);
    const audio = container.querySelector("audio") as HTMLAudioElement;
    // The reader waits for metadata before it seeks; model a loaded element.
    Object.defineProperty(audio, "readyState", { value: 4, configurable: true });
    audio.currentTime = 2;
    const band = container.querySelector("[data-sentence='0']") as HTMLElement;
    fireEvent.click(band);
    expect(audio.currentTime).toBeCloseTo(0, 1);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it("shows the one shared player, and the speed sign sets the playback rate", () => {
    const { container } = renderWithMessages(<TaskReading article={article} enableTranslation={false} />);
    const audio = container.querySelector("audio") as HTMLAudioElement;
    expect(container.querySelectorAll("[data-player]")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Speed 1 times. Change speed" }));
    expect(audio.playbackRate).toBe(1.25);
  });

  it("plays or pauses from the player", () => {
    renderWithMessages(<TaskReading article={article} enableTranslation={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Play audio" }));
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });
});

describe("TaskReading paragraph blocks (FR-9)", () => {
  it("shows every sentence once in 3 blocks when no paragraph holds them", () => {
    const texts = ["Go.", "It is a cat.", "The cat runs.", "Go home now.", "Stop.", "Look up.", "The end."];
    const many: Article = {
      ...article,
      passage: "Different words Go.\n\nOther words Go. again",
      sentences: texts.map((sentence, i) => ({
        sentence,
        startTime: i,
        endTime: i + 1,
        words: sentence.split(" ").map((word, w) => ({ word, start: w, end: w + 1 })),
      })),
    };
    const { container } = renderWithMessages(<TaskReading article={many} enableTranslation={false} />);
    const blocks = container.querySelectorAll("p.indent-8");
    expect(blocks).toHaveLength(3);
    const all = Array.from(blocks).map((b) => b.textContent).join("").replace(/\s+/g, "");
    expect(all).toBe(texts.join("").replace(/\s+/g, ""));
  });
});

describe("TaskReading review fixes (2026-10-12)", () => {
  it("waits for the metadata before it seeks when no metadata is loaded", () => {
    const { container } = renderWithMessages(<TaskReading article={article} enableTranslation={false} />);
    const audio = container.querySelector("audio") as HTMLAudioElement;
    Object.defineProperty(audio, "readyState", { value: 0, configurable: true });
    fireEvent.click(screen.getByText("beta"));
    expect(audio.currentTime).toBe(0);
    Object.defineProperty(audio, "readyState", { value: 1, configurable: true });
    act(() => void audio.dispatchEvent(new Event("loadedmetadata")));
    expect(audio.currentTime).toBeCloseTo(0.95, 5);
  });
});
