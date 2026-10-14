// @vitest-environment jsdom
/** Chapter read-along (STU-04 S4): the chapter drives the shared passage like the article page. */
import "@testing-library/jest-dom/vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChapterContent } from "../chapter-content";
import { renderWithMessages } from "../../__tests__/helpers/render-with-messages";

const props = {
  title: "The Lantern",
  passage: "Alpha beta gamma. Delta epsilon.",
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
    {
      sentence: "Delta epsilon.",
      startTime: 3,
      endTime: 5,
      words: [
        { word: "Delta", start: 3, end: 4 },
        { word: "epsilon.", start: 4, end: 5 },
      ],
    },
  ],
  translatedPassage: { th: ["อัลฟา เบตา แกมมา", "เดลตา เอปไซลอน"] } as Record<string, string[]>,
  audioKey: "/audios/story/chapter/c1.mp3",
  imageUrl: "https://storage.googleapis.com/bucket/images/story/cl123.png",
  imageAlt: "Chapter picture",
};

beforeEach(() => {
  Element.prototype.scrollIntoView = () => undefined;
  const proto = window.HTMLMediaElement.prototype;
  vi.spyOn(proto, "play").mockImplementation(() => Promise.resolve());
  vi.spyOn(proto, "pause").mockImplementation(() => undefined);
  vi.spyOn(proto, "load").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Moves the stubbed playback position of an audio element. */
function setPlaybackTime(audio: HTMLAudioElement, seconds: number): void {
  Object.defineProperty(audio, "currentTime", {
    value: seconds,
    configurable: true,
  });
}

describe("chapter read-along parity with the article page", () => {
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

  it("owns the audio element and shows one player after opening", () => {
    const { container } = renderWithMessages(<ChapterContent {...props} />);
    const audio = container.querySelector("audio") as HTMLAudioElement;
    expect(audio.getAttribute("src")).toContain("audios/story/chapter/c1.mp3");
    expect(screen.queryByRole("button", { name: "Play audio" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Listen and read along" }));
    expect(screen.getAllByRole("button", { name: "Play audio" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Close the audio" }));
    expect(screen.queryByRole("button", { name: "Play audio" })).toBeNull();
  });

  it("lights the spoken word while the audio plays, like the article page", () => {
    const { container } = renderWithMessages(<ChapterContent {...props} />);
    const audio = container.querySelector("audio") as HTMLAudioElement;
    fireEvent.click(screen.getByRole("button", { name: "Listen and read along" }));
    act(() => void audio.dispatchEvent(new Event("play")));
    setPlaybackTime(audio, 2.05);
    const [id, run] = [...frames.entries()][0];
    frames.delete(id);
    act(() => run(0));
    expect(container.querySelector(".bg-blue-500")?.textContent).toBe("gamma");
  });

  it("seeks and plays from a tapped word", () => {
    const { container } = renderWithMessages(<ChapterContent {...props} />);
    const audio = container.querySelector("audio") as HTMLAudioElement;
    // The reader waits for metadata before it seeks; model a loaded element.
    Object.defineProperty(audio, "readyState", { value: 4, configurable: true });
    const play = vi.spyOn(window.HTMLMediaElement.prototype, "play");
    fireEvent.click(screen.getByRole("button", { name: "Listen and read along" }));
    fireEvent.click(screen.getByText("beta"));
    expect(audio.currentTime).toBeCloseTo(0.95);
    expect(play).toHaveBeenCalled();
  });

  it("shows the translation of the tapped sentence", () => {
    renderWithMessages(<ChapterContent {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Listen and read along" }));
    fireEvent.click(screen.getByText("beta"));
    fireEvent.click(screen.getByRole("button", { name: "Translate" }));
    expect(screen.getByText("อัลฟา เบตา แกมมา")).toBeInTheDocument();
  });

  it("shows the chapter picture through the Next.js resizer (owner choice C1: the bucket files are about 6 MB)", () => {
    renderWithMessages(<ChapterContent {...props} />);
    const src = screen.getByRole("img", { name: "Chapter picture" }).getAttribute("src") ?? "";
    expect(src.startsWith("/_next/image?")).toBe(true);
    expect(src).toContain(`url=${encodeURIComponent(props.imageUrl)}`);
  });

  it("pauses the audio element on unmount", () => {
    const { container, unmount } = renderWithMessages(<ChapterContent {...props} />);
    const audio = container.querySelector("audio") as HTMLAudioElement;
    const pause = vi.spyOn(audio, "pause");
    unmount();
    expect(pause).toHaveBeenCalled();
  });

  it("resets the playback rate to 1 when the player closes", () => {
    const { container } = renderWithMessages(<ChapterContent {...props} />);
    const audio = container.querySelector("audio") as HTMLAudioElement;
    fireEvent.click(screen.getByRole("button", { name: "Listen and read along" }));
    fireEvent.click(screen.getByRole("button", { name: "Speed 1 times. Change speed" }));
    expect(audio.playbackRate).toBe(1.25);
    fireEvent.click(screen.getByRole("button", { name: "Close the audio" }));
    expect(audio.playbackRate).toBe(1);
  });

  it("waits for the metadata before it seeks when no metadata is loaded", () => {
    const { container } = renderWithMessages(<ChapterContent {...props} />);
    const audio = container.querySelector("audio") as HTMLAudioElement;
    Object.defineProperty(audio, "readyState", { value: 0, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: "Listen and read along" }));
    fireEvent.click(screen.getByText("beta"));
    expect(audio.currentTime).toBe(0);
    Object.defineProperty(audio, "readyState", { value: 1, configurable: true });
    act(() => void audio.dispatchEvent(new Event("loadedmetadata")));
    expect(audio.currentTime).toBeCloseTo(0.95, 5);
  });

  it("ignores a word tap while the player is closed", () => {
    const { container } = renderWithMessages(<ChapterContent {...props} />);
    const audio = container.querySelector("audio") as HTMLAudioElement;
    const play = vi.spyOn(window.HTMLMediaElement.prototype, "play");
    fireEvent.click(screen.getByText("beta"));
    expect(audio.currentTime).toBe(0);
    expect(play).not.toHaveBeenCalled();
  });
});
