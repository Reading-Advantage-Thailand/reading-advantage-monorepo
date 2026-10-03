/**
 * Rune Forge Chamber content: the blades of a forge from a story's sentences, and the runes of a
 * wave. A `StoryInput` keeps its sentence ids and paragraphs for the evidence; a plain APK
 * `SentenceInput` gets ids `s-1`, `s-2`, ... and words from `term.split(/\s+/)`. A blade takes a
 * sentence of 3 to 8 words; the forge is up to 5 blades in a seeded order. As in the legacy game,
 * the runes of a wave are the next word and words of the same sentence (up to four runes).
 */
import type { SentenceInput, StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import type { ForgeSentence } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK sentence array. */
export type RuneForgeChamberInput = StoryInput | SentenceInput;

export function isSentenceInput(input: RuneForgeChamberInput): input is SentenceInput {
  return Array.isArray(input);
}

/** A sentence as the forge needs it: id, text, words, and the reading look-back paragraph. */
export interface SourceSentence {
  id: string;
  text: string;
  words: string[];
  translation?: string;
  paragraph?: number;
}

/** The words a blade can hold, and the runes in one wave. */
export const BLADE_WORDS = { min: 3, max: 8 } as const;
export const WAVE_RUNES = 4;

/** A word compared without case and edge punctuation ("Pip," equals "pip"). */
export function normalWord(word: string): string {
  return word.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

/** The sentences of the input, in the input's order. Sentences with fewer than 2 words are skipped. */
export function sentencesOf(input: RuneForgeChamberInput): SourceSentence[] {
  if (isSentenceInput(input)) {
    return input
      .map((item, i) => {
        const text = item.term.trim();
        const words = text.split(/\s+/).filter((w) => w.length > 0);
        const sentence: SourceSentence = { id: `s-${i + 1}`, text, words };
        if (item.translation.trim().length > 0) sentence.translation = item.translation;
        return sentence;
      })
      .filter((s) => s.words.length >= 2);
  }
  return input.sentences.map((s) => {
    const sentence: SourceSentence = { id: s.id, text: s.text, words: s.words.slice() };
    if (s.translation !== undefined) sentence.translation = s.translation;
    if (s.paragraph !== undefined) sentence.paragraph = s.paragraph;
    return sentence;
  });
}

/** The sentences a blade can take: those of 3 to 8 words, or all of them when none fits. */
export function bladeSentencesOf(input: RuneForgeChamberInput): SourceSentence[] {
  const all = sentencesOf(input);
  const fit = all.filter((s) => s.words.length >= BLADE_WORDS.min && s.words.length <= BLADE_WORDS.max);
  return fit.length > 0 ? fit : all;
}

/** The blades of a forge: up to `maxBlades` sentences, each once, in a seeded order, counters at zero. */
export function forgeOf(input: RuneForgeChamberInput, rng: Rng, maxBlades: number): ForgeSentence[] {
  return rng
    .shuffle(bladeSentencesOf(input))
    .slice(0, Math.max(0, maxBlades))
    .map((s, i) => ({ ...s, bladeId: `blade-${i + 1}`, refusals: 0, started: false, forged: false }));
}

/**
 * The words of a wave, in a seeded order: the answer `words[next]` and up to three other words
 * of the sentence that differ from it (and from each other) once case and punctuation are ignored.
 * The rng rolls the decoys first, then the order.
 */
export function waveWordsOf(words: readonly string[], next: number, rng: Rng): string[] {
  const answer = words[next]!;
  const seen = new Set<string>([normalWord(answer)]);
  const pool: string[] = [];
  words.forEach((w, i) => {
    const key = normalWord(w);
    if (i === next || key.length === 0 || seen.has(key)) return;
    seen.add(key);
    pool.push(w);
  });
  return rng.shuffle([answer, ...rng.sample(pool, WAVE_RUNES - 1)]);
}
