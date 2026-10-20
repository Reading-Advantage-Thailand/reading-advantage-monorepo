// @vitest-environment jsdom

import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Article } from "@/types";
import { TaskReading } from "@/components/lesson/task/task-reading";
import { renderWithMessages } from "../../../__tests__/helpers/render-with-messages";

/**
 * Minimal article fixture with two sentences and word timestamps.
 */
const article: Article = {
  id: "article-1",
  title: "A Test Story",
  summary: "",
  translatedSummary: null,
  translatedPassage: null,
  imageDescription: "",
  passage: "The cat sat. The dog ran.",
  createdAt: new Date(0),
  rating: 1,
  type: "story",
  cefrLevel: "A1",
  raLevel: 1,
  genre: "fiction",
  audioUrl: "/audio/article-1.mp3",
  sentences: [
    {
      sentence: "The cat sat.",
      startTime: 0,
      endTime: 2,
      words: [
        { word: "The", start: 0, end: 0.5 },
        { word: "cat", start: 0.5, end: 1 },
        { word: "sat.", start: 1, end: 2 },
      ],
    },
    {
      sentence: "The dog ran.",
      startTime: 2,
      endTime: 4,
      words: [
        { word: "The", start: 2, end: 2.5 },
        { word: "dog", start: 2.5, end: 3 },
        { word: "ran.", start: 3, end: 4 },
      ],
    },
  ],
};

beforeEach(() => {
  // jsdom lacks these pointer/DOM APIs that Radix Select calls during open.
  Element.prototype.scrollIntoView = () => undefined;
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => undefined;
  HTMLElement.prototype.releasePointerCapture = () => undefined;

  // jsdom cannot fetch or decode media; stub the transport methods.
  const proto = window.HTMLMediaElement.prototype;
  vi.spyOn(proto, "play").mockImplementation(() => Promise.resolve());
  vi.spyOn(proto, "pause").mockImplementation(() => undefined);
  vi.spyOn(proto, "load").mockImplementation(() => undefined);
});

/**
 * Renders TaskReading and returns the underlying audio element.
 * @returns Render helpers with the observable audio element.
 */
function renderReading() {
  const utils = renderWithMessages(
    <TaskReading article={article} enableTranslation={false} />,
  );
  const audio = utils.container.querySelector("audio") as HTMLAudioElement;
  return { ...utils, audio };
}

/**
 * Presses the speed sign until it shows the wanted speed.
 * @param speed The wanted speed in the shared list (0.75, 1, 1.25).
 */
function chooseSpeed(speed: number) {
  for (let i = 0; i < 3; i++) {
    const sign = screen.queryByRole("button", { name: `Speed ${speed} times. Change speed` });
    if (sign) return;
    fireEvent.click(screen.getByRole("button", { name: /^Speed .* times\. Change speed$/ }));
  }
}

describe("TaskReading playback rate", () => {
  it("applies the selected rate immediately while media is loaded, without a loadedmetadata event", () => {
    const { audio } = renderReading();
    expect(audio.playbackRate).toBe(1);

    chooseSpeed(1.25);

    // No loadedmetadata was dispatched; only the speed handler can set this.
    expect(audio.playbackRate).toBe(1.25);
  });

  it("re-applies the chosen rate when a fresh media load fires loadedmetadata", () => {
    const { audio } = renderReading();

    chooseSpeed(0.75);
    expect(audio.playbackRate).toBe(0.75);

    // A fresh load resets the element rate, then fires loadedmetadata.
    audio.playbackRate = 1;
    audio.dispatchEvent(new Event("loadedmetadata"));

    expect(audio.playbackRate).toBe(0.75);
  });

  it("returns the rate to 1 when the user comes back to the default speed", () => {
    const { audio } = renderReading();

    chooseSpeed(1.25);
    expect(audio.playbackRate).toBe(1.25);

    chooseSpeed(1);
    expect(audio.playbackRate).toBe(1);
  });
});
