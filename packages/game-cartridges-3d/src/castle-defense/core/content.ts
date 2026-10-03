/**
 * Castle Defense content: the sentences of a run (one wave each), the attackers of a wave, and
 * the card of a step (the next word among distractors). A `StoryInput` keeps its sentence ids
 * and paragraphs for the evidence; a plain APK `SentenceInput` gets ids `s-1`, `s-2`, ... and
 * words from `term.split(' ')`.
 */
import type { SentenceInput, StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { KIND_OF, type Attacker, type Choice, type EnemyType, type WaveSentence } from './types.js';

export type CastleDefenseInput = StoryInput | SentenceInput;

export function isSentenceInput(input: CastleDefenseInput): input is SentenceInput {
  return Array.isArray(input);
}

/** The waves of the legacy game, in a cycle: two soldiers, three tanks, the boss. */
export const WAVE_CONFIGS: readonly { count: number; type: EnemyType }[] = [
  { count: 2, type: 'soldier' },
  { count: 3, type: 'tank' },
  { count: 1, type: 'boss' },
];

/** Hits an attacker takes to fall (the legacy hit points 100, 140, 220 over a tower damage of 60). */
export const HITS: Readonly<Record<EnemyType, number>> = { soldier: 2, tank: 3, boss: 4 };

/** The words a sentence can hold: 3 to 8. */
export const SENTENCE_WORDS = { min: 3, max: 8 } as const;

export interface SourceSentence {
  id: string;
  text: string;
  words: string[];
  translation?: string;
  paragraph?: number;
}

/** The sentences of the input, in the input's order. Sentences with fewer than 2 words are skipped. */
export function sentencesOf(input: CastleDefenseInput): SourceSentence[] {
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

/** The sentences a wave can take: 3 to 8 words. When the input has none of that length, every sentence qualifies. */
export function waveSentencesOf(input: CastleDefenseInput): SourceSentence[] {
  const all = sentencesOf(input);
  const fit = all.filter((s) => s.words.length >= SENTENCE_WORDS.min && s.words.length <= SENTENCE_WORDS.max);
  return fit.length > 0 ? fit : all;
}

/** The waves of a run: up to `maxWaves` sentences, each once, in a seeded order. */
export function shiftOf(input: CastleDefenseInput, rng: Rng, maxWaves: number): WaveSentence[] {
  return rng
    .shuffle(waveSentencesOf(input))
    .slice(0, Math.max(0, maxWaves))
    .map((s) => ({ ...s, wrongs: 0, started: false, cleared: false }));
}

/** A word as the card shows it: the letters without the punctuation around them. */
export function bareWord(word: string): string {
  const bare = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  return bare.length > 0 ? bare : word;
}

/** Two words are the same when their bare words match, ignoring case. */
export const wordKey = (word: string): string => bareWord(word).toLocaleLowerCase('en');

/** The attackers of a wave (a wave config cycles with the wave number). */
export function attackersOf(wave: number): Attacker[] {
  const config = WAVE_CONFIGS[(wave - 1) % WAVE_CONFIGS.length]!;
  return Array.from({ length: config.count }, (_, lane) => ({
    id: `w${wave}-a${lane}-${config.type}`,
    type: config.type,
    kind: KIND_OF[config.type],
    lane,
    hits: HITS[config.type],
    maxHits: HITS[config.type],
  }));
}

/**
 * The distractor words for the word `answer` of `sentence`: first the other words of the same
 * sentence (the student sorts out the order), then words of the other sentences of the run.
 * Each word differs from the answer and from the others; the order is seeded.
 */
export function distractorsOf(sentence: readonly string[], others: readonly string[], answer: string, rng: Rng, count: number): string[] {
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

/** The choices of a step: the right word and up to `count - 1` distractors, in a seeded order. */
export function choicesOf(shift: readonly WaveSentence[], waveIndex: number, wordIndex: number, count: number, rng: Rng): Choice[] {
  const sentence = shift[waveIndex]!;
  const answer = sentence.words[wordIndex]!;
  const others = shift.flatMap((s, i) => (i === waveIndex ? [] : s.words));
  const all = [bareWord(answer), ...distractorsOf(sentence.words, others, answer, rng, Math.max(0, count - 1))];
  return rng.shuffle(all.map((word, i) => ({ word, right: i === 0 }))).map((c, index) => ({ index, word: c.word, right: c.right, blocked: false }));
}
