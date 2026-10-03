/**
 * Astral Mage content: the casting's rituals from a story. A `StoryInput` keeps its sentence
 * ids and paragraphs for the evidence; a plain APK `SentenceInput` gets ids `s-1`, `s-2`, ...
 * and words from `term.split(/\s+/)`. A ritual takes a sentence of 3 to 8 words; the casting is
 * up to 5 rituals in a seeded order (fewer when the story has fewer such sentences). Each
 * ritual adds one echo crystal: a word of another sentence that is not in this one.
 */
import type { SentenceInput, StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import type { RitualSentence } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK sentence array. */
export type AstralMageInput = StoryInput | SentenceInput;

export function isSentenceInput(input: AstralMageInput): input is SentenceInput {
  return Array.isArray(input);
}

/** A sentence as the casting needs it: id, text, words, and the reading look-back paragraph. */
export interface CastingSentence {
  id: string;
  text: string;
  words: string[];
  translation?: string;
  paragraph?: number;
}

/** The words a ritual can hold: 3 to 8 crystals of words. */
export const RITUAL_WORDS = { min: 3, max: 8 } as const;

/** The sentences of the input, in the input's order. Sentences with fewer than 2 words are skipped. */
export function sentencesOf(input: AstralMageInput): CastingSentence[] {
  if (isSentenceInput(input)) {
    return input
      .map((item, i) => {
        const text = item.term.trim();
        const words = text.split(/\s+/).filter((w) => w.length > 0);
        const sentence: CastingSentence = { id: `s-${i + 1}`, text, words };
        if (item.translation.trim().length > 0) sentence.translation = item.translation;
        return sentence;
      })
      .filter((s) => s.words.length >= 2);
  }
  return input.sentences.map((s) => {
    const sentence: CastingSentence = { id: s.id, text: s.text, words: s.words.slice() };
    if (s.translation !== undefined) sentence.translation = s.translation;
    if (s.paragraph !== undefined) sentence.paragraph = s.paragraph;
    return sentence;
  });
}

/** The sentences a ritual can take: those of 3 to 8 words, or all of them when none fits. */
export function ritualSentencesOf(input: AstralMageInput): CastingSentence[] {
  const all = sentencesOf(input);
  const fit = all.filter((s) => s.words.length >= RITUAL_WORDS.min && s.words.length <= RITUAL_WORDS.max);
  return fit.length > 0 ? fit : all;
}

/** A word compared without case and edge punctuation ("Pip," equals "pip"). */
export function normalWord(word: string): string {
  return word.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

/** The rituals of a casting: up to `maxRituals` sentences, each once, in a seeded order. */
export function castingOf(input: AstralMageInput, rng: Rng, maxRituals: number): RitualSentence[] {
  return rng
    .shuffle(ritualSentencesOf(input))
    .slice(0, Math.max(0, maxRituals))
    .map((s, i) => ({ ...s, ritualId: `ritual-${i + 1}`, refusals: 0, started: false, cleared: false }));
}

/**
 * The echo word of a ritual: a seeded word of the other sentences of the input that is not in
 * the ritual's sentence. Null when the input has no such word (a one-sentence APK list).
 */
export function echoWordOf(input: AstralMageInput, sentenceId: string, words: readonly string[], rng: Rng): string | null {
  const own = new Set(words.map(normalWord));
  const pool = new Map<string, string>();
  for (const s of sentencesOf(input)) {
    if (s.id === sentenceId) continue;
    for (const w of s.words) {
      const key = normalWord(w);
      if (key.length > 0 && !own.has(key) && !pool.has(key)) pool.set(key, w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''));
    }
  }
  const list = [...pool.values()];
  return list.length > 0 ? rng.pick(list) : null;
}
