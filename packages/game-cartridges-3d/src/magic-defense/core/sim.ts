/**
 * The Magic Defense simulation: a turn `Simulation` (`tick` returns []). Enemy casters stand in
 * front of the castles (3, or 2 in Helper mode). One missile falls on one castle at a time and
 * shows a Thai meaning. The student chooses the English spell word with that meaning. A right
 * spell breaks the missile (coins grow with the streak, the storm mana grows by 10) and the next
 * missile comes; when the words of the wave are done, the whole formation falls and the next wave
 * marches in. A wrong spell fails: the missile hits its castle (-1 heart), and that spell word
 * stays shut for this missile. When every castle has fallen the heroes rest and the castles
 * stand again with full hearts. At 100 mana the student may call a storm that mends every castle.
 * There is no game over and no timer; the run is won when every word is cast.
 *
 * Event order per command:
 *   start: waveAppeared, roundShown
 *   right: cast, scored, [waveCleared, [waveAppeared]], then roundShown or victory
 *   wrong: cast, castleHit, [rest], roundShown
 *   storm: stormCast, roundShown
 */
import { createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { distinctTerms, formationOf, roundOf, standingCastles, targetsOf, type MagicDefenseInput } from './content.js';
import type { MagicDefenseCommand, MagicDefenseEvent, MagicDefenseState, Round, TargetWord, WaveEnemy } from './types.js';

/** Every tuning number of the game. */
export const TUNING = {
  /** Castles (and enemy casters): 3, or 2 in Helper mode. */
  castles: 3,
  helperCastles: 2,
  /** Spell words on the card: 3, or 2 in Helper mode. */
  choices: 3,
  helperChoices: 2,
  /** Words per wave (spread evenly over the waves of a run). */
  wordsPerWave: 5,
  castleHealth: 3,
  coins: 10,
  /** Extra coins per right spell already in a row, up to `maxStreakBonus`. */
  streakCoins: 5,
  maxStreakBonus: 25,
  /** Storm mana: +`manaPerSpell` for each right spell, a storm at `maxMana`. */
  manaPerSpell: 10,
  maxMana: 100,
} as const;

export interface MagicDefenseOptions {
  seed: number;
  helper: boolean;
}

export type MagicDefenseSimulation = Simulation<MagicDefenseState, MagicDefenseCommand, MagicDefenseEvent>;

export function createMagicDefense(input: MagicDefenseInput, options: MagicDefenseOptions): MagicDefenseSimulation {
  const rng: Rng = createRng(options.seed);
  const targets = targetsOf(input, rng, TUNING.wordsPerWave);
  const castleCount = options.helper ? TUNING.helperCastles : TUNING.castles;
  const choiceCount = Math.max(1, Math.min(options.helper ? TUNING.helperChoices : TUNING.choices, distinctTerms(targets)));
  const waveCount = targets.reduce((n, t) => Math.max(n, t.wave), 0);
  const sizeOf = (wave: number): number => targets.filter((t) => t.wave === wave).length;
  const nextWord = (): TargetWord | undefined => state.targets.find((t) => !t.solved);
  const full = (): number[] => Array.from({ length: castleCount }, () => TUNING.castleHealth);

  const state: MagicDefenseState = {
    phase: targets.length > 0 ? 'playing' : 'victory',
    helper: options.helper,
    targets,
    targetCount: targets.length,
    wave: 1,
    waveCount,
    waveSize: sizeOf(1),
    waveDone: 0,
    enemies: targets.length > 0 ? formationOf(1, castleCount) : [],
    castles: full(),
    maxCastleHealth: TUNING.castleHealth,
    round: null,
    coins: 0,
    mana: 0,
    maxMana: TUNING.maxMana,
    streak: 0,
    bestStreak: 0,
    casts: 0,
    started: false,
  };
  const newRound = (wordId: string): Round => roundOf(state.targets, wordId, state.enemies, state.castles, choiceCount, rng);
  const first = nextWord();
  if (first) state.round = newRound(first.id);

  const copyEnemies = (): WaveEnemy[] => state.enemies.map((e) => ({ ...e }));
  const showRound = (): MagicDefenseEvent => ({ type: 'roundShown', round: structuredClone(state.round as Round) });

  const start = (): MagicDefenseEvent[] => {
    if (state.started) return [{ type: 'rejected', command: 'start' }];
    state.started = true;
    if (!state.round) return [];
    return [{ type: 'waveAppeared', wave: state.wave, waveCount: state.waveCount, enemies: copyEnemies() }, showRound()];
  };

  const cast = (index: number): MagicDefenseEvent[] => {
    const round = state.round;
    const choice = round?.choices.find((c) => c.index === index);
    if (!state.started || !round || !choice || choice.blocked) return [{ type: 'rejected', command: 'cast' }];
    const word = state.targets.find((t) => t.id === round.wordId)!;
    const correct = choice.wordId === word.id;
    const events: MagicDefenseEvent[] = [];
    state.casts += 1;
    word.attempts += 1;
    if (word.attempts === 1) word.correctFirstTry = correct;
    const base = { type: 'cast', choice: choice.index, wordId: choice.wordId, correct, castle: round.castle, enemyId: round.enemyId, correctText: word.term } as const;

    if (!correct) {
      choice.blocked = true;
      state.streak = 0;
      events.push({ ...base, streak: 0 });
      state.castles[round.castle] = Math.max(0, state.castles[round.castle]! - 1);
      events.push({ type: 'castleHit', castle: round.castle, enemyId: round.enemyId, health: state.castles[round.castle]! });
      if (state.castles.every((h) => h === 0)) {
        state.castles = full();
        events.push({ type: 'rest', castles: [...state.castles] });
      }
      // The missile stays; if its castle fell, the next missile of this word comes down on a standing castle.
      if (state.castles[round.castle] === 0) {
        const kept = round.choices;
        state.round = newRound(round.wordId);
        state.round.choices = kept;
      }
      events.push(showRound());
      return events;
    }

    word.solved = true;
    events.push({ ...base, streak: state.streak + 1 });
    const coins = TUNING.coins + Math.min(TUNING.maxStreakBonus, state.streak * TUNING.streakCoins);
    state.coins += coins;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.mana = Math.min(TUNING.maxMana, state.mana + TUNING.manaPerSpell);
    state.waveDone += 1;
    events.push({ type: 'scored', coins, mana: state.mana });

    if (state.waveDone >= state.waveSize) {
      events.push({ type: 'waveCleared', wave: state.wave, enemies: copyEnemies() });
      if (state.wave >= state.waveCount) {
        state.phase = 'victory';
        state.round = null;
        state.enemies = [];
        events.push({ type: 'victory' });
        return events;
      }
      state.wave += 1;
      state.waveSize = sizeOf(state.wave);
      state.waveDone = 0;
      state.enemies = formationOf(state.wave, castleCount);
      events.push({ type: 'waveAppeared', wave: state.wave, waveCount: state.waveCount, enemies: copyEnemies() });
    }
    state.round = newRound(nextWord()!.id);
    events.push(showRound());
    return events;
  };

  const storm = (): MagicDefenseEvent[] => {
    if (!state.started || !state.round || state.mana < TUNING.maxMana) return [{ type: 'rejected', command: 'storm' }];
    state.mana = 0;
    state.castles = full();
    return [{ type: 'stormCast', castles: [...state.castles] }, showRound()];
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
        case 'cast':
          return cast(command.choice);
        case 'storm':
          return storm();
        default:
          return [];
      }
    },
    tick: () => [],
    snapshot: () => structuredClone(state),
  };
}


