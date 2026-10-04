/**
 * Sorcerer's Ziggurat content: the rituals of a climb from a story. A `PracticeInput` keeps its
 * sentence ids and paragraphs for the evidence; a plain APK `SentenceInput` gets ids `s-1`,
 * `s-2`, ... and words from `term.split(/\s+/)`. A ritual takes a sentence of 3 to 8 words; the
 * climb is up to 5 rituals in a seeded order. Each tier offers the right word and up to two
 * decoys: words that are not the right word, from this sentence or from the other sentences.
 */
import type { SentenceInput, PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { LANES, type Cube, type Lane, type Ritual } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK sentence array. */
export type ZigguratInput = PracticeInput | SentenceInput;

export function isSentenceInput(input: ZigguratInput): input is SentenceInput {
  return Array.isArray(input);
}

/** A sentence as the climb needs it. */
export interface ClimbSentence {
  id: string;
  text: string;
  words: string[];
  translation?: string;
  paragraph?: number;
}

/** The words a ritual can hold: 3 to 8 tiers. */
export const RITUAL_WORDS = { min: 3, max: 8 } as const;

/** The most decoy cubes on one tier. */
export const DECOYS = 2;

/** The sentences of the input, in the input's order. Sentences with fewer than 2 words are skipped. */
export function sentencesOf(input: ZigguratInput): ClimbSentence[] {
  if (isSentenceInput(input)) {
    return input
      .map((item, i) => {
        const text = item.term.trim();
        const words = text.split(/\s+/).filter((w) => w.length > 0);
        const sentence: ClimbSentence = { id: `s-${i + 1}`, text, words };
        if (item.translation.trim().length > 0) sentence.translation = item.translation;
        return sentence;
      })
      .filter((s) => s.words.length >= 2);
  }
  return input.sentences.map((s) => {
    const sentence: ClimbSentence = { id: s.id, text: s.text, words: s.words.slice() };
    if (s.translation !== undefined) sentence.translation = s.translation;
    if (s.paragraph !== undefined) sentence.paragraph = s.paragraph;
    return sentence;
  });
}

/** The sentences a ritual can take: those of 3 to 8 words, or all of them when none fits. */
export function ritualSentencesOf(input: ZigguratInput): ClimbSentence[] {
  const all = sentencesOf(input);
  const fit = all.filter((s) => s.words.length >= RITUAL_WORDS.min && s.words.length <= RITUAL_WORDS.max);
  return fit.length > 0 ? fit : all;
}

const EDGE = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

/** A word compared without case and edge punctuation ("Pip," equals "pip"). */
export function normalWord(word: string): string {
  return word.toLowerCase().replace(EDGE, '');
}

/** A word as a cube shows it: edge punctuation removed, so the cube does not give the answer away. */
export function cubeWord(word: string): string {
  const bare = word.replace(EDGE, '');
  return bare.length > 0 ? bare : word;
}

/** The rituals of a climb: up to `maxRituals` sentences, each once, in a seeded order. */
export function climbOf(input: ZigguratInput, rng: Rng, maxRituals: number): Ritual[] {
  return rng
    .shuffle(ritualSentencesOf(input))
    .slice(0, Math.max(0, maxRituals))
    .map((s, i) => ({ ...s, ritualId: `ritual-${i + 1}`, refusals: 0, started: false, cleared: false }));
}

/**
 * The cubes of one tier: the right word and up to `DECOYS` decoys, each a different word (by
 * `normalWord`), on seeded lanes. Fewer decoys when the input has fewer different words.
 */
export function cubesOf(input: ZigguratInput, ritual: Ritual, ritualIndex: number, tier: number, rng: Rng): Cube[] {
  const expected = ritual.words[tier]!;
  const seen = new Set<string>([normalWord(expected)]);
  const pool: string[] = [];
  const add = (word: string): void => {
    const key = normalWord(word);
    if (key.length === 0 || seen.has(key)) return;
    seen.add(key);
    pool.push(cubeWord(word));
  };
  ritual.words.forEach((w) => add(w));
  for (const s of sentencesOf(input)) if (s.id !== ritual.id) s.words.forEach((w) => add(w));
  const decoys = rng.shuffle(pool).slice(0, DECOYS);
  const lanes = rng.shuffle(LANES.slice()).slice(0, 1 + decoys.length);
  const words = [{ word: cubeWord(expected), correct: true }, ...decoys.map((word) => ({ word, correct: false }))];
  return words
    .map((w, i): Cube => {
      const lane: Lane = lanes[i]!;
      return { id: `c-${ritualIndex + 1}-${tier + 1}-${lane}`, word: w.word, lane, correct: w.correct, spent: false };
    })
    .sort((a, b) => LANES.indexOf(a.lane) - LANES.indexOf(b.lane));
}
