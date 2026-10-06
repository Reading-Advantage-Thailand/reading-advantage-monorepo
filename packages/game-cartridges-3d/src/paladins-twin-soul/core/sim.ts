/**
 * The Paladin's Twin Soul simulation: a turn `Simulation` (`tick` returns []).
 *
 * The legacy game was a space shooter: a boss shade captured the paladin's twin soul and showed
 * a word; the paladin shot the shade that held the matching term to free the soul and fire twin
 * shots. Here each wave shows the meaning the captor holds and a formation of shades with
 * English terms. The student strikes one shade. A wrong shade falls, the monster strikes
 * (courage -1; at 0 the team rests and returns), and the student strikes again from the shades
 * left. The captor frees the twin soul: a hero strikes, the other shades scatter, and the next
 * word comes up. No timer decides anything and there is no game over.
 *
 * Event order of one `strike`:
 *   wrong:  shadeFell, monsterStrike, [rest]
 *   right:  soulFreed, heroStrike, shadesScattered, [monsterDefeated, [monsterAppeared]],
 *           then [waveShown, captured] or victory
 */
import { createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { monstersOf, shadesOf, targetsOf, type TwinSoulInput } from './content.js';
import { HEROES, type TargetWord, type TwinSoulCommand, type TwinSoulEvent, type TwinSoulState } from './types.js';

/** Every tuning number of the game. */
export const TUNING = {
  /** Decoy shades beside the captor: 5 (a formation of 6), 3 in Helper mode. */
  decoys: 5,
  helperDecoys: 3,
  /** Points per freed soul (the legacy game paid 100 per shade). */
  pointsPerSoul: 100,
  /** Souls to free per monster; the fire dragon takes every word after the second monster. */
  wordsPerMonster: 4,
  maxCourage: 5,
  restCourage: 3,
  /** Every freed soul takes this from the monster; its HP counts the words it serves. */
  heroDamage: 1,
} as const;

export interface TwinSoulOptions {
  seed: number;
  helper: boolean;
}

export type TwinSoulSimulation = Simulation<TwinSoulState, TwinSoulCommand, TwinSoulEvent>;

export function createTwinSoul(input: TwinSoulInput, options: TwinSoulOptions): TwinSoulSimulation {
  const rng: Rng = createRng(options.seed);
  const targets = targetsOf(input, rng);
  const monsters = monstersOf(targets.length, TUNING.wordsPerMonster);
  const decoys = options.helper ? TUNING.helperDecoys : TUNING.decoys;
  const first = targets[0];

  const state: TwinSoulState = {
    phase: first ? 'playing' : 'victory',
    helper: options.helper,
    targets,
    targetIndex: 0,
    targetCount: targets.length,
    target: first ? { itemId: first.id, term: first.term, translation: first.translation } : null,
    shades: first ? shadesOf(targets, first.id, decoys, 1, rng) : [],
    monster: monsters[0] ? { ...monsters[0] } : null,
    monsterIndex: 0,
    courage: TUNING.maxCourage,
    maxCourage: TUNING.maxCourage,
    twins: 0,
    score: 0,
    heroTurn: 0,
    misses: 0,
    started: false,
  };

  const currentTarget = (): TargetWord | null => state.targets[state.targetIndex] ?? null;

  const waveEvents = (): TwinSoulEvent[] => {
    const word = currentTarget();
    if (!word) return [];
    const captor = state.shades.find((s) => s.wordId === word.id)!;
    return [
      {
        type: 'waveShown',
        itemId: word.id,
        translation: word.translation,
        shades: state.shades.map((s) => ({ id: s.id, wordId: s.wordId, term: s.term })),
      },
      { type: 'captured', shade: captor.id },
    ];
  };

  const start = (): TwinSoulEvent[] => {
    if (state.started) return [];
    state.started = true;
    const events: TwinSoulEvent[] = [];
    if (state.monster) events.push({ type: 'monsterAppeared', kind: state.monster.kind });
    events.push(...waveEvents());
    return events;
  };

  const monsterStrike = (events: TwinSoulEvent[]): void => {
    state.courage = Math.max(0, state.courage - 1);
    events.push({ type: 'monsterStrike', courage: state.courage });
    if (state.courage === 0) {
      state.courage = TUNING.restCourage;
      events.push({ type: 'rest', courage: state.courage });
    }
  };

  const strike = (shadeId: string): TwinSoulEvent[] => {
    const word = currentTarget();
    const shade = state.shades.find((s) => s.id === shadeId);
    if (!word || !shade || shade.fallen) return [{ type: 'strikeRejected', shade: shadeId }];
    const events: TwinSoulEvent[] = [];
    word.attempts += 1;
    if (shade.wordId !== word.id) {
      if (word.attempts === 1) word.correctFirstTry = false;
      shade.fallen = true;
      state.misses += 1;
      events.push({ type: 'shadeFell', shade: shade.id, wordId: shade.wordId });
      monsterStrike(events);
      return events;
    }
    if (word.attempts === 1) word.correctFirstTry = true;
    word.solved = true;
    state.twins += 1;
    state.score += TUNING.pointsPerSoul;
    events.push({
      type: 'soulFreed',
      shade: shade.id,
      itemId: word.id,
      firstTry: word.correctFirstTry,
      twins: state.twins,
      points: TUNING.pointsPerSoul,
    });
    const hero = HEROES[state.heroTurn % HEROES.length]!;
    state.heroTurn += 1;
    events.push({ type: 'heroStrike', hero, damage: TUNING.heroDamage });
    events.push({ type: 'shadesScattered', shades: state.shades.filter((s) => s !== shade && !s.fallen).map((s) => s.id) });
    const monster = state.monster;
    if (monster) {
      monster.hp = Math.max(0, monster.hp - TUNING.heroDamage);
      if (monster.hp === 0) {
        events.push({ type: 'monsterDefeated', kind: monster.kind });
        state.monsterIndex += 1;
        const next = monsters[state.monsterIndex];
        state.monster = next ? { ...next } : null;
        if (next) events.push({ type: 'monsterAppeared', kind: next.kind });
      }
    }
    state.targetIndex += 1;
    const next = currentTarget();
    if (next) {
      state.target = { itemId: next.id, term: next.term, translation: next.translation };
      state.shades = shadesOf(state.targets, next.id, decoys, state.targetIndex + 1, rng);
      events.push(...waveEvents());
    } else {
      state.target = null;
      state.shades = [];
      state.phase = 'victory';
      events.push({ type: 'victory' });
    }
    return events;
  };

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase !== 'playing') return [];
      switch (command.type) {
        case 'start':
          return start();
        case 'strike':
          return state.started ? strike(command.shade) : [];
        default:
          return [];
      }
    },
    tick: () => [],
    snapshot: () => structuredClone(state),
  };
}
