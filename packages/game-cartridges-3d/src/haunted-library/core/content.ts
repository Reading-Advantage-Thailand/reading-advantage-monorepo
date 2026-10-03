/**
 * Haunted Library content: the rooms of a visit from a story. A `StoryInput` keeps its sentence
 * ids and paragraphs for the evidence; a plain APK `SentenceInput` gets ids `s-1`, `s-2`, ...
 * and words from `term.split(' ')`. A room takes a sentence of 3 to 7 words; the visit is up to
 * 5 rooms in a seeded order (fewer when the story has fewer such sentences).
 */
import type { SentenceInput, StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import type { LibraryRoom } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK sentence array. */
export type LibraryInput = StoryInput | SentenceInput;

export function isSentenceInput(input: LibraryInput): input is SentenceInput {
  return Array.isArray(input);
}

/** A sentence as the visit needs it. */
export interface LibrarySentence {
  id: string;
  text: string;
  words: string[];
  translation?: string;
  paragraph?: number;
}

/** The words a room can hold: 3 to 7 doors. */
export const ROOM_WORDS = { min: 3, max: 7 } as const;

/** The sentences of the input, in the input's order. Sentences with fewer than 2 words are skipped. */
export function sentencesOf(input: LibraryInput): LibrarySentence[] {
  if (isSentenceInput(input)) {
    return input
      .map((item, i) => {
        const text = item.term.trim();
        const words = text.split(/\s+/).filter((w) => w.length > 0);
        const sentence: LibrarySentence = { id: `s-${i + 1}`, text, words };
        if (item.translation.trim().length > 0) sentence.translation = item.translation;
        return sentence;
      })
      .filter((s) => s.words.length >= 2);
  }
  return input.sentences.map((s) => {
    const sentence: LibrarySentence = { id: s.id, text: s.text, words: s.words.slice() };
    if (s.translation !== undefined) sentence.translation = s.translation;
    if (s.paragraph !== undefined) sentence.paragraph = s.paragraph;
    return sentence;
  });
}

/** The sentences a room can take: those of 3 to 7 words; when there are none, every sentence. */
export function roomSentencesOf(input: LibraryInput): LibrarySentence[] {
  const all = sentencesOf(input);
  const fit = all.filter((s) => s.words.length >= ROOM_WORDS.min && s.words.length <= ROOM_WORDS.max);
  return fit.length > 0 ? fit : all;
}

/** The rooms of a visit: up to `maxRooms` sentences, each once, in a seeded order. */
export function visitOf(input: LibraryInput, rng: Rng, maxRooms: number): LibraryRoom[] {
  return rng
    .shuffle(roomSentencesOf(input))
    .slice(0, Math.max(0, maxRooms))
    .map((s, i) => ({ ...s, roomId: `room-${i + 1}`, refusals: 0, started: false, cleared: false }));
}
