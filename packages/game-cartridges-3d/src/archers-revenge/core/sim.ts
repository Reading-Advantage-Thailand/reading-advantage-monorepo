/**
 * The Archer's Revenge simulation: a turn `Simulation` (`tick` returns []). A wave is a formation
 * of enemies (3 lanes, 2 in Helper mode), each behind a shield that shows an English word. The
 * prompt is a Thai meaning. The student shoots the lane whose word means the prompt. A right
 * arrow breaks that shield (coins grow with the streak) and the next prompt comes; when the
 * words of the wave are done, the whole formation falls and the next wave marches in. A wrong
 * arrow bounces off its shield, the enemy strikes back (courage -1), and that lane stays shut
 * for this prompt; at 0 courage the team rests back to 3. There is no game over and no timer;
 * the run is won when every word is hit.
 *
 * Event order per command:
 *   start: waveAppeared, roundShown
 *   right: shot, scored, [waveCleared, [waveAppeared]], then roundShown or victory
 *   wrong: shot, enemyStrike, [rest], roundShown
 */
import { createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { distinctTerms, formationOf, roundOf, targetsOf, type ArchersRevengeInput } from './content.js';
import type { ArchersRevengeCommand, ArchersRevengeEvent, ArchersRevengeState, Round, TargetWord, WaveEnemy } from './types.js';

/** Every tuning number of the game. */
export const TUNING = {
  /** Enemy lanes: 3, or 2 in Helper mode. */
  lanes: 3,
  helperLanes: 2,
  /** Words per wave (spread evenly over the waves of a run). */
  wordsPerWave: 5,
  coins: 10,
  /** Extra coins per right arrow already in a row, up to `maxStreakBonus`. */
  streakCoins: 5,
  maxStreakBonus: 25,
  maxCourage: 5,
  restCourage: 3,
} as const;

export interface ArchersRevengeOptions {
  seed: number;
  helper: boolean;
}

export type ArchersRevengeSimulation = Simulation<ArchersRevengeState, ArchersRevengeCommand, ArchersRevengeEvent>;

export function createArchersRevenge(input: ArchersRevengeInput, options: ArchersRevengeOptions): ArchersRevengeSimulation {
  const rng: Rng = createRng(options.seed);
  const targets = targetsOf(input, rng, TUNING.wordsPerWave);
  const lanes = Math.max(1, Math.min(options.helper ? TUNING.helperLanes : TUNING.lanes, distinctTerms(targets)));
  const waveCount = targets.reduce((n, t) => Math.max(n, t.wave), 0);
  const sizeOf = (wave: number): number => targets.filter((t) => t.wave === wave).length;
  const nextWord = (): TargetWord | undefined => state.targets.find((t) => !t.solved);

  const state: ArchersRevengeState = {
    phase: targets.length > 0 ? 'playing' : 'victory',
    helper: options.helper,
    targets,
    targetCount: targets.length,
    wave: 1,
    waveCount,
    waveSize: sizeOf(1),
    waveDone: 0,
    enemies: targets.length > 0 ? formationOf(1, lanes) : [],
    round: null,
    courage: TUNING.maxCourage,
    maxCourage: TUNING.maxCourage,
    coins: 0,
    streak: 0,
    bestStreak: 0,
    shots: 0,
    started: false,
  };
  const first = nextWord();
  if (first) state.round = roundOf(state.targets, first.id, state.enemies, rng);

  const copyEnemies = (): WaveEnemy[] => state.enemies.map((e) => ({ ...e }));
  const showRound = (): ArchersRevengeEvent => ({ type: 'roundShown', round: structuredClone(state.round as Round) });

  const start = (): ArchersRevengeEvent[] => {
    if (state.started) return [{ type: 'rejected', command: 'start' }];
    state.started = true;
    if (!state.round) return [];
    return [{ type: 'waveAppeared', wave: state.wave, waveCount: state.waveCount, enemies: copyEnemies() }, showRound()];
  };

  const fire = (laneIndex: number): ArchersRevengeEvent[] => {
    const round = state.round;
    const lane = round?.lanes.find((l) => l.lane === laneIndex);
    if (!state.started || !round || !lane || lane.blocked) return [{ type: 'rejected', command: 'fire' }];
    const word = state.targets.find((t) => t.id === round.wordId)!;
    const correct = lane.wordId === word.id;
    const events: ArchersRevengeEvent[] = [];
    state.shots += 1;
    word.attempts += 1;
    if (word.attempts === 1) word.correctFirstTry = correct;

    if (!correct) {
      lane.blocked = true;
      state.streak = 0;
      events.push({ type: 'shot', lane: lane.lane, enemyId: lane.enemyId, wordId: lane.wordId, correct, correctText: word.term, streak: 0 });
      state.courage = Math.max(0, state.courage - 1);
      events.push({ type: 'enemyStrike', enemyId: lane.enemyId, courage: state.courage });
      if (state.courage === 0) {
        state.courage = TUNING.restCourage;
        events.push({ type: 'rest', courage: state.courage });
      }
      events.push(showRound());
      return events;
    }

    word.solved = true;
    events.push({ type: 'shot', lane: lane.lane, enemyId: lane.enemyId, wordId: lane.wordId, correct, correctText: word.term, streak: state.streak + 1 });
    const coins = TUNING.coins + Math.min(TUNING.maxStreakBonus, state.streak * TUNING.streakCoins);
    state.coins += coins;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.waveDone += 1;
    events.push({ type: 'scored', coins });

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
      state.enemies = formationOf(state.wave, lanes);
      events.push({ type: 'waveAppeared', wave: state.wave, waveCount: state.waveCount, enemies: copyEnemies() });
    }
    state.round = roundOf(state.targets, nextWord()!.id, state.enemies, rng);
    events.push(showRound());
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
        case 'fire':
          return fire(command.lane);
        default:
          return [];
      }
    },
    tick: () => [],
    snapshot: () => structuredClone(state),
  };
}
