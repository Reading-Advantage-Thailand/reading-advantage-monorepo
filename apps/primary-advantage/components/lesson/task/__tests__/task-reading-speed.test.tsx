// @vitest-environment jsdom

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
 * Renders TaskReading and returns the underlying audio element plus a
 * user-event API for driving the speed Select.
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
 * Opens the reading-speed Select and picks the option with the given label.
 * @param user The user-event API instance.
 * @param label Option label, e.g. "1.5x".
 */
async function chooseSpeed(user: ReturnType<typeof userEvent.setup>, label: string) {
  const trigger = screen.getByRole("combobox");
  await user.click(trigger);
  await screen.findByRole("listbox");
  await user.click(screen.getByRole("option", { name: label }));
}

describe("TaskReading playback rate", () => {
  it("applies the selected rate immediately while media is loaded, without a loadedmetadata event", async () => {
    const user = userEvent.setup();
    const { audio } = renderReading();
    expect(audio.playbackRate).toBe(1);

    await chooseSpeed(user, "1.5x");

    // No loadedmetadata was dispatched; only the [readingSpeed] effect can set this.
    expect(audio.playbackRate).toBe(1.5);
  });

  it("re-applies the chosen rate when a fresh media load fires loadedmetadata", async () => {
    const user = userEvent.setup();
    const { audio } = renderReading();

    await chooseSpeed(user, "2x");
    expect(audio.playbackRate).toBe(2);

    // A fresh load resets the element rate, then fires loadedmetadata.
    audio.playbackRate = 1;
    audio.dispatchEvent(new Event("loadedmetadata"));

    expect(audio.playbackRate).toBe(2);
  });

  it("returns the rate to 1 when the user re-selects the default speed", async () => {
    const user = userEvent.setup();
    const { audio } = renderReading();

    await chooseSpeed(user, "1.5x");
    expect(audio.playbackRate).toBe(1.5);

    await chooseSpeed(user, "1x");
    expect(audio.playbackRate).toBe(1);
  });
});
