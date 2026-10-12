import { describe, expect, it } from "vitest";
import type { ReadAlongSentence } from "../align";
import { SEEK_EPSILON } from "@/lib/audio-highlight";
import { findPosition, NO_POSITION, seekTimeForSentence, seekTimeForWord } from "../position";

const sentences: ReadAlongSentence[] = [
  {
    sentence: "Alpha beta gamma.",
    startTime: 1,
    endTime: 4,
    words: [
      { word: "Alpha", start: 1.2, end: 2 },
      { word: "beta", start: 2, end: 3 },
      { word: "gamma.", start: 3.2, end: 4 },
    ],
  },
  { sentence: "Quiet one.", startTime: 5, endTime: 6, words: [] },
  {
    sentence: "Delta.",
    startTime: 7,
    endTime: 8,
    words: [{ word: "Delta.", start: 7.5, end: 8 }],
  },
];

describe("findPosition", () => {
  it("finds the word that holds the time", () => {
    expect(findPosition(sentences, 2.5, NO_POSITION)).toEqual({ sentenceIndex: 0, wordIndex: 1 });
  });

  it("keeps the last word in a gap between two words", () => {
    expect(findPosition(sentences, 3.1, NO_POSITION)).toEqual({ sentenceIndex: 0, wordIndex: 1 });
  });

  it("keeps the last sentence and word in a gap between two sentences", () => {
    expect(findPosition(sentences, 4.5, NO_POSITION)).toEqual({ sentenceIndex: 0, wordIndex: 2 });
  });

  it("lights the first word inside the lead-in of 0.3 s", () => {
    expect(findPosition(sentences, 7.3, NO_POSITION)).toEqual({ sentenceIndex: 2, wordIndex: 0 });
  });

  it("lights no word when the first word is more than 0.3 s away", () => {
    expect(findPosition(sentences, 7.1, NO_POSITION)).toEqual({ sentenceIndex: 2, wordIndex: -1 });
  });

  it("resets the word when the sentence changes", () => {
    const prev = { sentenceIndex: 0, wordIndex: 2 };
    expect(findPosition(sentences, 7.05, prev)).toEqual({ sentenceIndex: 2, wordIndex: -1 });
  });

  it("gives the sentence only for a sentence with words: []", () => {
    expect(findPosition(sentences, 5.5, NO_POSITION)).toEqual({ sentenceIndex: 1, wordIndex: -1 });
  });

  it("gives no position before the first sentence", () => {
    expect(findPosition(sentences, 0.5, NO_POSITION)).toEqual(NO_POSITION);
    expect(findPosition(sentences, 0, { sentenceIndex: 2, wordIndex: 0 })).toEqual(NO_POSITION);
  });

  it("goes back when the time goes back", () => {
    const prev = { sentenceIndex: 2, wordIndex: 0 };
    expect(findPosition(sentences, 2.5, prev)).toEqual({ sentenceIndex: 0, wordIndex: 1 });
  });

  it("returns the previous object when nothing changed", () => {
    const prev = { sentenceIndex: 0, wordIndex: 1 };
    expect(findPosition(sentences, 2.5, prev)).toBe(prev);
  });

  it("returns no position for an empty list", () => {
    expect(findPosition([], 3, NO_POSITION)).toBe(NO_POSITION);
  });
});

describe("seek times", () => {
  it("seeks to the start of the sentence, minus the epsilon", () => {
    expect(seekTimeForSentence(sentences[0])).toBeCloseTo(1 - SEEK_EPSILON);
  });

  it("never seeks before 0", () => {
    expect(seekTimeForSentence({ ...sentences[0], startTime: 0.01 })).toBe(0);
  });

  it("seeks to the start of the audio word, minus the epsilon", () => {
    expect(seekTimeForWord(sentences[0], 1)).toBeCloseTo(2 - SEEK_EPSILON);
  });

  it("seeks to the sentence start when the sentence has no word timings", () => {
    expect(seekTimeForWord(sentences[1], -1)).toBeCloseTo(5 - SEEK_EPSILON);
    expect(seekTimeForWord(sentences[1], 0)).toBeCloseTo(5 - SEEK_EPSILON);
  });

  it("seeks to the sentence start when the word index is -1", () => {
    expect(seekTimeForWord(sentences[0], -1)).toBeCloseTo(1 - SEEK_EPSILON);
  });
});
