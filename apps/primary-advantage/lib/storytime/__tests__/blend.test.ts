import { describe, expect, it } from "vitest";
import { blendParts } from "../blend";

describe("blendParts (qr-page-spec section 5)", () => {
  it("splits a CVC word into the recordings of its sounds", () => {
    expect(blendParts("nest")).toEqual([
      { grapheme: "n", file: "phonemes/daniel/04-n.mp3" },
      { grapheme: "e", file: "phonemes/daniel/27-e-short.mp3" },
      { grapheme: "s", file: "phonemes/daniel/01-s.mp3" },
      { grapheme: "t", file: "phonemes/daniel/02-t.mp3" },
    ]);
  });

  it("keeps the two-letter graphemes and the letter case of the page", () => {
    expect(blendParts("Neck")?.map((part) => part.grapheme)).toEqual(["N", "e", "ck"]);
    expect(blendParts("shop")?.map((part) => part.file)).toEqual(["phonemes/daniel/22-sh.mp3", "phonemes/daniel/29-o-short.mp3", "phonemes/daniel/03-p.mp3"]);
  });

  it("plays whole a word that is not CVC or has a sound with two recordings", () => {
    expect(["nose", "nurse", "a", "and1", "the", "thin", "rain"].map(blendParts)).toEqual([null, null, null, null, null, null, null]);
  });
});
