/**
 * The Astral Mage 3D simulation: a real-time `Simulation` on the fixed step. The mage stands at
 * the near edge of the casting floor. Word crystals drift in slow loops over the floor, one per
 * word of the sentence and one echo crystal (a word that is not in the sentence). The student
 * casts a bolt at a crystal (a tap, or the arrow keys and Space); the bolt homes on it. The
 * crystal of the next word shatters into the sentence; any other crystal dims for 1.5 s, which
 * counts one reading attempt. No lives, no defeat, no timer: nothing decides a result but
 * the order of the words.
 */
import {
  STEP_MS,
  createRng,
  distance,
  headingOf,
  directionTo,
  moveToward,
  spreadPoints,
  type Rect,
  type Rng,
  type Simulation,
  type Vec2,
} from '@reading-advantage/advantage-play-kit-3d/sim';
import { castingOf, echoWordOf, normalWord, type AstralMageInput } from './content.js';
import type {
  AstralMageCommand,
  AstralMageEvent,
  AstralMageState,
  Crystal,
  CrystalKind,
  CrystalSpawn,
  RitualSentence,
} from './types.js';

/** The casting floor in meters (where the crystals drift) and the mage's place at its near edge. */
export const FLOOR: Rect = { minX: -5, maxX: 5, minZ: -4, maxZ: 1 };
export const MAGE_START: Vec2 = { x: 0, z: 3.2 };

/** Every tuning number of the game (section 6 of the design). */
export const TUNING = {
  /** The most rituals in one casting. */
  maxRituals: 5,
  /** Crystals keep this far apart at their anchors (relaxed when the floor is full). */
  crystalSpacing: 2,
  /** Spread margin from the edge of the floor. */
  spawnMargin: 0.9,
  /** The drift loop: radius in meters, and angular speed in radians per second on each axis. */
  driftRadius: 0.45,
  driftSpeedX: 0.8,
  driftSpeedZ: 1.1,
  /** A crystal counts as hit inside this radius. */
  crystalRadius: 0.5,
  /** The bolt flies at this speed (meters per second). */
  boltSpeed: 11,
  /** A crystal that took a wrong bolt dims this long and cannot be cast at. */
  dimMs: 1500,
} as const;

export type AstralMageSimulation = Simulation<AstralMageState, AstralMageCommand, AstralMageEvent>;

export interface AstralMageOptions {
  seed: number;
  helper: boolean;
}

const DT = STEP_MS / 1000;
const countDown = (ms: number): number => (ms - STEP_MS < 1e-6 ? 0 : ms - STEP_MS);

/** The drifting place of a crystal at game time `timeMs` (a pure function of the anchor). */
export function driftOf(crystal: Pick<Crystal, 'ax' | 'az' | 'phase'>, timeMs: number): Vec2 {
  const t = timeMs / 1000;
  return {
    x: crystal.ax + Math.cos(crystal.phase + t * TUNING.driftSpeedX) * TUNING.driftRadius,
    z: crystal.az + Math.sin(crystal.phase * 1.7 + t * TUNING.driftSpeedZ) * TUNING.driftRadius,
  };
}

/** The crystal of the next word, or null when the sentence is complete. */
export function nextCrystalOf(state: AstralMageState): Crystal | null {
  return state.crystals.find((c) => c.kind === 'word' && c.index === state.next && !c.struck) ?? null;
}

/** Crystals that are still there, left to right (the order of the keyboard aim). */
export function liveCrystalsOf(state: AstralMageState): Crystal[] {
  return state.crystals.filter((c) => !c.struck).sort((a, b) => a.ax - b.ax || a.az - b.az);
}

/** True when a bolt at this crystal would leave the staff now. */
export function castable(state: AstralMageState, crystal: Crystal): boolean {
  return state.phase === 'playing' && state.bolt === null && !crystal.struck && crystal.dimMs <= 0;
}

export function createAstralMage(input: AstralMageInput, options: AstralMageOptions): AstralMageSimulation {
  const rng: Rng = createRng(options.seed);
  const casting = castingOf(input, rng, TUNING.maxRituals);

  const state: AstralMageState = {
    phase: 'playing',
    helper: options.helper,
    timeMs: 0,
    casting,
    ritual: 0,
    rituals: casting.length,
    mage: { x: MAGE_START.x, z: MAGE_START.z, facing: 180 },
    crystals: [],
    next: 0,
    bolt: null,
    aimId: null,
    struck: 0,
    ritualsCleared: 0,
    casts: 0,
  };

  const current = (): RitualSentence => state.casting[state.ritual]!;

  // ------------------------------------------------------------ rituals

  const aimFirst = (): void => {
    state.aimId = liveCrystalsOf(state)[0]?.id ?? null;
  };

  const startRitual = (events: AstralMageEvent[]): void => {
    const ritual = current();
    state.next = 0;
    state.bolt = null;
    state.mage.facing = 180;
    const echo = echoWordOf(input, ritual.id, ritual.words, rng);
    const labels: { word: string; kind: CrystalKind; index: number }[] = ritual.words.map((word, index) => ({ word, kind: 'word', index }));
    if (echo !== null) labels.push({ word: echo, kind: 'echo' as const, index: -1 });
    const spots = spreadPoints(rng, labels.length, FLOOR, { minDistance: TUNING.crystalSpacing, margin: TUNING.spawnMargin });
    // Which crystal stands where is seeded: the order of the words is not the order on the floor.
    const order = rng.shuffle(labels.map((_, i) => i));
    state.crystals = order.map((labelIndex, slot) => {
      const label = labels[labelIndex]!;
      const spot = spots[slot]!;
      const crystal: Crystal = {
        id: label.kind === 'word' ? `c${label.index + 1}` : 'echo',
        word: label.word,
        kind: label.kind,
        index: label.index,
        ax: spot.x,
        az: spot.z,
        x: spot.x,
        z: spot.z,
        phase: rng.next() * Math.PI * 2,
        struck: false,
        dimMs: 0,
      };
      const at = driftOf(crystal, 0);
      crystal.x = at.x;
      crystal.z = at.z;
      return crystal;
    });
    aimFirst();
    const spawns: CrystalSpawn[] = state.crystals.map(({ id, word, kind, index, x, z }) => ({ id, word, kind, index, x, z }));
    events.push({ type: 'ritualStarted', ritualId: ritual.ritualId, sentenceId: ritual.id, words: ritual.words.slice(), crystals: spawns });
  };

  const clearRitual = (events: AstralMageEvent[]): void => {
    const ritual = current();
    ritual.cleared = true;
    state.ritualsCleared += 1;
    events.push({ type: 'ritualCleared', ritualId: ritual.ritualId, sentenceId: ritual.id });
    if (state.ritual + 1 >= state.rituals) {
      state.phase = 'complete';
      state.aimId = null;
      events.push({ type: 'castingComplete', rituals: state.ritualsCleared });
      return;
    }
    state.ritual += 1;
    startRitual(events);
  };

  // ------------------------------------------------------------ the bolt

  /** The bolt arrived: the crystal of the next word shatters, any other crystal dims. */
  const resolve = (crystal: Crystal, events: AstralMageEvent[]): void => {
    const ritual = current();
    state.bolt = null;
    const expected = nextCrystalOf(state);
    const right = expected !== null && crystal.kind === 'word' && normalWord(crystal.word) === normalWord(expected.word);
    if (!right || expected === null) {
      ritual.refusals += 1;
      crystal.dimMs = TUNING.dimMs;
      events.push({ type: 'crystalFizzled', id: crystal.id });
      return;
    }
    // A repeated word ("the ... the") is the same word: the two crystals swap their places in the order.
    if (crystal !== expected) {
      expected.index = crystal.index;
      crystal.index = state.next;
    }
    crystal.struck = true;
    state.next += 1;
    state.struck += 1;
    events.push({ type: 'crystalStruck', id: crystal.id, index: crystal.index });
    if (state.aimId === crystal.id) aimNear(crystal);
    if (state.next >= ritual.words.length) clearRitual(events);
  };

  /** After a crystal is gone the staff moves to the live crystal nearest to it. */
  const aimNear = (gone: Crystal): void => {
    const live = liveCrystalsOf(state);
    live.sort((a, b) => distance(a, gone) - distance(b, gone));
    state.aimId = live[0]?.id ?? null;
  };

  const moveBolt = (events: AstralMageEvent[]): void => {
    const bolt = state.bolt;
    if (!bolt) return;
    const target = state.crystals.find((c) => c.id === bolt.targetId);
    if (!target || target.struck) {
      state.bolt = null;
      return;
    }
    const p = moveToward(bolt, target, TUNING.boltSpeed * DT);
    bolt.x = p.x;
    bolt.z = p.z;
    if (distance(bolt, target) <= TUNING.crystalRadius * 0.5) resolve(target, events);
  };

  const driftCrystals = (): void => {
    for (const c of state.crystals) {
      c.dimMs = countDown(c.dimMs);
      if (c.struck) continue;
      const at = driftOf(c, state.timeMs);
      c.x = at.x;
      c.z = at.z;
    }
  };

  // ------------------------------------------------------------ the simulation

  // The first ritual is set up at creation (the view reads the state before the first tick); its
  // `ritualStarted` event comes with the first tick. A casting with no rituals is over before it starts.
  const pending: AstralMageEvent[] = [];
  if (casting.length === 0) state.phase = 'complete';
  else startRitual(pending);

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase !== 'playing') return [];
      const events: AstralMageEvent[] = [];
      if (command.type === 'aim') {
        const live = liveCrystalsOf(state);
        if (live.length === 0) return [];
        const at = live.findIndex((c) => c.id === state.aimId);
        const step = command.dir < 0 ? -1 : 1;
        const to = live[(at + step + live.length * 2) % live.length]!;
        if (to.id !== state.aimId) {
          state.aimId = to.id;
          events.push({ type: 'aimed', crystalId: to.id });
        }
        return events;
      }
      if (command.type === 'cast') {
        const id = command.crystalId ?? state.aimId;
        const crystal = id === null ? undefined : state.crystals.find((c) => c.id === id);
        if (!crystal || !castable(state, crystal)) return [];
        state.aimId = crystal.id;
        state.casts += 1;
        current().started = true;
        state.bolt = { id: `b${state.casts}`, targetId: crystal.id, x: state.mage.x, z: state.mage.z };
        state.mage.facing = headingOf(directionTo(state.mage, crystal));
        events.push({ type: 'boltCast', boltId: state.bolt.id, targetId: crystal.id });
        return events;
      }
      return [];
    },
    tick() {
      if (state.phase !== 'playing') return [];
      const events = pending.splice(0);
      state.timeMs += STEP_MS;
      driftCrystals();
      moveBolt(events);
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
