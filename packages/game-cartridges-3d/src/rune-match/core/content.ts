/**
 * Rune Match content: the target words of a run from a story, the monsters that guard them, and
 * the palette of meanings the board draws from. A `StoryInput` keeps its vocabulary ids for the
 * evidence; a plain APK `VocabularyInput` gets ids `w-1`, `w-2`, ...
 */
import type { StoryInput, VocabularyInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { MONSTER_KINDS, type Monster, type TargetWord } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK vocabulary array. */
export type RuneMatchInput = StoryInput | VocabularyInput;

export function isVocabularyInput(input: RuneMatchInput): input is VocabularyInput {
  return Array.isArray(input);
}

/** The words of the input with ids; words with an empty term or translation are skipped. */
export function wordsOf(input: RuneMatchInput): { id: string; term: string; translation: string }[] {
  const items = isVocabularyInput(input)
    ? input.map((w, i) => ({ id: `w-${i + 1}`, term: w.term.trim(), translation: w.translation.trim() }))
    : input.vocabulary.map((w) => ({ id: w.id, term: w.term.trim(), translation: w.translation.trim() }));
  return items.filter((w) => w.term.length > 0 && w.translation.length > 0);
}

/** The target words of a run: every word once, in a seeded order. */
export function targetsOf(input: RuneMatchInput, rng: Rng): TargetWord[] {
  return rng
    .shuffle(wordsOf(input))
    .map((w) => ({ ...w, reverse: false, attempts: 0, correctFirstTry: false, solved: false }));
}

/**
 * The monsters of a run for `targetCount` words: a skeleton for the first `wordsPerMonster`
 * words, a mimic for the next, and the fire dragon for every word after that. Each monster's HP
 * is the number of target words it guards.
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

/** The first palette: the target, then `decoys` other words of the run in a seeded order. */
export function paletteOf(targets: readonly TargetWord[], targetId: string, decoys: number, rng: Rng): string[] {
  const others = targets.map((t) => t.id).filter((id) => id !== targetId);
  return [targetId, ...rng.sample(others, decoys)];
}
