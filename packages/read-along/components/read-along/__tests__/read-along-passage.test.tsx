// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HIGHLIGHT_CLASSES } from "@/lib/audio-highlight";
import type { ReadAlongSentence } from "@/lib/read-along/align";
import { NO_POSITION } from "@/lib/read-along/position";
import { ReadAlongPassage } from "../read-along-passage";
import contraction from "@/lib/read-along/__tests__/fixtures/contraction.json";
import curlyQuote from "@/lib/read-along/__tests__/fixtures/curly-quote.json";
import audioDropped from "@/lib/read-along/__tests__/fixtures/audio-dropped.json";

afterEach(cleanup);

const BAND = HIGHLIGHT_CLASSES.playingSentence.split(" ")[0];
const MARK = HIGHLIGHT_CLASSES.currentWord.split(" ")[0];

/** Text of the elements that carry the word mark. */
function markedWords(container: HTMLElement): string[] {
  return [...container.querySelectorAll(`.${MARK}`)].map((e) => e.textContent ?? "");
}

describe("ReadAlongPassage", () => {
  it("lights the screen word that the audio word says, across a contraction and a quote", () => {
    // audio: It / says: / "Don't / run."  -> screen: It / says / Don't / run
    const { container } = render(
      <ReadAlongPassage
        sentences={contraction as ReadAlongSentence[]}
        passage=""
        position={{ sentenceIndex: 0, wordIndex: 2 }}
        active
      />,
    );
    expect(markedWords(container)).toEqual(["Don't"]);
  });

  it("lights the right word after a dropped audio word", () => {
    // audio: is / a / friend. -> screen: The ball is a friend.
    const { container } = render(
      <ReadAlongPassage
        sentences={audioDropped as ReadAlongSentence[]}
        passage=""
        position={{ sentenceIndex: 0, wordIndex: 1 }}
        active
      />,
    );
    expect(markedWords(container)).toEqual(["a"]);
  });

  it("keeps the band and the mark when the audio is paused (the position stays)", () => {
    const { container } = render(
      <ReadAlongPassage
        sentences={curlyQuote as ReadAlongSentence[]}
        passage=""
        position={{ sentenceIndex: 0, wordIndex: 3 }}
        active
      />,
    );
    expect(markedWords(container)).toEqual(["baby"]);
    expect(container.querySelectorAll(`.${BAND}`)).toHaveLength(1);
  });

  it("shows no band and no mark when the read-along is off", () => {
    const { container } = render(
      <ReadAlongPassage
        sentences={contraction as ReadAlongSentence[]}
        passage=""
        position={{ sentenceIndex: 0, wordIndex: 1 }}
        active={false}
      />,
    );
    expect(markedWords(container)).toEqual([]);
    expect(container.querySelectorAll(`.${BAND}`)).toHaveLength(0);
  });

  it("shows the band only for a sentence with words: []", () => {
    const sentences = [{ ...contraction[0], words: [] }] as ReadAlongSentence[];
    const { container } = render(
      <ReadAlongPassage sentences={sentences} passage="" position={{ sentenceIndex: 0, wordIndex: -1 }} active />,
    );
    expect(container.querySelectorAll(`.${BAND}`)).toHaveLength(1);
    expect(markedWords(container)).toEqual([]);
  });

  it("puts every sentence in at most 3 blocks, each sentence once, and keeps the text whole", () => {
    const sentences: ReadAlongSentence[] = Array.from({ length: 7 }, (_, i) => ({
      sentence: `Sentence number ${i}.`,
      startTime: i,
      endTime: i + 1,
      words: [],
    }));
    const { container } = render(
      <ReadAlongPassage sentences={sentences} passage="" position={NO_POSITION} active={false} />,
    );
    expect(container.querySelectorAll("p")).toHaveLength(3);
    const text = container.textContent ?? "";
    for (let i = 0; i < 7; i++) expect(text.split(`number ${i}.`)).toHaveLength(2);
    expect(text).toContain("number 0. Sentence number 1.");
  });

  it("renders the block media from the host", () => {
    render(
      <ReadAlongPassage
        sentences={contraction as ReadAlongSentence[]}
        passage=""
        position={NO_POSITION}
        active={false}
        renderBlockMedia={(i) => <i data-testid={`media-${i}`} />}
      />,
    );
    expect(screen.getByTestId("media-0")).toBeInTheDocument();
  });

  it("falls back to the passage text when there are no sentences", () => {
    const { container } = render(
      <ReadAlongPassage sentences={[]} passage="One. Two. Three. Four." position={NO_POSITION} active={false} />,
    );
    expect(container.querySelectorAll("p")).toHaveLength(3);
  });

  it("reports the audio word index of a tapped screen word", () => {
    const onWordTap = vi.fn();
    render(
      <ReadAlongPassage
        sentences={audioDropped as ReadAlongSentence[]}
        passage=""
        position={NO_POSITION}
        active
        onWordTap={onWordTap}
      />,
    );
    fireEvent.click(screen.getByText("friend"));
    expect(onWordTap).toHaveBeenCalledWith(0, 2);
    fireEvent.click(screen.getByText("The"));
    expect(onWordTap).toHaveBeenLastCalledWith(0, 0);
  });

  it("reports -1 when the sentence has no word timings", () => {
    const onWordTap = vi.fn();
    const sentences = [{ ...contraction[0], words: [] }] as ReadAlongSentence[];
    render(<ReadAlongPassage sentences={sentences} passage="" position={NO_POSITION} active onWordTap={onWordTap} />);
    fireEvent.click(screen.getByText("run"));
    expect(onWordTap).toHaveBeenCalledWith(0, -1);
  });

  it("plays the sentence when the student taps the band outside a word", () => {
    const onWordTap = vi.fn();
    const { container } = render(
      <ReadAlongPassage
        sentences={audioDropped as ReadAlongSentence[]}
        passage=""
        position={NO_POSITION}
        active
        onWordTap={onWordTap}
      />,
    );
    fireEvent.click(container.querySelector("[data-sentence='0']") as HTMLElement);
    expect(onWordTap).toHaveBeenCalledTimes(1);
    expect(onWordTap).toHaveBeenCalledWith(0, -1);
  });

  it("calls the tap handler once for a word tap (the word does not bubble to the sentence)", () => {
    const onWordTap = vi.fn();
    render(
      <ReadAlongPassage
        sentences={audioDropped as ReadAlongSentence[]}
        passage=""
        position={NO_POSITION}
        active
        onWordTap={onWordTap}
      />,
    );
    fireEvent.click(screen.getByText("friend"));
    expect(onWordTap).toHaveBeenCalledTimes(1);
  });

  it("makes each sentence one tab stop and plays it with Enter or Space", () => {
    const onWordTap = vi.fn();
    const { container } = render(
      <ReadAlongPassage
        sentences={audioDropped as ReadAlongSentence[]}
        passage=""
        position={NO_POSITION}
        active
        onWordTap={onWordTap}
      />,
    );
    expect(container.querySelectorAll("[tabindex='0']")).toHaveLength(1);
    expect(container.querySelectorAll("[role='button']")).toHaveLength(1);
    const stop = container.querySelector("[data-sentence='0']") as HTMLElement;
    expect(stop).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(stop, { key: "Enter" });
    fireEvent.keyDown(stop, { key: " " });
    expect(onWordTap).toHaveBeenCalledTimes(2);
    expect(onWordTap).toHaveBeenLastCalledWith(0, -1);
  });

  it("has no tab stop and no button role when the read-along is off", () => {
    const { container } = render(
      <ReadAlongPassage sentences={audioDropped as ReadAlongSentence[]} passage="" position={NO_POSITION} active={false} />,
    );
    expect(container.querySelectorAll("[tabindex]")).toHaveLength(0);
    expect(container.querySelectorAll("[role='button']")).toHaveLength(0);
  });

  it("does not play the sentence from a key press on the sentence menu", () => {
    const onWordTap = vi.fn();
    const { container } = render(
      <ReadAlongPassage
        sentences={audioDropped as ReadAlongSentence[]}
        passage=""
        position={NO_POSITION}
        active
        onWordTap={onWordTap}
      />,
    );
    fireEvent.keyDown(container.querySelector("[data-sentence='0']") as HTMLElement, { key: "a" });
    expect(onWordTap).not.toHaveBeenCalled();
  });
});
