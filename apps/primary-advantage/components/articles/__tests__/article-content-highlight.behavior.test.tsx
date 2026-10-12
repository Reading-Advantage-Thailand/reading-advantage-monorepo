// @vitest-environment jsdom
/**
 * Behavioral replacement for the audio-highlight static case "holds the
 * highlight timer in a ref" (article-content.tsx half). Skipping ahead in the
 * passage arms the 100 ms intermediate-word timer; unmounting mid-highlight
 * must clear that timer and pause the audio element.
 */
import "@testing-library/jest-dom/vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchArticleActivityMock = vi.fn();

vi.mock("@/actions/article", () => ({
  fetchArticleActivity: (...args: unknown[]) =>
    fetchArticleActivityMock(...args),
}));

vi.mock("@/actions/flashcard", () => ({
  saveFlashcard: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import type { Article } from "@/types";
import ArticleContent from "../article-content";
import { renderWithMessages } from "../../__tests__/helpers/render-with-messages";

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
  fetchArticleActivityMock.mockResolvedValue([]);
  Element.prototype.scrollIntoView = () => undefined;
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => undefined;
  HTMLElement.prototype.releasePointerCapture = () => undefined;
  (globalThis as Record<string, unknown>).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  // jsdom cannot play media; stub the transport methods.
  const proto = window.HTMLMediaElement.prototype;
  vi.spyOn(proto, "play").mockImplementation(() => Promise.resolve());
  vi.spyOn(proto, "pause").mockImplementation(() => undefined);
  vi.spyOn(proto, "load").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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

describe("ArticleContent highlight loop cleanup", () => {
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

  it("follows the voice with one frame at a time and leaves no frame or timer after unmount", () => {
    const { container, unmount } = renderWithMessages(<ArticleContent article={article} />);
    const audio = container.querySelector("audio") as HTMLAudioElement;
    expect(audio).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Listen and read along" }));
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
    const baseline = vi.getTimerCount();

    // No frame before the audio plays.
    expect(frames.size).toBe(0);
    act(() => void audio.dispatchEvent(new Event("play")));
    expect(frames.size).toBe(1);

    // A jump of two words lights the third word at once (no 100 ms chain of timers).
    setPlaybackTime(audio, 2.05);
    const [id, run] = [...frames.entries()][0];
    frames.delete(id);
    act(() => run(0));
    expect(frames.size).toBe(1);
    expect(container.querySelector(".bg-blue-500")?.textContent).toBe("gamma");

    unmount();

    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(baseline);
  });

  it("stops the loop on pause", () => {
    const { container } = renderWithMessages(<ArticleContent article={article} />);
    const audio = container.querySelector("audio") as HTMLAudioElement;
    act(() => void audio.dispatchEvent(new Event("play")));
    expect(frames.size).toBe(1);
    act(() => void audio.dispatchEvent(new Event("pause")));
    expect(frames.size).toBe(0);
  });
});

describe("ArticleContent translation language select", () => {
  it("names the language select for assistive technology (gate sweep axe fix)", () => {
    const { unmount } = renderWithMessages(<ArticleContent article={article} />);
    expect(screen.getAllByRole("combobox", { name: "Translation language" }).length).toBeGreaterThan(0);
    unmount();
  });
});

describe("ArticleContent one player (Phase S3)", () => {
  const twoSentences: Article = {
    ...article,
    passage: "Alpha beta. Gamma delta.",
    sentences: [
      {
        sentence: "Alpha beta.",
        startTime: 0,
        endTime: 2,
        words: [
          { word: "Alpha", start: 0, end: 1 },
          { word: "beta.", start: 1, end: 2 },
        ],
      },
      {
        sentence: "Gamma delta.",
        startTime: 3,
        endTime: 5,
        words: [
          { word: "Gamma", start: 3, end: 4 },
          { word: "delta.", start: 4, end: 5 },
        ],
      },
    ],
  };

  it("shows no player before the audio opens, and exactly one after", () => {
    renderWithMessages(<ArticleContent article={twoSentences} />);
    expect(screen.queryByRole("button", { name: "Play audio" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Listen and read along" }));
    expect(screen.getAllByRole("button", { name: "Play audio" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Seek back" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Seek forward" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Listen and read along" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close the audio" }));
    expect(screen.queryByRole("button", { name: "Play audio" })).toBeNull();
  });

  it("Next sentence seeks to the next entry and plays; Previous goes back", () => {
    const { container } = renderWithMessages(<ArticleContent article={twoSentences} />);
    const audio = container.querySelector("audio") as HTMLAudioElement;
    const play = vi.spyOn(window.HTMLMediaElement.prototype, "play");
    fireEvent.click(screen.getByRole("button", { name: "Listen and read along" }));
    fireEvent.click(screen.getByRole("button", { name: "Replay this sentence" }));
    expect(audio.currentTime).toBeCloseTo(0);
    fireEvent.click(screen.getByRole("button", { name: "Next sentence" }));
    expect(audio.currentTime).toBeCloseTo(2.95);
    expect(play).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Previous sentence" }));
    expect(audio.currentTime).toBeCloseTo(0);
  });

  it("a tap on the speed sign changes the playback rate of the audio", () => {
    const { container } = renderWithMessages(<ArticleContent article={twoSentences} />);
    const audio = container.querySelector("audio") as HTMLAudioElement;
    fireEvent.click(screen.getByRole("button", { name: "Listen and read along" }));
    fireEvent.click(screen.getByRole("button", { name: "Speed 1 times. Change speed" }));
    expect(audio.playbackRate).toBe(1.25);
    fireEvent.click(screen.getByRole("button", { name: "Speed 1.25 times. Change speed" }));
    expect(audio.playbackRate).toBe(0.75);
  });

  it("shows the hint line while the audio is open", () => {
    renderWithMessages(<ArticleContent article={twoSentences} />);
    expect(screen.queryByText(/Tap a word to hear it/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Listen and read along" }));
    expect(screen.getByText(/Tap a word to hear it from there/)).toBeInTheDocument();
  });
});
