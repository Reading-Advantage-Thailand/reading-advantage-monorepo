/**
 * The Shadow Gate Dungeon simulation: a real-time `Simulation` on the fixed step. Rules from
 * sections 2, 3, and 6 of docs/game-shadow-gate-dungeon-3d.md: the hero walks a dungeon room and
 * touches word crystals to build the sentence, word by word. Each wave has the next word and
 * two other words; the right crystal joins the sentence, a wrong one shows "not yet" and the
 * crystals shuffle (a reading attempt). A shadow follows the hero; its touch pushes the hero back
 * and shuffles the crystals, and it is never a reading error. When the sentence is built, the gate
 * glows, the shadows keep off, and the room is cleared at the gate. No lives, no defeat, no timer.
 */
import {
  STEP_MS,
  circlesTouch,
  clampToRect,
  createRng,
  directionTo,
  headingOf,
  separateCircles,
  spreadPoints,
  stepMover,
  type Rect,
  type Rng,
  type Simulation,
  type Vec2,
} from '@reading-advantage/advantage-play-kit-3d/sim';
import { bareWord, distractorsOf, sentencesOf, shiftOf, wordKey, type ShadowGateInput } from './content.js';
import type {
  Crystal,
  CrystalSpawn,
  Shadow,
  ShadowGateCommand,
  ShadowGateEvent,
  ShadowGateState,
  WaveCause,
} from './types.js';

/** The dungeon room in meters; the gate is in the far wall. */
export const ROOM: Rect = { minX: -5.5, maxX: 5.5, minZ: -4.5, maxZ: 4.5 };
export const GATE: Vec2 = { x: 0, z: -4.5 };
export const HERO_START: Vec2 = { x: 0, z: 3.5 };

/** Every tuning number of the game (section 6 of the design). */
export const TUNING = {
  /** The most rooms in one delve. */
  maxRooms: 5,
  heroSpeed: 3.2,
  shadowSpeed: 1.1,
  /** Helper mode: slower shadows. */
  shadowHelperSpeed: 0.8,
  /** Shadow speed grows this much per room, at most this much in all. */
  shadowSpeedUpPerRoom: 0.1,
  shadowSpeedUpMax: 0.3,
  /** Shadows: 1 in the first room, +1 every second room, at most 3 (Helper mode: +1 every third room, at most 2). */
  shadowsMax: 3,
  shadowsHelperMax: 2,
  heroRadius: 0.4,
  crystalRadius: 0.45,
  shadowRadius: 0.45,
  /** The gate counts as reached inside this radius of `GATE`. */
  gateRadius: 0.9,
  /** Crystals of a wave: the next word and this many other words (fewer when the story has fewer words). */
  distractors: 2,
  /** Crystals keep this far apart, from the hero, and from the gate. */
  crystalSpacing: 2.8,
  crystalKeepOutHero: 2.2,
  crystalKeepOutGate: 1.6,
  /** Shadows start this far from the hero and apart. */
  shadowKeepOutHero: 4,
  shadowSpacing: 2,
  /** Spread margin from the walls. */
  spawnMargin: 0.9,
  /** A bumped hero is pushed at this speed for this long. */
  bumpedMs: 800,
  bumpSpeed: 2,
  /** After a bump the shadow is pushed back this far, and every shadow rests (no chase) for this long. */
  shadowBackoff: 1.4,
  shadowRestMs: 2500,
} as const;

export type ShadowGateSimulation = Simulation<ShadowGateState, ShadowGateCommand, ShadowGateEvent>;

export interface ShadowGateOptions {
  seed: number;
  helper: boolean;
}

/** Shadows in room `room` (zero-based). */
export function shadowCountFor(room: number, helper: boolean): number {
  return helper
    ? Math.min(TUNING.shadowsHelperMax, 1 + Math.floor(room / 3))
    : Math.min(TUNING.shadowsMax, 1 + Math.floor(room / 2));
}

/** Shadow speed in room `room` (zero-based), in meters per second. */
export function shadowSpeedFor(room: number, helper: boolean): number {
  const base = helper ? TUNING.shadowHelperSpeed : TUNING.shadowSpeed;
  return base * (1 + Math.min(TUNING.shadowSpeedUpMax, TUNING.shadowSpeedUpPerRoom * room));
}

/** The crystals that hold the word the hero must take now (more than one when a word repeats). */
export function rightCrystalsOf(state: ShadowGateState): Crystal[] {
  const word = state.shift[state.room]?.words[state.next];
  if (word === undefined) return [];
  return state.crystals.filter((c) => wordKey(c.word) === wordKey(word));
}

const DT = STEP_MS / 1000;

export function createShadowGate(input: ShadowGateInput, options: ShadowGateOptions): ShadowGateSimulation {
  const rng: Rng = createRng(options.seed);
  const shift = shiftOf(input, rng, TUNING.maxRooms);
  const allSentences = sentencesOf(input);

  const state: ShadowGateState = {
    phase: 'playing',
    helper: options.helper,
    timeMs: 0,
    shift,
    room: 0,
    rooms: shift.length,
    hero: { x: HERO_START.x, z: HERO_START.z, facing: 180, bumpedMs: 0, pushX: 0, pushZ: 0 },
    crystals: [],
    shadows: [],
    next: 0,
    gateOpen: false,
    steer: { x: 0, z: 0 },
    collected: 0,
    roomsCleared: 0,
    wave: 0,
  };

  const current = () => state.shift[state.room]!;

  // ------------------------------------------------------------ waves

  /** Deals the crystals of the word `next`: the word and other words, at seeded spots away from the hero. */
  const dealWave = (cause: WaveCause, events: ShadowGateEvent[]): void => {
    const room = current();
    const answer = room.words[state.next]!;
    const others = allSentences.filter((s) => s.id !== room.id).flatMap((s) => s.words);
    const words = rng.shuffle([bareWord(answer), ...distractorsOf(room.words, others, answer, rng, TUNING.distractors)]);
    const spots = spreadPoints(rng, words.length, ROOM, {
      minDistance: TUNING.crystalSpacing,
      keepOut: [
        { x: state.hero.x, z: state.hero.z, r: TUNING.crystalKeepOutHero },
        { ...GATE, r: TUNING.crystalKeepOutGate },
      ],
      margin: TUNING.spawnMargin,
    });
    state.wave += 1;
    state.crystals = words.map((word, i) => ({ id: `c${state.wave}-${i + 1}`, word, x: spots[i]!.x, z: spots[i]!.z, contact: false }));
    const spawns: CrystalSpawn[] = state.crystals.map(({ id, word, x, z }) => ({ id, word, x, z }));
    events.push({ type: 'wavePlaced', cause, crystals: spawns });
  };

  const startRoom = (events: ShadowGateEvent[]): void => {
    const room = current();
    state.hero = { x: HERO_START.x, z: HERO_START.z, facing: 180, bumpedMs: 0, pushX: 0, pushZ: 0 };
    state.next = 0;
    state.gateOpen = false;
    state.wave = 0;
    const count = shadowCountFor(state.room, state.helper);
    const starts = spreadPoints(rng, count, ROOM, {
      minDistance: TUNING.shadowSpacing,
      keepOut: [{ ...HERO_START, r: TUNING.shadowKeepOutHero }],
      margin: TUNING.spawnMargin,
    });
    state.shadows = starts.map((p, i): Shadow => ({ id: `s${i + 1}`, x: p.x, z: p.z, restMs: 0 }));
    events.push({
      type: 'roomStarted',
      roomId: room.roomId,
      sentenceId: room.id,
      words: room.words.slice(),
      shadows: state.shadows.map(({ id, x, z }) => ({ id, x, z })),
    });
    dealWave('start', events);
  };

  const clearRoom = (events: ShadowGateEvent[]): void => {
    const room = current();
    room.cleared = true;
    state.roomsCleared += 1;
    events.push({ type: 'roomCleared', roomId: room.roomId, sentenceId: room.id });
    if (state.room + 1 >= state.rooms) {
      state.phase = 'complete';
      state.gateOpen = false;
      events.push({ type: 'delveComplete', rooms: state.roomsCleared });
      return;
    }
    state.room += 1;
    startRoom(events);
  };

  // ------------------------------------------------------------ crystals

  /** A touch counts when the hero *enters* contact with a crystal while in control. One touch per step. */
  const touchCrystals = (events: ShadowGateEvent[]): void => {
    const h = state.hero;
    let touched: Crystal | null = null;
    for (const c of state.crystals) {
      const touching = circlesTouch(h, TUNING.heroRadius, c, TUNING.crystalRadius);
      const entered = touching && !c.contact;
      c.contact = touching;
      if (entered && h.bumpedMs <= 0 && touched === null) touched = c;
    }
    if (!touched) return;
    const room = current();
    room.started = true;
    if (wordKey(touched.word) === wordKey(room.words[state.next]!)) {
      events.push({ type: 'crystalTaken', id: touched.id, index: state.next });
      state.next += 1;
      state.collected += 1;
      if (state.next >= room.words.length) {
        state.crystals = [];
        state.gateOpen = true;
        events.push({ type: 'gateOpened', roomId: room.roomId });
      } else dealWave('taken', events);
    } else {
      room.refusals += 1;
      events.push({ type: 'crystalRefused', id: touched.id });
      dealWave('refused', events);
    }
  };

  // ------------------------------------------------------------ movement

  const moveHero = (): void => {
    const h = state.hero;
    let pos: Vec2;
    if (h.bumpedMs > 0) {
      h.bumpedMs = h.bumpedMs - STEP_MS < 1e-6 ? 0 : h.bumpedMs - STEP_MS;
      pos = stepMover(h, { x: h.pushX, z: h.pushZ }, TUNING.bumpSpeed, DT);
    } else {
      pos = stepMover(h, state.steer, TUNING.heroSpeed, DT);
      if (Math.hypot(state.steer.x, state.steer.z) > 1e-6) h.facing = headingOf(state.steer);
    }
    const clamped = clampToRect(pos, ROOM, TUNING.heroRadius);
    h.x = clamped.x;
    h.z = clamped.z;
  };

  const moveShadows = (): void => {
    const speed = shadowSpeedFor(state.room, state.helper);
    for (const s of state.shadows) {
      s.restMs = s.restMs - STEP_MS < 1e-6 ? 0 : s.restMs - STEP_MS;
      // The open gate keeps every shadow off, and so does a hero pushed back.
      if (s.restMs > 0 || state.gateOpen || state.hero.bumpedMs > 0) continue;
      const dir = directionTo(s, state.hero);
      const p = clampToRect({ x: s.x + dir.x * speed * DT, z: s.z + dir.z * speed * DT }, ROOM, TUNING.shadowRadius);
      s.x = p.x;
      s.z = p.z;
    }
    // Shadows do not pile onto one spot: a soft push keeps them apart.
    const apart = separateCircles(state.shadows, TUNING.shadowRadius * 2);
    state.shadows.forEach((s, i) => {
      if (s.restMs > 0 || state.gateOpen || state.hero.bumpedMs > 0) return;
      const p = clampToRect(apart[i]!, ROOM, TUNING.shadowRadius);
      s.x = p.x;
      s.z = p.z;
    });
  };

  const shadowContacts = (events: ShadowGateEvent[]): void => {
    if (state.gateOpen) return;
    const h = state.hero;
    if (h.bumpedMs > 0) return;
    const hit = state.shadows.find((s) => circlesTouch(h, TUNING.heroRadius, s, TUNING.shadowRadius));
    if (!hit) return;
    const push = directionTo(hit, h);
    const dir = Math.hypot(push.x, push.z) < 1e-9 ? { x: 0, z: 1 } : push;
    h.bumpedMs = TUNING.bumpedMs;
    h.pushX = dir.x;
    h.pushZ = dir.z;
    const back = clampToRect({ x: hit.x - dir.x * TUNING.shadowBackoff, z: hit.z - dir.z * TUNING.shadowBackoff }, ROOM, TUNING.shadowRadius);
    hit.x = back.x;
    hit.z = back.z;
    // A bump is a breather: every shadow rests, so the hero is never trapped in a corner.
    for (const other of state.shadows) other.restMs = TUNING.shadowRestMs;
    events.push({ type: 'heroBumped', shadowId: hit.id });
    dealWave('bumped', events);
  };

  const reachGate = (events: ShadowGateEvent[]): void => {
    if (!state.gateOpen) return;
    if (!circlesTouch(state.hero, TUNING.heroRadius, GATE, TUNING.gateRadius)) return;
    clearRoom(events);
  };

  // ------------------------------------------------------------ the simulation

  // The first room is set up at creation (the view reads the state before the first tick); its
  // events come with the first tick. A delve with no rooms is over before it starts.
  const pending: ShadowGateEvent[] = [];
  if (shift.length === 0) state.phase = 'complete';
  else startRoom(pending);

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
      moveHero();
      moveShadows();
      touchCrystals(events);
      shadowContacts(events);
      reachGate(events);
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
