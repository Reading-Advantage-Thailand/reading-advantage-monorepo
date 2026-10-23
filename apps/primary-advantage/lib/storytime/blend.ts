/**
 * The sound-by-sound blend of a decodable word (qr-page-spec section 5). The sounds are Daniel's
 * recordings in Workbooks `content/storytime/phonemes/daniel/` (decision S22); the bucket keeps
 * them under `storytime/phonemes/daniel/`.
 */

/** The recording of each Level 2 grapheme (CVC only); "th" has two sounds, so a word with it plays whole. */
const PHONEME_FILE: Readonly<Record<string, string>> = {
  s: "01-s", ss: "01-s", t: "02-t", p: "03-p", n: "04-n", m: "05-m", d: "06-d", g: "07-g",
  c: "08-c-k", k: "08-c-k", ck: "08-c-k", r: "09-r", h: "10-h", b: "11-b", f: "12-f", ff: "12-f",
  l: "13-l", ll: "13-l", j: "14-j", v: "15-v", w: "16-w", x: "17-x-ks", y: "18-y", z: "19-z", zz: "19-z",
  qu: "20-qu-kw", ch: "21-ch", sh: "22-sh", ng: "25-ng",
  a: "26-a-short", e: "27-e-short", i: "28-i-short", o: "29-o-short", u: "30-u-short",
};
/** The two-letter graphemes, matched before one letter. */
const DIGRAPH = /^(ss|ck|ff|ll|zz|qu|ch|sh|th|ng)/;
/** One short vowel and a consonant at the end: "nest" blends, "nose" and "a" play whole. */
const CVC = /^[^aeiou]*[aeiou][^aeiouy]+$/;

/** One sound of a blend. */
export interface BlendPart {
  /** The letters as the page shows them. */
  grapheme: string;
  /** The mp3 path relative to Workbooks `content/storytime/`. */
  file: string;
}

/**
 * Splits a decodable word into its sounds.
 * @param word The word as the page shows it, without punctuation.
 * @returns The sounds in order, or null when the word plays whole (not CVC, or a sound has no recording).
 */
export function blendParts(word: string): BlendPart[] | null {
  const lower = word.toLowerCase();
  if (!CVC.test(lower)) return null;
  const parts: BlendPart[] = [];
  for (let i = 0; i < lower.length; ) {
    const grapheme = DIGRAPH.exec(lower.slice(i))?.[1] ?? lower[i];
    const file = PHONEME_FILE[grapheme];
    if (!file) return null;
    parts.push({ grapheme: word.slice(i, i + grapheme.length), file: `phonemes/daniel/${file}.mp3` });
    i += grapheme.length;
  }
  return parts;
}
