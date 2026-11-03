// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReadAlongSentence } from "../../../lib/align";
import { NO_POSITION } from "../../../lib/position";
import { ReadAlongPassage } from "../read-along-passage";
import { ReadAlongPlayer } from "../read-along-player";

afterEach(cleanup);

const sentences: ReadAlongSentence[] = [
  {
    sentence: "One small cat.",
    startTime: 0,
    endTime: 1,
    words: [
      { word: "One", start: 0, end: 0.25 },
      { word: "small", start: 0.25, end: 0.65 },
      { word: "cat", start: 0.65, end: 1 },
    ],
  },
];

describe("read-along accessibility", () => {
  it("announces the current sentence and word with aria-current", () => {
    const { container } = render(
      <ReadAlongPassage
        sentences={sentences}
        passage=""
        position={{ sentenceIndex: 0, wordIndex: 1 }}
        active
      />,
    );
    expect(container.querySelector('[data-sentence="0"]')).toHaveAttribute("aria-current", "true");
    expect(container.querySelector('[data-word="1"]')).toHaveAttribute("aria-current", "true");
  });

  it("reaches a word by keyboard and plays it with Enter and Space", () => {
    const onWordTap = vi.fn();
    const { getByText } = render(
      <ReadAlongPassage sentences={sentences} passage="" position={NO_POSITION} active onWordTap={onWordTap} />,
    );
    const word = getByText("small");
    expect(word).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(word, { key: "Enter" });
    fireEvent.keyDown(word, { key: " " });
    expect(onWordTap.mock.calls).toEqual([[0, 1], [0, 1]]);
  });

  it("does not render duplicate control ids when two players share a page", () => {
    const noop = () => {};
    const { container } = render(
      <>
        <ReadAlongPlayer playing={false} speed={1} sentenceIndex={0} sentenceCount={1} onPlayPause={noop} onPlaySentence={noop} onSpeedChange={noop} />
        <ReadAlongPlayer playing={false} speed={1} sentenceIndex={0} sentenceCount={1} onPlayPause={noop} onPlaySentence={noop} onSpeedChange={noop} />
      </>,
    );
    expect(container.querySelectorAll("[id]")).toHaveLength(0);
  });
});
