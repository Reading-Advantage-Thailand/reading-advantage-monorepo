/**
 * Labyrinth content: the shift's sentences from a story and the words of an orb wave. A
 * `StoryInput` keeps its sentence ids and paragraphs for the evidence; a plain APK
 * `SentenceInput` gets ids `s-1`, `s-2`, ... and words from `term.split(' ')`. The shift is up
 * to 5 sentences of 3 to 7 words in a seeded order (fewer when the story has fewer such
 * sentences). An orb wave holds the right word and distractors from the same sentence first,
 * then from the other sentences of the shift.
 */
import type { SentenceInput, StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import type { ShiftSentence } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK sentence array. */
export type LabyrinthInput = StoryInput | SentenceInput;

export function isSentenceInput(input: LabyrinthInput): input is SentenceInput {
  return Array.isArray(input);
}

/** A sentence as the shift needs it, before its record. */
export type StorySentence = Pick<ShiftSentence, 'id' | 'text' | 'words' | 'translation' | 'paragraph'>;

/** The words a sentence of the shift can have. */
export const SENTENCE_WORDS = { min: 3, max: 7 } as const;

/** The sentences of the input, in the input's order. Sentences with fewer than 2 words are skipped. */
export function sentencesOf(input: LabyrinthInput): StorySentence[] {
  if (isSentenceInput(input)) {
    return input
      .map((item, i) => {
        const text = item.term.trim();
        const words = text.split(/\s+/).filter((w) => w.length > 0);
        const sentence: StorySentence = { id: `s-${i + 1}`, text, words };
        if (item.translation.trim().length > 0) sentence.translation = item.translation;
        return sentence;
      })
      .filter((s) => s.words.length >= 2);
  }
  return input.sentences.map((s) => {
    const sentence: StorySentence = { id: s.id, text: s.text, words: s.words.slice() };
    if (s.translation !== undefined) sentence.translation = s.translation;
    if (s.paragraph !== undefined) sentence.paragraph = s.paragraph;
    return sentence;
  });
}

/**
 * The sentences the shift can take: those of 3 to 7 words. When the input has none of that
 * length, every sentence qualifies (a short APK list still plays).
 */
export function shiftSentencesOf(input: LabyrinthInput): StorySentence[] {
  const all = sentencesOf(input);
  const fit = all.filter((s) => s.words.length >= SENTENCE_WORDS.min && s.words.length <= SENTENCE_WORDS.max);
  return fit.length > 0 ? fit : all;
}

/** The shift: up to `maxSentences` sentences, each once, in a seeded order. */
export function shiftOf(input: LabyrinthInput, rng: Rng, maxSentences: number): ShiftSentence[] {
  return rng
    .shuffle(shiftSentencesOf(input))
    .slice(0, Math.max(0, maxSentences))
    .map((s) => ({ ...s, wrong: 0, started: false, built: false }));
}

/**
 * The words of one orb wave: the right word (`words[index]`) and up to `count - 1` distractors,
 * in a seeded order. Distractors are other words of the sentence first, then words of the other
 * shift sentences; a distractor never equals the right word, so the word names the right orb.
 */
export function orbWordsOf(shift: readonly ShiftSentence[], sentence: number, index: number, count: number, rng: Rng): string[] {
  const words = shift[sentence]!.words;
  const answer = words[index]!;
  const own = [...new Set(words.filter((w) => w !== answer))];
  const others = [
    ...new Set(shift.flatMap((s, i) => (i === sentence ? [] : s.words)).filter((w) => w !== answer && !own.includes(w))),
  ];
  const distractors = [...rng.shuffle(own), ...rng.shuffle(others)].slice(0, Math.max(0, count - 1));
  return rng.shuffle([answer, ...distractors]);
}
