/**
 * RPG Battle content: the words of a run from a story (each with an action and a power), the
 * monsters that guard them, and the question options. A `PracticeInput` keeps its vocabulary ids for
 * the evidence; a plain APK `VocabularyInput` gets ids `w-1`, `w-2`, ...
 */
import type { PracticeInput, VocabularyInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { ACTIONS, MONSTER_KINDS, type Monster, type QuestionOption, type TargetWord } from './types.js';

export type RpgBattleInput = PracticeInput | VocabularyInput;

export function isVocabularyInput(input: RpgBattleInput): input is VocabularyInput {
  return Array.isArray(input);
}

/** The words of the input with ids; words with an empty term or translation are skipped. */
export function wordsOf(input: RpgBattleInput): { id: string; term: string; translation: string }[] {
  const items = isVocabularyInput(input)
    ? input.map((w, i) => ({ id: `w-${i + 1}`, term: w.term.trim(), translation: w.translation.trim() }))
    : input.vocabulary.map((w) => ({ id: w.id, term: w.term.trim(), translation: w.translation.trim() }));
  return items.filter((w) => w.term.length > 0 && w.translation.length > 0);
}

/**
 * The target words of a run: every word once, in a seeded order. Each word gets an action (the
 * three actions in turn, from a seeded start, so a hand shows variety) and a seeded power.
 */
export function targetsOf(input: RpgBattleInput, rng: Rng, powerChance: number): TargetWord[] {
  const offset = rng.int(ACTIONS.length);
  return rng.shuffle(wordsOf(input)).map((w, i) => ({
    ...w,
    action: ACTIONS[(i + offset) % ACTIONS.length]!,
    power: rng.next() < powerChance ? 'power' : 'basic',
    attempts: 0,
    correctFirstTry: false,
    solved: false,
  }));
}

/** The damage a word deals. */
export const damageOf = (word: Pick<TargetWord, 'power'>, basic: number, power: number): number =>
  word.power === 'power' ? power : basic;

/**
 * The monsters of a run: a skeleton for the first `wordsPerMonster` words, a mimic for the next,
 * and the fire dragon for every word after that. A monster's HP is the damage of the words of its
 * group, so the last word of the run takes the last HP.
 */
export function monstersOf(damages: readonly number[], wordsPerMonster: number): Monster[] {
  const monsters: Monster[] = [];
  let at = 0;
  for (let i = 0; i < MONSTER_KINDS.length && at < damages.length; i++) {
    const last = i === MONSTER_KINDS.length - 1;
    const end = last ? damages.length : Math.min(at + wordsPerMonster, damages.length);
    const hp = damages.slice(at, end).reduce((a, b) => a + b, 0);
    monsters.push({ kind: MONSTER_KINDS[i]!, hp, maxHp: hp });
    at = end;
  }
  return monsters;
}

/** The options of a question: the word's meaning and distinct other meanings, in a seeded order. */
export function optionsOf(targets: readonly TargetWord[], wordId: string, count: number, rng: Rng): QuestionOption[] {
  const right = targets.find((t) => t.id === wordId)!;
  const seen = new Set([right.translation]);
  const others = rng.shuffle(targets.filter((t) => t.id !== wordId)).filter((t) => {
    if (seen.has(t.translation)) return false;
    seen.add(t.translation);
    return true;
  });
  const picked = others.slice(0, Math.max(1, count - 1));
  return rng.shuffle([right, ...picked]).map((t) => ({ id: t.id, text: t.translation }));
}
