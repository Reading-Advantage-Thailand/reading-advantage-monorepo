/**
 * Shadow Gate Dungeon content: the delve's rooms from a story. A `StoryInput` keeps its sentence
 * ids and paragraphs for the evidence; a plain APK `SentenceInput` gets ids `s-1`, `s-2`, ...
 * and words from `term.split(' ')`. A room takes a sentence of 3 to 7 words; the delve is up to
 * 5 rooms in a seeded order (fewer when the story has fewer such sentences). The crystals of a
 * room hold the words of the sentence and words of other sentences of the story.
 */
import type { SentenceInput, StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import type { RoomSentence } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK sentence array. */
export type ShadowGateInput = StoryInput | SentenceInput;

export function isSentenceInput(input: ShadowGateInput): input is SentenceInput {
  return Array.isArray(input);
}

/** A sentence as the delve needs it: id, text, words, and the reading look-back paragraph. */
export interface DelveSentence {
  id: string;
  text: string;
  words: string[];
  translation?: string;
  paragraph?: number;
}

/** The words a room can hold: 3 to 7. */
export const ROOM_WORDS = { min: 3, max: 7 } as const;

/** The sentences of the input, in the input's order. Sentences with fewer than 2 words are skipped. */
export function sentencesOf(input: ShadowGateInput): DelveSentence[] {
  if (isSentenceInput(input)) {
    return input
      .map((item, i) => {
        const text = item.term.trim();
        const words = text.split(/\s+/).filter((w) => w.length > 0);
        const sentence: DelveSentence = { id: `s-${i + 1}`, text, words };
        if (item.translation.trim().length > 0) sentence.translation = item.translation;
        return sentence;
      })
      .filter((s) => s.words.length >= 2);
  }
  return input.sentences.map((s) => {
    const sentence: DelveSentence = { id: s.id, text: s.text, words: s.words.slice() };
    if (s.translation !== undefined) sentence.translation = s.translation;
    if (s.paragraph !== undefined) sentence.paragraph = s.paragraph;
    return sentence;
  });
}

/**
 * The sentences a room can take: those of 3 to 7 words. When the input has none of that
 * length, every sentence qualifies (a short APK list still plays).
 */
export function roomSentencesOf(input: ShadowGateInput): DelveSentence[] {
  const all = sentencesOf(input);
  const fit = all.filter((s) => s.words.length >= ROOM_WORDS.min && s.words.length <= ROOM_WORDS.max);
  return fit.length > 0 ? fit : all;
}

/** The rooms of a delve: up to `maxRooms` sentences, each once, in a seeded order. */
export function shiftOf(input: ShadowGateInput, rng: Rng, maxRooms: number): RoomSentence[] {
  return rng
    .shuffle(roomSentencesOf(input))
    .slice(0, Math.max(0, maxRooms))
    .map((s, i) => ({ ...s, roomId: `room-${i + 1}`, refusals: 0, started: false, cleared: false }));
}

/** A word as a crystal shows it: the letters without the punctuation around them (no hint of position). */
export function bareWord(word: string): string {
  const bare = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  return bare.length > 0 ? bare : word;
}

/** Two crystals hold the same word when their bare words match, ignoring case. */
export const wordKey = (word: string): string => bareWord(word).toLocaleLowerCase('en');

/**
 * The distractor words for the word `answer` of `sentence`: first the other words of the same
 * sentence (the student sorts out the order), then words of the other sentences of the story.
 * Each word differs from the answer and from the others; the order is seeded.
 */
export function distractorsOf(
  sentence: readonly string[],
  others: readonly string[],
  answer: string,
  rng: Rng,
  count: number,
): string[] {
  const taken = new Set<string>([wordKey(answer)]);
  const out: string[] = [];
  for (const pool of [sentence, others]) {
    for (const w of rng.shuffle(pool.slice())) {
      if (out.length >= count) return out;
      const key = wordKey(w);
      if (taken.has(key)) continue;
      taken.add(key);
      out.push(bareWord(w));
    }
  }
  return out;
}
