// @vitest-environment jsdom
/**
 * Behavioral replacement for the audio-highlight static case "holds the
 * highlight timer in a ref" (task-reading.tsx half). Skipping ahead in the
 * passage arms the 100 ms intermediate-word timer; unmounting mid-highlight
 * must clear that timer and pause the audio element.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent } from "@testing-library/react";
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

describe("TaskReading highlight timer cleanup", () => {
  it("clears the armed highlight timer on unmount", () => {
    const { container, unmount } = renderWithMessages(
      <TaskReading article={article} enableTranslation={false} />,
    );
    const audio = container.querySelector("audio") as HTMLAudioElement;
    expect(audio).not.toBeNull();

    vi.useFakeTimers();
    const baseline = vi.getTimerCount();

    // First word: establishes the current word index without arming a timer.
    setPlaybackTime(audio, 0.05);
    fireEvent.timeUpdate(audio);
    expect(vi.getTimerCount()).toBe(baseline);

    // Skipping to the third word arms the 100 ms intermediate-word timer.
    setPlaybackTime(audio, 2.05);
    fireEvent.timeUpdate(audio);
    expect(vi.getTimerCount()).toBe(baseline + 1);

    unmount();

    // The unmount cleanup disarms the highlight timer: nothing fires after.
    expect(vi.getTimerCount()).toBe(baseline);
  });
});
