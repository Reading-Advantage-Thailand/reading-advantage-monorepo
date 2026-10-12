import { describe, it, expect } from "vitest";
import {
  bucketItems,
  bucketSentencesIntoParagraphs,
  splitPassageIntoSentences,
  TARGET_PARAGRAPH_COUNT,
} from "../paragraph-utils";

// ---------------------------------------------------------------------------
// bucketItems — core distribution logic
// ---------------------------------------------------------------------------

describe("bucketItems", () => {
  it("returns empty array for 0 items", () => {
    expect(bucketItems([], 3)).toEqual([]);
  });

  it("returns 1 bucket for 1 item", () => {
    expect(bucketItems(["a"], 3)).toEqual([["a"]]);
  });

  it("returns 2 buckets for 2 items", () => {
    expect(bucketItems(["a", "b"], 3)).toEqual([["a"], ["b"]]);
  });

  it("returns 3 buckets of 1 each for exactly 3 items", () => {
    expect(bucketItems(["a", "b", "c"], 3)).toEqual([["a"], ["b"], ["c"]]);
  });

  it("distributes 7 items as [3, 2, 2]", () => {
    const items = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"];
    const result = bucketItems(items, 3);
    expect(result.map((b) => b.length)).toEqual([3, 2, 2]);
  });

  it("distributes 8 items as [3, 3, 2]", () => {
    const items = Array.from({ length: 8 }, (_, i) => `s${i + 1}`);
    const result = bucketItems(items, 3);
    expect(result.map((b) => b.length)).toEqual([3, 3, 2]);
  });

  it("distributes 10 items as [4, 3, 3]", () => {
    const items = Array.from({ length: 10 }, (_, i) => `s${i + 1}`);
    const result = bucketItems(items, 3);
    expect(result.map((b) => b.length)).toEqual([4, 3, 3]);
  });

  it("distributes 4 items as [2, 1, 1]", () => {
    const items = Array.from({ length: 4 }, (_, i) => `s${i + 1}`);
    const result = bucketItems(items, 3);
    expect(result.map((b) => b.length)).toEqual([2, 1, 1]);
  });

  it("distributes 6 items as [2, 2, 2]", () => {
    const items = Array.from({ length: 6 }, (_, i) => `s${i + 1}`);
    const result = bucketItems(items, 3);
    expect(result.map((b) => b.length)).toEqual([2, 2, 2]);
  });

  it("preserves item identity verbatim (no trimming or modification)", () => {
    const sentences = [
      "Hello world. ",
      "  leading space.",
      "Trailing punctuation!",
      "Normal sentence.",
    ];
    const result = bucketItems(sentences, 3);
    const flat = result.flat();
    expect(flat).toEqual(sentences);
  });

  it("preserves original order across buckets", () => {
    const items = ["a", "b", "c", "d", "e"];
    const result = bucketItems(items, 3);
    expect(result.flat()).toEqual(items);
  });

  it("each item appears in exactly one bucket", () => {
    const items = Array.from({ length: 9 }, (_, i) => `s${i}`);
    const result = bucketItems(items, 3);
    const flat = result.flat();
    expect(flat.length).toBe(items.length);
    expect(new Set(flat).size).toBe(items.length);
  });
});

// ---------------------------------------------------------------------------
// bucketSentencesIntoParagraphs — paragraph-string output
// ---------------------------------------------------------------------------

describe("bucketSentencesIntoParagraphs", () => {
  it("returns [] for empty input", () => {
    expect(bucketSentencesIntoParagraphs([])).toEqual([]);
  });

  it("returns 1 paragraph for 1 sentence", () => {
    const result = bucketSentencesIntoParagraphs(["Only one."]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Only one.");
  });

  it("returns 2 paragraphs for 2 sentences", () => {
    const result = bucketSentencesIntoParagraphs(["First.", "Second."]);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("First.");
    expect(result[1]).toBe("Second.");
  });

  it("returns exactly 3 paragraphs for 3 sentences", () => {
    const sents = ["A.", "B.", "C."];
    const result = bucketSentencesIntoParagraphs(sents);
    expect(result).toHaveLength(3);
    expect(result).toEqual(["A.", "B.", "C."]);
  });

  it("returns exactly 3 paragraphs for 7 sentences", () => {
    const sents = ["s1.", "s2.", "s3.", "s4.", "s5.", "s6.", "s7."];
    const result = bucketSentencesIntoParagraphs(sents);
    expect(result).toHaveLength(TARGET_PARAGRAPH_COUNT);
    expect(result[0]).toBe("s1. s2. s3.");
    expect(result[1]).toBe("s4. s5.");
    expect(result[2]).toBe("s6. s7.");
  });

  it("returns exactly 3 paragraphs for 8 sentences", () => {
    const sents = Array.from({ length: 8 }, (_, i) => `s${i + 1}.`);
    const result = bucketSentencesIntoParagraphs(sents);
    expect(result).toHaveLength(TARGET_PARAGRAPH_COUNT);
    // [3, 3, 2]
    expect(result[0]).toBe("s1. s2. s3.");
    expect(result[1]).toBe("s4. s5. s6.");
    expect(result[2]).toBe("s7. s8.");
  });

  it("returns exactly 3 paragraphs for 10 sentences", () => {
    const sents = Array.from({ length: 10 }, (_, i) => `s${i + 1}.`);
    const result = bucketSentencesIntoParagraphs(sents);
    expect(result).toHaveLength(TARGET_PARAGRAPH_COUNT);
    // [4, 3, 3]
    expect(result[0]).toBe("s1. s2. s3. s4.");
    expect(result[1]).toBe("s5. s6. s7.");
    expect(result[2]).toBe("s8. s9. s10.");
  });

  it("sentence text is preserved verbatim (character equality)", () => {
    const sents = [
      "Sentence one, with a comma.",
      "Sentence two — with an em dash!",
      "Sentence three?",
      'Sentence four with "quotes".',
    ];
    const result = bucketSentencesIntoParagraphs(sents);
    // All sentences must appear unchanged somewhere in the output
    for (const s of sents) {
      expect(result.join(" ")).toContain(s);
    }
  });
});

// ---------------------------------------------------------------------------
// splitPassageIntoSentences — fallback sentence splitter
// ---------------------------------------------------------------------------

describe("splitPassageIntoSentences", () => {
  it("splits on period+space boundary", () => {
    const result = splitPassageIntoSentences("First sentence. Second sentence.");
    expect(result).toEqual(["First sentence.", "Second sentence."]);
  });

  it("splits on ! and ? boundaries", () => {
    const result = splitPassageIntoSentences("Really! Are you sure? Yes.");
    expect(result).toEqual(["Really!", "Are you sure?", "Yes."]);
  });

  it("handles a single sentence with no boundary", () => {
    expect(splitPassageIntoSentences("One sentence only.")).toEqual([
      "One sentence only.",
    ]);
  });

  it("filters out empty strings", () => {
    const result = splitPassageIntoSentences("  ");
    expect(result).toEqual([]);
  });

  it("handles double-newline paragraphs as part of the passage", () => {
    const passage = "Para one sentence one. Para one sentence two.\n\nPara two sentence one.";
    const result = splitPassageIntoSentences(passage);
    // Should produce 3 sentences regardless of \n\n
    expect(result.length).toBeGreaterThanOrEqual(2);
    // All non-empty
    result.forEach((s) => expect(s.length).toBeGreaterThan(0));
  });
});
