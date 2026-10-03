/**
 * The Gryphon Patrol simulation: a real-time `Simulation` on the fixed step. Bats fly loops in
 * the sky, each carrying a word on a banner. The student shoots the bat with the next word of the
 * sentence; it drops a word orb and the gryphon flies to take it. A shot at a wrong bat costs
 * courage: the bats scatter, the gryphon rests, and the same word comes back with new bats (at 0
 * courage the rest is longer and all courage returns). Nothing waits on a clock for a result, and
 * there is no game over: the bats hold still in their loops for as long as the student reads.
 */
import { STEP_MS, createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { SKY, enemiesFor, enemyAt, patrolOf, wordPoolOf, type PatrolInput } from './content.js';
import type { Enemy, PatrolCommand, PatrolEvent, PatrolState, Round } from './types.js';

/** Every tuning number of the game. */
export const TUNING = {
  /** The most sentences in one patrol. */
  maxSentences: 4,
  /** Bats per round, and in Helper mode. */
  enemies: 4,
  enemiesHelper: 3,
  /** The gryphon's start point and speed (meters, meters per second). */
  startX: 2.5,
  startY: 5,
  gryphonSpeed: 8,
  /** The shot's speed, hit radius (bat plus shot), and the longest flight before it counts as a hit. */
  shotSpeed: 16,
  hitRadius: 1.1,
  shotMaxMs: 4000,
  /** The gryphon takes the orb when this close. */
  orbPickup: 0.7,
  /** Pause between a word and the next round. */
  gapMs: 700,
  /** Rest after a wrong shot, and after the last courage is gone. */
  restMs: 1600,
  restEmptyMs: 2600,
  /** Courage at the start and after a rest. */
  courage: 3,
  /** Score: a word on the first try, a word after a wrong shot, a sentence done. */
  wordScore: 10,
  retryWordScore: 5,
  sentenceScore: 50,
  /** The closing flight after the last sentence. */
  finaleMs: 2400,
} as const;

export interface PatrolOptions {
  seed: number;
  helper: boolean;
}

export type PatrolSimulation = Simulation<PatrolState, PatrolCommand, PatrolEvent>;

/** Bats per round for a mode. */
export function enemyCountFor(helper: boolean): number {
  return helper ? TUNING.enemiesHelper : TUNING.enemies;
}

/** The bat of the open round that carries the next word, or null when none can be shot. */
export function rightEnemyOf(state: PatrolState): Enemy | null {
  const round = state.round;
  if (!round || round.stage !== 'aim') return null;
  return round.enemies.find((e) => e.right && e.alive) ?? null;
}

const STEP_S = STEP_MS / 1000;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function createGryphonPatrol(input: PatrolInput, options: PatrolOptions): PatrolSimulation {
  const rng: Rng = createRng(options.seed);
  const sentences = patrolOf(input, rng, TUNING.maxSentences);
  const pool = wordPoolOf(input);

  const state: PatrolState = {
    phase: 'patrol',
    helper: options.helper,
    enemyCount: enemyCountFor(options.helper),
    timeMs: 0,
    restMs: 0,
    gapMs: 0,
    finaleMs: 0,
    courage: TUNING.courage,
    score: 0,
    gryphon: { x: TUNING.startX, y: TUNING.startY, facing: 1, toX: TUNING.startX, toY: TUNING.startY },
    sentences,
    sentence: 0,
    word: 0,
    round: null,
    rounds: 0,
    shot: null,
    orb: null,
    collected: 0,
  };
  // A patrol with no sentences is over before it starts (the manifest needs 3 sentences).
  if (sentences.length === 0) state.phase = 'complete';

  // ------------------------------------------------------------ rounds

  /** Opens the round for the next word of the current sentence with fresh bats. */
  const startRound = (retry: boolean, events: PatrolEvent[]): void => {
    const sentence = sentences[state.sentence]!;
    const answer = sentence.words[state.word]!;
    const enemies = enemiesFor(answer, pool, state.enemyCount, rng);
    state.rounds += 1;
    const round: Round = {
      id: `r${state.rounds}`,
      sentence: state.sentence,
      wordIndex: state.word,
      answer,
      enemies,
      startMs: state.timeMs,
      stage: 'aim',
      retry,
    };
    state.round = round;
    events.push({
      type: 'roundStarted',
      roundId: round.id,
      sentence: round.sentence,
      wordIndex: round.wordIndex,
      enemies: enemies.map((e) => ({ id: e.id, text: e.text })),
      retry,
    });
  };

  // ------------------------------------------------------------ commands

  const shoot = (enemyId: string): PatrolEvent[] => {
    const events: PatrolEvent[] = [];
    const round = state.round;
    if (!round || round.stage !== 'aim' || state.restMs > 0) return events;
    const enemy = round.enemies.find((e) => e.id === enemyId && e.alive);
    if (!enemy) return events;
    const g = state.gryphon;
    sentences[round.sentence]!.started = true;
    g.facing = enemy.x < g.x ? -1 : 1;
    g.toX = clamp(enemy.x - g.facing * 3.5, 1.2, SKY.width - 1.2);
    g.toY = clamp(enemy.y, SKY.minY, SKY.maxY);
    state.shot = { enemy: enemy.id, x: g.x + g.facing * 0.8, y: g.y, ageMs: 0 };
    round.stage = 'shot';
    events.push({ type: 'shotFired', roundId: round.id, enemy: enemy.id });
    return events;
  };

  const moveTo = (x: number, y: number): PatrolEvent[] => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
    if (state.restMs > 0 || (state.round && state.round.stage !== 'aim')) return [];
    const g = state.gryphon;
    g.toX = clamp(x, 1.2, SKY.width - 1.2);
    g.toY = clamp(y, SKY.minY, SKY.maxY);
    if (g.toX !== g.x) g.facing = g.toX < g.x ? -1 : 1;
    return [];
  };

  // ------------------------------------------------------------ the sky

  const moveGryphon = (): void => {
    const g = state.gryphon;
    const dx = g.toX - g.x;
    const dy = g.toY - g.y;
    const dist = Math.hypot(dx, dy);
    const step = TUNING.gryphonSpeed * STEP_S;
    if (dist <= step) {
      g.x = g.toX;
      g.y = g.toY;
      return;
    }
    g.x += (dx / dist) * step;
    g.y += (dy / dist) * step;
    if (Math.abs(dx) > 0.05) g.facing = dx < 0 ? -1 : 1;
  };

  const moveEnemies = (round: Round): void => {
    const seconds = (state.timeMs - round.startMs) / 1000;
    for (const enemy of round.enemies) {
      if (!enemy.alive) continue;
      const at = enemyAt(enemy, seconds);
      enemy.x = at.x;
      enemy.y = at.y;
    }
  };

  /** The shot reached `enemy`. */
  const hit = (round: Round, enemy: Enemy, events: PatrolEvent[]): void => {
    const sentence = sentences[round.sentence]!;
    const right = round.enemies.find((e) => e.right)!;
    state.shot = null;
    enemy.alive = false;
    events.push({ type: 'enemyHit', roundId: round.id, enemy: enemy.id, correct: enemy.right, rightEnemy: right.id, x: enemy.x, y: enemy.y });
    if (enemy.right) {
      for (const other of round.enemies) other.alive = false;
      state.orb = { text: enemy.text, x: enemy.x, y: enemy.y, retry: round.retry };
      round.stage = 'orb';
      state.gryphon.toX = enemy.x;
      state.gryphon.toY = enemy.y;
      events.push({ type: 'orbDropped', text: enemy.text, x: enemy.x, y: enemy.y });
      return;
    }
    for (const other of round.enemies) other.alive = false;
    round.stage = 'done';
    sentence.misses += 1;
    state.courage -= 1;
    events.push({ type: 'courageLost', courage: state.courage });
    state.restMs = state.courage <= 0 ? TUNING.restEmptyMs : TUNING.restMs;
    state.gryphon.toX = state.gryphon.x;
    state.gryphon.toY = state.gryphon.y;
  };

  const moveShot = (round: Round, events: PatrolEvent[]): void => {
    const shot = state.shot!;
    const enemy = round.enemies.find((e) => e.id === shot.enemy)!;
    shot.ageMs += STEP_MS;
    const dx = enemy.x - shot.x;
    const dy = enemy.y - shot.y;
    const dist = Math.hypot(dx, dy);
    const step = TUNING.shotSpeed * STEP_S;
    if (dist <= TUNING.hitRadius + step / 2 || shot.ageMs >= TUNING.shotMaxMs) {
      hit(round, enemy, events);
      return;
    }
    shot.x += (dx / dist) * step;
    shot.y += (dy / dist) * step;
  };

  /** The gryphon took the orb: the word is collected. */
  const collect = (round: Round, events: PatrolEvent[]): void => {
    const orb = state.orb!;
    const sentence = sentences[round.sentence]!;
    state.orb = null;
    state.word += 1;
    state.collected += 1;
    state.score += orb.retry ? TUNING.retryWordScore : TUNING.wordScore;
    events.push({ type: 'wordCollected', sentence: round.sentence, wordIndex: round.wordIndex, text: orb.text });
    round.stage = 'done';
    state.round = null;
    if (state.word === sentence.words.length) {
      sentence.cleared = true;
      state.score += TUNING.sentenceScore;
      events.push({ type: 'sentenceCast', sentence: round.sentence, id: sentence.id });
      if (state.sentence + 1 < sentences.length) {
        state.sentence += 1;
        state.word = 0;
        state.gapMs = TUNING.gapMs;
      } else {
        state.phase = 'finale';
        state.finaleMs = TUNING.finaleMs;
        state.gryphon.toX = SKY.width / 2;
        state.gryphon.toY = 6;
      }
      return;
    }
    state.gapMs = TUNING.gapMs;
  };

  // ------------------------------------------------------------ the patrol

  const tickPatrol = (events: PatrolEvent[]): void => {
    moveGryphon();
    let round = state.round;
    if (round === null) {
      state.gapMs = Math.max(0, state.gapMs - STEP_MS);
      if (state.gapMs === 0) startRound(false, events);
      return;
    }
    if (round.stage !== 'done') moveEnemies(round);
    if (state.restMs > 0) {
      state.restMs = Math.max(0, state.restMs - STEP_MS);
      if (state.restMs === 0) {
        if (state.courage <= 0) {
          state.courage = TUNING.courage;
          events.push({ type: 'rested', courage: state.courage });
        }
        // The same word returns with new bats.
        startRound(true, events);
      }
      return;
    }
    round = state.round!;
    if (round.stage === 'shot') {
      moveShot(round, events);
    } else if (round.stage === 'orb') {
      const orb = state.orb!;
      const g = state.gryphon;
      if (Math.hypot(orb.x - g.x, orb.y - g.y) <= TUNING.orbPickup) collect(round, events);
    }
  };

  const tickFinale = (events: PatrolEvent[]): void => {
    moveGryphon();
    state.finaleMs = Math.max(0, state.finaleMs - STEP_MS);
    if (state.finaleMs > 0) return;
    state.phase = 'complete';
    events.push({ type: 'patrolComplete', score: state.score });
  };

  // ------------------------------------------------------------ the simulation

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase !== 'patrol') return [];
      switch (command.type) {
        case 'shoot':
          return shoot(command.enemy);
        case 'moveTo':
          return moveTo(command.x, command.y);
        default:
          return [];
      }
    },
    tick() {
      if (state.phase === 'complete') return [];
      const events: PatrolEvent[] = [];
      state.timeMs += STEP_MS;
      if (state.phase === 'patrol') tickPatrol(events);
      else tickFinale(events);
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
