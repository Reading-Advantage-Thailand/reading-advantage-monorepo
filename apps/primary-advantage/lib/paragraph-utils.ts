/**
 * Utility for normalizing article paragraphs to exactly 3 display blocks.
 *
 * This is a display-only concern — sentence text is never modified.
 */

/** Target number of paragraph blocks in the reading UI. */
export const TARGET_PARAGRAPH_COUNT = 3;

/**
 * Distribute an array of items into `count` buckets as evenly as possible.
 *
 * Remainder items are spread across the *earlier* buckets (front-loaded):
 *   bucketInto(7, 3) → [3, 2, 2]
 *   bucketInto(8, 3) → [3, 3, 2]
 *   bucketInto(10, 3) → [4, 3, 3]
 *
 * If `items.length < count`, the returned array has `items.length` buckets
 * (one item each) rather than fabricating empty buckets.
 *
 * @param items   Ordered array of anything (sentences, indices, …)
 * @param count   Desired number of buckets
 * @returns       Array of buckets, each bucket being a sub-array of items.
 *                Original order and identity are preserved verbatim.
 */
export function bucketItems<T>(items: T[], count: number): T[][] {
  if (items.length === 0) return [];

  const actualCount = Math.min(count, items.length);
  const base = Math.floor(items.length / actualCount);
  const remainder = items.length % actualCount;

  const buckets: T[][] = [];
  let offset = 0;

  for (let i = 0; i < actualCount; i++) {
    // Earlier buckets absorb one extra item until the remainder is exhausted.
    const size = base + (i < remainder ? 1 : 0);
    buckets.push(items.slice(offset, offset + size));
    offset += size;
  }

  return buckets;
}

/**
 * Split a raw passage string into sentences using a simple boundary heuristic.
 *
 * Splits on whitespace that follows a sentence-ending punctuation mark
 * (`.`, `!`, `?`). Keeps the punctuation attached to the preceding sentence.
 * Empty strings produced by the split are removed.
 *
 * This is intentionally minimal — it handles the fallback path where
 * `article.sentences` is absent.
 */
export function splitPassageIntoSentences(passage: string): string[] {
  return passage
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Bucket an ordered list of sentence strings into exactly
 * `TARGET_PARAGRAPH_COUNT` (3) paragraph strings by joining each bucket with
 * a single space.
 *
 * Edge cases:
 *   - 0 sentences → [] (empty array, render nothing)
 *   - 1 or 2 sentences → 1 or 2 paragraphs (don't fabricate empty blocks)
 *   - ≥3 sentences → exactly 3 paragraphs
 *
 * Sentence text is preserved verbatim; only the grouping changes.
 *
 * @param sentences   Ordered array of sentence strings
 * @returns           Array of paragraph strings (length ≤ TARGET_PARAGRAPH_COUNT)
 */
export function bucketSentencesIntoParagraphs(sentences: string[]): string[] {
  const buckets = bucketItems(sentences, TARGET_PARAGRAPH_COUNT);
  return buckets.map((bucket) => bucket.join(" "));
}
