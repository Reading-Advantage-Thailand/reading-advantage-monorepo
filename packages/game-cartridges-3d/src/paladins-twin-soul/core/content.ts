/**
 * Paladin's Twin Soul content: the target words of a run from a story, the monsters that serve
 * them, and the shades of each wave. A `StoryInput` keeps its vocabulary ids for the evidence;
 * a plain APK `VocabularyInput` gets ids `w-1`, `w-2`, ...
 */
import type { StoryInput, VocabularyInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { MONSTER_KINDS, type Monster, type Shade, type TargetWord } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK vocabulary array. */
export type TwinSoulInput = StoryInput | VocabularyInput;

export function isVocabularyInput(input: TwinSoulInput): input is VocabularyInput {
  return Array.isArray(input);
}

/** The words of the input with ids; words with an empty term or translation are skipped. */
export function wordsOf(input: TwinSoulInput): { id: string; term: string; translation: string }[] {
  const items = isVocabularyInput(input)
    ? input.map((w, i) => ({ id: `w-${i + 1}`, term: w.term.trim(), translation: w.translation.trim() }))
    : input.vocabulary.map((w) => ({ id: w.id, term: w.term.trim(), translation: w.translation.trim() }));
  return items.filter((w) => w.term.length > 0 && w.translation.length > 0);
}

/** The target words of a run: every word once, in a seeded order. */
export function targetsOf(input: TwinSoulInput, rng: Rng): TargetWord[] {
  return rng.shuffle(wordsOf(input)).map((w) => ({ ...w, attempts: 0, correctFirstTry: false, solved: false }));
}

/**
 * The monsters of a run for `targetCount` words: a skeleton for the first `wordsPerMonster`
 * words, a mimic for the next, and the fire dragon for every word after that. Each monster's HP
 * is the number of target words it serves.
 */
export function monstersOf(targetCount: number, wordsPerMonster: number): Monster[] {
  const monsters: Monster[] = [];
  let left = targetCount;
  for (let i = 0; i < MONSTER_KINDS.length && left > 0; i++) {
    const last = i === MONSTER_KINDS.length - 1;
    const hp = last ? left : Math.min(wordsPerMonster, left);
    monsters.push({ kind: MONSTER_KINDS[i]!, hp, maxHp: hp });
    left -= hp;
  }
  return monsters;
}

/**
 * The shades of one wave: the captor (the target's term) and up to `decoys` shades with the
 * terms of other words, in a seeded order. Two shades never show the same term.
 */
export function shadesOf(targets: readonly TargetWord[], targetId: string, decoys: number, wave: number, rng: Rng): Shade[] {
  const target = targets.find((t) => t.id === targetId)!;
  const seen = new Set([target.term.toLowerCase()]);
  const others = rng.shuffle(targets.filter((t) => t.id !== targetId)).filter((t) => {
    const key = t.term.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const words = rng.shuffle([target, ...others.slice(0, decoys)]);
  return words.map((w, i) => ({ id: `w${wave}s${i + 1}`, wordId: w.id, term: w.term, fallen: false }));
}
