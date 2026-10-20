import { describe, expect, it } from "vitest";
import {
  buildWordMaps,
  parseSentences,
  splitDisplayWords,
  tokenizeWords,
  type ReadAlongSentence,
} from "../align";
import audioDropped from "./fixtures/audio-dropped.json";
import contraction from "./fixtures/contraction.json";
import curlyQuote from "./fixtures/curly-quote.json";
import digit from "./fixtures/digit.json";
import hyphen from "./fixtures/hyphen.json";

const FIXTURES: Record<string, ReadAlongSentence[]> = {
  "audio-dropped": audioDropped,
  contraction,
  "curly-quote": curlyQuote,
  digit,
  hyphen,
};

/** Maps one fixture sentence with the display split of the screen. */
function mapSentence(s: ReadAlongSentence) {
  const display = splitDisplayWords(s.sentence).words.map((w) => w.text);
  const audio = s.words.map((w) => w.word);
  return { display, audio, maps: buildWordMaps(display, audio) };
}

const isNonDecreasing = (list: number[]) => list.every((v, i) => i === 0 || v >= list[i - 1]);

const NAMES = [
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
];

/** The audio words of NAMES with screen punctuation on the last word, minus a dropped range or plus extra words. */
function variant(kind: "drop" | "extra", place: "start" | "middle" | "end", gap: number) {
  const at = place === "start" ? 0 : place === "middle" ? 8 : NAMES.length - (kind === "drop" ? gap : 0);
  const audio: string[] = [];
  const audioToName: number[] = [];
  NAMES.forEach((name, i) => {
    if (kind === "extra" && i === at) {
      for (let k = 0; k < gap; k++) {
        audio.push(`zzz${k}`);
        audioToName.push(-1);
      }
    }
    if (kind === "drop" && i >= at && i < at + gap) return;
    audio.push(i === NAMES.length - 1 ? `${name}.` : name);
    audioToName.push(i);
  });
  if (kind === "extra" && at >= NAMES.length) {
    for (let k = 0; k < gap; k++) {
      audio.push(`zzz${k}`);
      audioToName.push(-1);
    }
  }
  return { audio, audioToName };
}

describe("splitDisplayWords", () => {
  it("keeps the sentence text whole across lead, text, and tail", () => {
    const sentence = "“Don’t go,” she said — twice-a-day...";
    const { words, tail } = splitDisplayWords(sentence);
    expect(words.map((w) => w.text)).toEqual(["Don’t", "go", "she", "said", "twice-a-day"]);
    expect(words.map((w) => w.lead + w.text).join("") + tail).toBe(sentence.replace(/(,”)/, "$1"));
  });

  it("keeps the apostrophe and the straight or curly quote cases as one word", () => {
    expect(splitDisplayWords("It's Tom's \"Don't\"").words.map((w) => w.text)).toEqual(["It's", "Tom's", "Don't"]);
    expect(splitDisplayWords("‘I’ve’ ‘can’t’").words.map((w) => w.text)).toEqual(["I’ve", "can’t"]);
  });

  it("numbers the words from zero", () => {
    expect(splitDisplayWords("a b").words.map((w) => w.index)).toEqual([0, 1]);
    expect(splitDisplayWords("").words).toEqual([]);
  });

  it("tokenizeWords gives the same words", () => {
    expect(tokenizeWords("“Don’t go,” she said — twice-a-day.")).toEqual(["Don’t", "go", "she", "said", "twice-a-day"]);
  });
});

describe("parseSentences", () => {
  it("accepts the real shapes and defaults a missing words list to empty", () => {
    const parsed = parseSentences([{ sentence: "Hi.", startTime: 0, endTime: 1 }, ...contraction]);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].words).toEqual([]);
  });

  it("drops only the bad entry", () => {
    const parsed = parseSentences([{ sentence: "Hi.", startTime: 0, endTime: 1 }, { nope: 1 }, ...contraction]);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].sentence).toBe("Hi.");
  });

  it("returns an empty list for another shape", () => {
    expect(parseSentences(null)).toEqual([]);
    expect(parseSentences("x")).toEqual([]);
    expect(parseSentences([{ nope: 1 }])).toEqual([]);
  });
});

describe("buildWordMaps on the real fixtures", () => {
  for (const [name, sentences] of Object.entries(FIXTURES)) {
    it(`maps every audio word of ${name} to the word that it says`, () => {
      for (const s of sentences) {
        const { display, audio, maps } = mapSentence(s);
        expect(maps.audioToDisplay).toHaveLength(audio.length);
        expect(maps.displayToAudio).toHaveLength(display.length);
        expect(isNonDecreasing(maps.audioToDisplay)).toBe(true);
        expect(isNonDecreasing(maps.displayToAudio)).toBe(true);
        if (name !== "audio-dropped") {
          expect(maps.audioToDisplay).toEqual(audio.map((_, i) => i));
          expect(maps.displayToAudio).toEqual(display.map((_, i) => i));
        }
      }
    });
  }

  it("handles curly quotes and contractions on both sides", () => {
    const { maps } = mapSentence(contraction[0]);
    expect(maps.audioToDisplay).toEqual([0, 1, 2, 3]);
    const curly = buildWordMaps(["I’ve", "can’t"], ["“I've", "can't”"]);
    expect(curly.audioToDisplay).toEqual([0, 1]);
  });

  it("puts the dropped audio word at the right place", () => {
    const { maps } = mapSentence(audioDropped[0]);
    // The ball is a friend. -> audio: is a friend.
    expect(maps.audioToDisplay).toEqual([2, 3, 4]);
    expect(maps.displayToAudio).toEqual([0, 0, 0, 1, 2]);
  });
});

describe("buildWordMaps derived fixtures (M-2)", () => {
  it("maps nothing for a sentence with words: []", () => {
    const base = mapSentence({ ...contraction[0], words: [] });
    expect(base.maps.audioToDisplay).toEqual([]);
    expect(base.maps.displayToAudio).toEqual([-1, -1, -1, -1]);
  });

  it("holds an extra audio word on the neighbour screen word", () => {
    const words = [...contraction[0].words];
    words.splice(2, 0, { word: "uh", start: 46, end: 46.2 });
    const { maps } = mapSentence({ ...contraction[0], words });
    expect(maps.displayToAudio).toEqual([0, 1, 3, 4]);
    expect(maps.audioToDisplay).toEqual([0, 1, 1, 2, 3]);
  });

  it("pairs a same-count mismatch by position", () => {
    const words = contraction[0].words.map((w, i) => (i === 3 ? { ...w, word: "walk." } : w));
    const { maps } = mapSentence({ ...contraction[0], words });
    expect(maps.audioToDisplay).toEqual([0, 1, 2, 3]);
    const fuzzy = buildWordMaps(["It", "says", "Don't", "run"], ["It", "sayz:", "\"Don't", "run."]);
    expect(fuzzy.audioToDisplay).toEqual([0, 1, 2, 3]);
  });
});

describe("buildWordMaps short-word substitution", () => {
  it("pairs the substituted words 1:1 when the skip counts are equal", () => {
    const maps = buildWordMaps(["I", "see", "it", "now"], ["I", "see", "at", "now"]);
    expect(maps.audioToDisplay).toEqual([0, 1, 2, 3]);
    expect(maps.displayToAudio).toEqual([0, 1, 2, 3]);
  });
});

describe("buildWordMaps tiers", () => {
  it("joins up to 3 audio tokens into one screen word", () => {
    const maps = buildWordMaps(["cannot", "go"], ["can", "not", "go."]);
    expect(maps.audioToDisplay).toEqual([0, 0, 1]);
    expect(maps.displayToAudio).toEqual([0, 2]);
  });

  it("joins up to 3 screen words into one audio token", () => {
    const maps = buildWordMaps(["sun", "shine", "day"], ["sunshine", "day"]);
    expect(maps.audioToDisplay).toEqual([0, 2]);
    expect(maps.displayToAudio).toEqual([0, 0, 1]);
  });

  it("accepts a prefix, a suffix, and one letter of difference", () => {
    expect(buildWordMaps(["walked", "home"], ["walk", "home"]).audioToDisplay).toEqual([0, 1]);
    expect(buildWordMaps(["unhappy", "home"], ["happy", "home"]).audioToDisplay).toEqual([0, 1]);
    expect(buildWordMaps(["colour", "home"], ["color", "home"]).audioToDisplay).toEqual([0, 1]);
  });

  it("maps the screen words after the last audio word to the last audio word", () => {
    const maps = buildWordMaps(["a", "b", "c", "d"], ["a", "b"]);
    expect(maps.displayToAudio).toEqual([0, 1, 1, 1]);
  });

  it("returns empty maps for empty input", () => {
    expect(buildWordMaps([], [])).toEqual({ audioToDisplay: [], displayToAudio: [] });
    expect(buildWordMaps([], ["a"]).audioToDisplay).toEqual([-1]);
  });

  it("skips an audio token that has no letters", () => {
    const maps = buildWordMaps(["one", "two"], ["one", "—", "two."]);
    expect(maps.audioToDisplay).toEqual([0, 0, 1]);
    expect(maps.displayToAudio).toEqual([0, 2]);
  });
});

describe("buildWordMaps resync (M-1: gaps of 1, 4, and 7 words)", () => {
  for (const place of ["start", "middle", "end"] as const) {
    for (const gap of [1, 4, 7]) {
      it(`resyncs after ${gap} dropped audio word(s) at the ${place}`, () => {
        const { audio, audioToName } = variant("drop", place, gap);
        const maps = buildWordMaps(NAMES, audio);
        audioToName.forEach((name, a) => expect(maps.audioToDisplay[a]).toBe(name));
        audioToName.forEach((name, a) => expect(maps.displayToAudio[name]).toBe(a));
        expect(isNonDecreasing(maps.audioToDisplay)).toBe(true);
        expect(isNonDecreasing(maps.displayToAudio)).toBe(true);
      });

      it(`resyncs after ${gap} extra audio word(s) at the ${place}`, () => {
        const { audio, audioToName } = variant("extra", place, gap);
        const maps = buildWordMaps(NAMES, audio);
        audioToName.forEach((name, a) => {
          if (name >= 0) {
            expect(maps.audioToDisplay[a]).toBe(name);
            expect(maps.displayToAudio[name]).toBe(a);
          }
        });
        expect(isNonDecreasing(maps.audioToDisplay)).toBe(true);
        expect(isNonDecreasing(maps.displayToAudio)).toBe(true);
      });
    }
  }
});
