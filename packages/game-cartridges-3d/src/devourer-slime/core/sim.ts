/**
 * The Devourer Slime 3D simulation: a real-time `Simulation` on the fixed step. Rules from
 * sections 2, 3, and 6 of docs/game-devourer-slime-3d.md: word bubbles of a sentence float over
 * a round clearing; the slime eats them in order and grows 8% per right word; a wrong bubble is
 * spat 1.5 m away and the slime shrinks 3% (never below its start size); guards patrol and
 * bounce off the edge; a guard bigger than the slime pushes it back for 0.8 s and costs 5% size;
 * a finished sentence powers the slime for a countdown, and it swallows guards for coins (then
 * it is back to its start size); an eaten guard is back at once at a spawn point far from the
 * slime. No lives, no defeat.
 */
import {
  STEP_MS,
  bouncePatroller,
  circlesTouch,
  clampToCircle,
  createRng,
  directionTo,
  distance,
  headingOf,
  spreadPoints,
  stepMover,
  velocityAwayFrom,
  type Circle,
  type Rng,
  type Simulation,
  type Vec2,
} from '@reading-advantage/advantage-play-kit-3d/sim';
import { guardKindsOf, shiftOf, type DevourerSlimeInput } from './content.js';
import type { Bubble, DevourerSlimeCommand, DevourerSlimeEvent, DevourerSlimeState, Guard, ShiftSentence } from './types.js';

/** The clearing floor: a circle of radius 7 m around the origin. */
export const CLEARING: Circle = { x: 0, z: 0, r: 7 };
export const SLIME_START: Vec2 = { x: 0, z: 0 };

/** Every tuning number of the game (section 6 of the design). */
export const TUNING = {
  /** The most sentences in one shift. */
  maxSentences: 5,
  slimeSpeed: 3,
  guardSpeed: 1.3,
  /** Guards: 2 in Helper mode, 3 otherwise. */
  guardsHelper: 2,
  guards: 3,
  /** Guard size on the slime's scale. */
  guardSize: 1.35,
  /** A finished sentence powers the slime this long; then it is back to its start size. */
  powerMs: 8000,
  /** Radius of a body of size 1 (slime and guards). */
  bodyRadius: 0.45,
  bubbleRadius: 0.3,
  /** Size change per right word, wrong word, and bump; never below the start size. */
  growPerWord: 0.08,
  shrinkPerWrong: 0.03,
  shrinkPerBump: 0.05,
  minSize: 1,
  /**
   * A spat bubble lands this far from the slime (more for a big slime: its radius + the bubble
   * radius + `spitClearance`) and cannot be eaten for this long.
   */
  spitDistance: 1.5,
  spitClearance: 0.6,
  spatMs: 800,
  /** A bumped slime is pushed at this speed for this long. */
  bumpedMs: 800,
  bumpSpeed: 2,
  /** Coins per swallowed guard. */
  guardCoins: 20,
  /** Guard spawn points: this many, evenly spread on a ring of this radius. */
  spawnPoints: 8,
  spawnRing: 5.6,
  /** An eaten guard respawns at one of this many spawn points farthest from the slime. */
  spawnFarthest: 3,
  /**
   * Bubbles keep this far apart and from the slime, or more when the slime is big (a slime must
   * pass between two bubbles without a touch: 2 x its radius + `bubbleGap`).
   */
  bubbleSpacing: 1.5,
  bubbleGap: 0.8,
  bubbleKeepOutSlime: 2,
  guardKeepOutSlime: 3.5,
  guardSpacing: 2,
  /** Spread margin from the edge of the clearing. */
  spawnMargin: 0.8,
} as const;

/** Where eaten guards come back: evenly spread on a ring near the edge of the clearing. */
export const SPAWN_POINTS: readonly Vec2[] = Array.from({ length: TUNING.spawnPoints }, (_, i) => {
  const a = ((i + 0.5) / TUNING.spawnPoints) * Math.PI * 2;
  return { x: Math.cos(a) * TUNING.spawnRing, z: Math.sin(a) * TUNING.spawnRing };
});

export interface DevourerSlimeOptions {
  seed: number;
  helper: boolean;
}

export type DevourerSlimeSimulation = Simulation<DevourerSlimeState, DevourerSlimeCommand, DevourerSlimeEvent>;

/** The radius of the slime or a guard of `size`. */
export const radiusOf = (size: number): number => TUNING.bodyRadius * size;

/** Guards in the clearing. */
export function guardCountFor(helper: boolean): number {
  return helper ? TUNING.guardsHelper : TUNING.guards;
}

/** The least distance between two bubbles for a slime of `size`: it must pass between them. */
export function bubbleSpacingFor(size: number): number {
  return Math.max(TUNING.bubbleSpacing, 2 * radiusOf(size) + TUNING.bubbleGap);
}

/** The bubble the slime must eat next, or null when the sentence is complete. */
export function nextBubbleOf(state: DevourerSlimeState): Bubble | null {
  return state.bubbles.find((b) => b.index === state.next && !b.eaten) ?? null;
}

const DT = STEP_MS / 1000;

/** One step off a timer; float dust below a microsecond counts as zero. */
const countDown = (ms: number): number => (ms - STEP_MS < 1e-6 ? 0 : ms - STEP_MS);

export function createDevourerSlime(input: DevourerSlimeInput, options: DevourerSlimeOptions): DevourerSlimeSimulation {
  const rng: Rng = createRng(options.seed);
  const shift = shiftOf(input, rng, TUNING.maxSentences);

  const state: DevourerSlimeState = {
    phase: 'playing',
    helper: options.helper,
    timeMs: 0,
    shift,
    sentence: 0,
    sentences: shift.length,
    slime: { x: SLIME_START.x, z: SLIME_START.z, size: 1, facing: 0, bumpedMs: 0, poweredMs: 0, pushX: 0, pushZ: 0 },
    bubbles: [],
    next: 0,
    guards: [],
    coins: 0,
    steer: { x: 0, z: 0 },
    eaten: 0,
    guardsEaten: 0,
  };

  const current = (): ShiftSentence => state.shift[state.sentence]!;

  // ------------------------------------------------------------ sentences and guards

  /**
   * Puts an eaten guard back at once, at one of the spawn points farthest from the slime (and clear
   * of the other guards), moving in a random direction.
   */
  const respawnGuard = (g: Guard, events: DevourerSlimeEvent[]): void => {
    const others = state.guards.filter((o) => o !== g);
    const ranked = SPAWN_POINTS.map((p) => ({ p, d: distance(p, state.slime), clear: others.every((o) => distance(o, p) >= TUNING.guardSpacing) })).sort((a, b) => b.d - a.d);
    const open = ranked.filter((c) => c.clear);
    const pool = (open.length > 0 ? open : ranked).slice(0, TUNING.spawnFarthest);
    const spot = pool[Math.floor(rng.next() * pool.length)]!.p;
    const angle = rng.next() * Math.PI * 2;
    g.x = spot.x;
    g.z = spot.z;
    g.vx = Math.cos(angle) * TUNING.guardSpeed;
    g.vz = Math.sin(angle) * TUNING.guardSpeed;
    events.push({ type: 'guardReturned', guardId: g.id, kind: g.kind, x: g.x, z: g.z });
  };

  const spawnGuards = (): void => {
    const count = guardCountFor(state.helper);
    const kinds = guardKindsOf(rng, count);
    const starts = spreadPoints(rng, count, CLEARING, {
      minDistance: TUNING.guardSpacing,
      keepOut: [{ ...SLIME_START, r: TUNING.guardKeepOutSlime }],
      margin: TUNING.spawnMargin,
    });
    state.guards = starts.map((p, i) => {
      const angle = rng.next() * Math.PI * 2;
      return {
        id: `g${i + 1}`,
        kind: kinds[i]!,
        x: p.x,
        z: p.z,
        vx: Math.cos(angle) * TUNING.guardSpeed,
        vz: Math.sin(angle) * TUNING.guardSpeed,
        size: TUNING.guardSize,
      };
    });
  };

  const startSentence = (events: DevourerSlimeEvent[]): void => {
    const sentence = current();
    state.next = 0;
    const spots = spreadPoints(rng, sentence.words.length, CLEARING, {
      minDistance: bubbleSpacingFor(state.slime.size),
      keepOut: [{ ...state.slime, r: Math.max(TUNING.bubbleKeepOutSlime, radiusOf(state.slime.size) + 1.5) }],
      margin: TUNING.spawnMargin,
    });
    state.bubbles = sentence.words.map((word, index) => ({
      id: `b${state.sentence + 1}-${index + 1}`,
      word,
      index,
      x: spots[index]!.x,
      z: spots[index]!.z,
      eaten: false,
      spatMs: 0,
    }));
    events.push({
      type: 'sentenceStarted',
      sentenceId: sentence.id,
      words: sentence.words.slice(),
      bubbles: state.bubbles.map(({ id, word, index, x, z }) => ({ id, word, index, x, z })),
    });
  };

  const completeSentence = (events: DevourerSlimeEvent[]): void => {
    const sentence = current();
    sentence.complete = true;
    events.push({ type: 'sentenceComplete', sentenceId: sentence.id });
    if (state.sentence + 1 >= state.sentences) {
      state.phase = 'complete';
      events.push({ type: 'shiftComplete', sentences: state.sentences, size: state.slime.size });
      return;
    }
    // A finished sentence powers the slime for a countdown (a power already running starts over).
    state.slime.poweredMs = TUNING.powerMs;
    events.push({ type: 'powerStarted', durationMs: TUNING.powerMs, size: state.slime.size });
    state.sentence += 1;
    startSentence(events);
  };

  // ------------------------------------------------------------ movement

  const moveSlime = (): void => {
    const s = state.slime;
    let pos: Vec2;
    if (s.bumpedMs > 0) {
      s.bumpedMs = countDown(s.bumpedMs);
      pos = stepMover(s, { x: s.pushX, z: s.pushZ }, TUNING.bumpSpeed, DT);
    } else {
      pos = stepMover(s, state.steer, TUNING.slimeSpeed, DT);
      if (Math.hypot(state.steer.x, state.steer.z) > 1e-6) s.facing = headingOf(state.steer);
    }
    const clamped = clampToCircle(pos, CLEARING, radiusOf(s.size));
    s.x = clamped.x;
    s.z = clamped.z;
  };

  const moveGuards = (): void => {
    for (const g of state.guards) {
      Object.assign(g, bouncePatroller(g, CLEARING, radiusOf(g.size), DT));
    }
  };

  const tickBubbles = (): void => {
    for (const b of state.bubbles) if (b.spatMs > 0) b.spatMs = countDown(b.spatMs);
  };

  // ------------------------------------------------------------ contacts

  /**
   * Where a spat bubble lands: out of the slime's reach (`spitDistance`, or more for a big
   * slime), away from the slime, or toward the center when that spot would leave the clearing.
   */
  const spitLanding = (s: Vec2 & { size: number }, b: Vec2): Vec2 => {
    const reach = Math.max(TUNING.spitDistance, radiusOf(s.size) + TUNING.bubbleRadius + TUNING.spitClearance);
    const away = velocityAwayFrom(b, s, reach, { x: 0, z: -1 });
    const straight = { x: s.x + away.x, z: s.z + away.z };
    const inside = clampToCircle(straight, CLEARING, TUNING.spawnMargin);
    if (distance(inside, s) >= reach - 1e-6) return inside;
    const inward = velocityAwayFrom(CLEARING, s, reach, { x: 0, z: 1 }); // from the slime toward the center
    return clampToCircle({ x: s.x + inward.x, z: s.z + inward.z }, CLEARING, TUNING.spawnMargin);
  };

  const shrink = (by: number): void => {
    state.slime.size = Math.max(TUNING.minSize, state.slime.size - by);
  };

  const eatBubbles = (events: DevourerSlimeEvent[]): void => {
    const sentence = current();
    const s = state.slime;
    for (const b of state.bubbles) {
      if (b.eaten || b.spatMs > 0) continue;
      if (!circlesTouch(s, radiusOf(s.size), b, TUNING.bubbleRadius)) continue;
      sentence.started = true;
      if (b.index === state.next) {
        b.eaten = true;
        state.next += 1;
        state.eaten += 1;
        s.size += TUNING.growPerWord;
        events.push({ type: 'wordEaten', id: b.id, index: b.index, size: s.size });
        if (state.next >= sentence.words.length) {
          completeSentence(events);
          return;
        }
      } else {
        sentence.wrong += 1;
        shrink(TUNING.shrinkPerWrong);
        const landed = spitLanding(s, b);
        b.x = landed.x;
        b.z = landed.z;
        b.spatMs = TUNING.spatMs;
        events.push({ type: 'wordSpat', id: b.id, size: s.size });
      }
      return; // one bubble per step
    }
  };

  const meetGuards = (events: DevourerSlimeEvent[]): void => {
    const s = state.slime;
    for (const g of state.guards) {
      if (!circlesTouch(s, radiusOf(s.size), g, radiusOf(g.size))) continue;
      if (s.poweredMs > 0) {
        state.coins += TUNING.guardCoins;
        state.guardsEaten += 1;
        events.push({ type: 'guardEaten', guardId: g.id, size: s.size, coins: TUNING.guardCoins });
        respawnGuard(g, events);
        continue;
      }
      if (s.bumpedMs > 0) continue;
      const push = directionTo(g, s);
      const dir = Math.hypot(push.x, push.z) < 1e-9 ? { x: 0, z: 1 } : push;
      s.bumpedMs = TUNING.bumpedMs;
      s.pushX = dir.x;
      s.pushZ = dir.z;
      shrink(TUNING.shrinkPerBump);
      const away = velocityAwayFrom(g, s, Math.hypot(g.vx, g.vz), { x: 0, z: -1 });
      g.vx = away.x;
      g.vz = away.z;
      events.push({ type: 'slimeBumped', guardId: g.id, size: s.size });
    }
  };

  /** The power-up counts down; at zero the slime is back to its start size. */
  const tickPower = (events: DevourerSlimeEvent[]): void => {
    const s = state.slime;
    if (s.poweredMs === 0) return;
    s.poweredMs = countDown(s.poweredMs);
    if (s.poweredMs > 0) return;
    s.size = TUNING.minSize;
    events.push({ type: 'powerEnded', size: s.size });
  };

  // ------------------------------------------------------------ the simulation

  // The first sentence and the guards are set up at creation (the view reads the state before
  // the first tick); `sentenceStarted` comes with the first tick. A shift with no sentences is
  // over before it starts.
  const pending: DevourerSlimeEvent[] = [];
  if (shift.length === 0) state.phase = 'complete';
  else {
    spawnGuards();
    startSentence(pending);
  }

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase !== 'playing') return [];
      if (command.type !== 'steer') return [];
      const x = Number.isFinite(command.x) ? command.x : 0;
      const z = Number.isFinite(command.z) ? command.z : 0;
      const len = Math.hypot(x, z);
      const scale = len > 1 ? 1 / len : 1;
      state.steer = { x: x * scale, z: z * scale };
      return [];
    },
    tick() {
      if (state.phase !== 'playing') return [];
      const events = pending.splice(0);
      state.timeMs += STEP_MS;
      moveSlime();
      moveGuards();
      tickBubbles();
      tickPower(events);
      eatBubbles(events);
      if (state.phase === 'playing') meetGuards(events);
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
