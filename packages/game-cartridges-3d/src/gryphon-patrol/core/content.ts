/**
 * Gryphon Patrol content: the sentences of a patrol from a story, and the word enemies of a
 * round. A `StoryInput` keeps its sentence ids and paragraphs for the evidence; a plain APK
 * `SentenceInput` gets ids `s-1`, `s-2`, ... and words from `term.split(/\s+/)`. A patrol takes
 * sentences of 3 to 8 words (all sentences when none fits). Decoy enemies carry other words of the
 * story.
 */
import type { SentenceInput, StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import type { Enemy, PatrolSentence } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK sentence array. */
export type PatrolInput = StoryInput | SentenceInput;

export function isSentenceInput(input: PatrolInput): input is SentenceInput {
  return Array.isArray(input);
}

/** A sentence as the patrol needs it before play. */
export interface SourceSentence {
  id: string;
  text: string;
  words: string[];
  translation?: string;
  paragraph?: number;
}

/** The words a patrol sentence can hold. */
export const SENTENCE_WORDS = { min: 3, max: 8 } as const;

/** The sky the enemies fly in, in meters (x across, y up). */
export const SKY = { width: 16, height: 9, minY: 1.4, maxY: 8 } as const;

/** The sentences of the input, in the input's order. Sentences with fewer than 2 words are skipped. */
export function sentencesOf(input: PatrolInput): SourceSentence[] {
  if (isSentenceInput(input)) {
    return input
      .map((item, i) => {
        const text = item.term.trim();
        const words = text.split(/\s+/).filter((w) => w.length > 0);
        const sentence: SourceSentence = { id: `s-${i + 1}`, text, words };
        if (item.translation.trim().length > 0) sentence.translation = item.translation.trim();
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

/** The sentences a patrol can take: those of 3 to 8 words, or all of them when none fits. */
export function patrolSentencesOf(input: PatrolInput): SourceSentence[] {
  const all = sentencesOf(input);
  const fit = all.filter((s) => s.words.length >= SENTENCE_WORDS.min && s.words.length <= SENTENCE_WORDS.max);
  return fit.length > 0 ? fit : all;
}

/** The patrol's sentences: up to `maxSentences`, each once, in a seeded order, with zeroed counters. */
export function patrolOf(input: PatrolInput, rng: Rng, maxSentences: number): PatrolSentence[] {
  return rng
    .shuffle(patrolSentencesOf(input))
    .slice(0, Math.max(0, maxSentences))
    .map((s) => ({ ...s, misses: 0, started: false, cleared: false }));
}

/** A word compared without case and punctuation ("Brave." and "brave" are one word). */
export function normWord(word: string): string {
  const key = word.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  return key.length > 0 ? key : word.toLowerCase();
}

/** Every distinct word of the story's sentences (first spelling wins), in the story's order. */
export function wordPoolOf(input: PatrolInput): string[] {
  const seen = new Set<string>();
  const pool: string[] = [];
  for (const sentence of sentencesOf(input)) {
    for (const word of sentence.words) {
      const key = normWord(word);
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push(word);
    }
  }
  return pool;
}

/**
 * The enemies of a round for `answer`: `count` enemies (fewer when the pool has too few distinct
 * words), the right one in a seeded slot. Each enemy loops around a home point inside its own slot
 * of the sky, so banners never overlap. The rng rolls the decoys, then the slot, then the motion
 * of each enemy in slot order.
 */
export function enemiesFor(answer: string, pool: readonly string[], count: number, rng: Rng): Enemy[] {
  const key = normWord(answer);
  const decoys = rng.sample(
    pool.filter((w) => normWord(w) !== key),
    Math.max(0, count - 1),
  );
  const rightSlot = rng.int(decoys.length + 1);
  const words = decoys.slice();
  words.splice(rightSlot, 0, answer);
  const slot = SKY.width / words.length;
  return words.map((text, i) => {
    const room = Math.min(1.1, Math.max(0.2, slot / 2 - 1.2));
    const cx = slot * (i + 0.5);
    const cy = 3.3 + rng.next() * 3.2;
    const ax = room * (0.5 + rng.next() * 0.5);
    const ay = 0.5 + rng.next() * 0.7;
    const w1 = 0.5 + rng.next() * 0.4;
    const w2 = 0.7 + rng.next() * 0.5;
    const p1 = rng.next() * Math.PI * 2;
    const p2 = rng.next() * Math.PI * 2;
    return {
      id: `e${i + 1}`,
      text,
      right: i === rightSlot,
      alive: true,
      x: cx + ax * Math.sin(p1),
      y: cy + ay * Math.sin(p2),
      cx,
      cy,
      ax,
      ay,
      w1,
      w2,
      p1,
      p2,
    };
  });
}

/** Where an enemy is `seconds` after its round opened. */
export function enemyAt(enemy: Pick<Enemy, 'cx' | 'cy' | 'ax' | 'ay' | 'w1' | 'w2' | 'p1' | 'p2'>, seconds: number): { x: number; y: number } {
  return {
    x: enemy.cx + enemy.ax * Math.sin(enemy.w1 * seconds + enemy.p1),
    y: enemy.cy + enemy.ay * Math.sin(enemy.w2 * seconds + enemy.p2),
  };
}
