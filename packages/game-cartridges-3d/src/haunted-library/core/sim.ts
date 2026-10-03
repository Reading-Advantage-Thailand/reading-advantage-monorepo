/**
 * The Haunted Library 3D simulation: a real-time `Simulation` on the fixed step. The hero walks
 * a floor of the library and opens the doors in the order of the sentence (each door holds one
 * word). The right door opens and stuns the ghosts near it; a wrong door lets a bat out and
 * costs courage. Pads at both ends of a floor bounce the hero up one floor; the drop command
 * goes down one. A ghost or bat that touches the hero costs courage and knocks the hero back.
 * When courage runs out the team rests and returns to the entrance with full courage. No timer
 * decides a result and there is no game over.
 */
import { STEP_MS, createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { visitOf, type LibraryInput } from './content.js';
import {
  FLOOR_COUNT,
  type Door,
  type Hazard,
  type HazardSpawn,
  type LibraryCommand,
  type LibraryEvent,
  type LibraryRoom,
  type LibraryState,
} from './types.js';

/** The library floor spans x in [-HALF_WIDTH, HALF_WIDTH] meters. */
export const HALF_WIDTH = 5.5;
/** Distance between two floors in meters (the 3D view's height step). */
export const FLOOR_HEIGHT = 3;

/** Every tuning number of the game. */
export const TUNING = {
  /** The most rooms in one visit. */
  maxRooms: 5,
  heroSpeed: 3.4,
  /** The hero stays this far from the ends of a floor. */
  heroMargin: 0.3,
  /** A pad covers |x| >= padX; the hero lands at |x| <= landX. */
  padX: 4.7,
  landX: 4.3,
  riseMs: 700,
  dropMs: 450,
  /** After a landing a pad does not bounce the hero for this long. */
  padCooldownMs: 600,
  ghostSpeed: 1.6,
  batSpeed: 3,
  maxBats: 3,
  ghosts: 3,
  helperGhosts: 2,
  /** Hazards turn around this far from the ends of a floor. */
  hazardMargin: 0.4,
  ghostStunMs: 2000,
  /** A right door stuns ghosts on its floor within this distance. */
  stunRange: 2.5,
  hitRange: 0.7,
  hurtMs: 1200,
  knockMs: 350,
  knockSpeed: 3.2,
  /** The hero opens a door within this distance. */
  openRange: 1,
  courage: 3,
  /** Doors stand in |x| <= doorX and apart from each other by doorSpacing on a floor. */
  doorX: 4.2,
  doorSpacing: 2.2,
  /** Ghosts do not start this close to the hero on its floor. */
  ghostKeepOutHero: 3,
  /** After a rest the hero cannot act for this long and cannot be hit for restHurtMs. */
  restControlMs: 1000,
  restHurtMs: 1500,
} as const;

export interface HauntedLibraryOptions {
  seed: number;
  helper: boolean;
}

export type HauntedLibrarySimulation = Simulation<LibraryState, LibraryCommand, LibraryEvent>;

/** Ghosts in a room. */
export const ghostCountFor = (helper: boolean): number => (helper ? TUNING.helperGhosts : TUNING.ghosts);

/** The door the hero must open next, or null when the room is done. */
export function nextDoorOf(state: LibraryState): Door | null {
  return state.doors.find((d) => d.index === state.next) ?? null;
}

const DT = STEP_MS / 1000;
const countDown = (ms: number): number => (ms - STEP_MS < 1e-6 ? 0 : ms - STEP_MS);
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function createHauntedLibrary(input: LibraryInput, options: HauntedLibraryOptions): HauntedLibrarySimulation {
  const rng: Rng = createRng(options.seed);
  const shift = visitOf(input, rng, TUNING.maxRooms);
  const entrance = (): { x: number; floor: number } => ({ x: 0, floor: 0 });

  const state: LibraryState = {
    phase: 'playing',
    helper: options.helper,
    timeMs: 0,
    shift,
    room: 0,
    rooms: shift.length,
    hero: { ...entrance(), toFloor: 0, travelMs: 0, facing: 1, hurtMs: 0, controlMs: 0, push: 0, padMs: 0 },
    doors: [],
    hazards: [],
    next: 0,
    courage: TUNING.courage,
    maxCourage: TUNING.courage,
    move: 0,
    opened: 0,
    roomsCleared: 0,
    rests: 0,
    batSerial: 0,
  };

  const current = (): LibraryRoom => state.shift[state.room]!;
  const spawnOf = (h: Hazard): HazardSpawn => ({ id: h.id, kind: h.kind, x: h.x, floor: h.floor });

  // ------------------------------------------------------------ rooms

  const placeDoors = (room: LibraryRoom): Door[] => {
    const doors: Door[] = [];
    room.words.forEach((word, index) => {
      let x = 0;
      let floor = 0;
      for (let attempt = 0; attempt < 40; attempt++) {
        floor = rng.int(FLOOR_COUNT);
        x = (rng.next() * 2 - 1) * TUNING.doorX;
        if (!doors.some((d) => d.floor === floor && Math.abs(d.x - x) < TUNING.doorSpacing)) break;
      }
      doors.push({ id: `d${index + 1}`, word, index, x, floor, open: false });
    });
    return doors;
  };

  const placeGhosts = (doors: readonly Door[]): Hazard[] => {
    const count = ghostCountFor(state.helper);
    const limit = HALF_WIDTH - TUNING.hazardMargin;
    return Array.from({ length: count }, (_, i) => {
      let floor: number;
      let x: number;
      if (i === 0) {
        floor = doors[0]!.floor;
        x = clamp(doors[0]!.x + (rng.next() < 0.5 ? -1.2 : 1.2), -limit, limit);
      } else {
        floor = rng.int(FLOOR_COUNT);
        x = (rng.next() * 2 - 1) * (HALF_WIDTH - 0.8);
      }
      if (floor === state.hero.floor && Math.abs(x - state.hero.x) < TUNING.ghostKeepOutHero) floor = (floor + 1) % FLOOR_COUNT;
      const vx = (rng.next() < 0.5 ? -1 : 1) * TUNING.ghostSpeed;
      return { id: `g${i + 1}`, kind: 'ghost' as const, x, floor, vx, stunMs: 0 };
    });
  };

  const startRoom = (events: LibraryEvent[]): void => {
    const room = current();
    state.next = 0;
    state.doors = placeDoors(room);
    state.hazards = placeGhosts(state.doors);
    events.push({
      type: 'roomStarted',
      roomId: room.roomId,
      sentenceId: room.id,
      words: room.words.slice(),
      doors: state.doors.map(({ id, word, index, x, floor }) => ({ id, word, index, x, floor })),
      hazards: state.hazards.map(spawnOf),
    });
  };

  const clearRoom = (events: LibraryEvent[]): void => {
    const room = current();
    room.cleared = true;
    state.roomsCleared += 1;
    events.push({ type: 'roomCleared', roomId: room.roomId, sentenceId: room.id });
    if (state.room + 1 >= state.rooms) {
      state.phase = 'complete';
      state.hazards = [];
      events.push({ type: 'visitComplete', rooms: state.roomsCleared });
      return;
    }
    state.room += 1;
    startRoom(events);
  };

  // ------------------------------------------------------------ courage

  const rest = (events: LibraryEvent[]): void => {
    state.rests += 1;
    state.courage = state.maxCourage;
    const h = state.hero;
    Object.assign(h, entrance(), { toFloor: 0, travelMs: 0, push: 0, controlMs: TUNING.restControlMs, hurtMs: TUNING.restHurtMs, padMs: TUNING.padCooldownMs });
    state.hazards = state.hazards.filter((z) => z.kind !== 'bat');
    events.push({ type: 'teamRested', courage: state.courage });
  };

  const loseCourage = (events: LibraryEvent[]): void => {
    state.courage = Math.max(0, state.courage - 1);
    events.push({ type: 'courageChanged', courage: state.courage });
    if (state.courage === 0) rest(events);
  };

  // ------------------------------------------------------------ doors

  const openDoor = (events: LibraryEvent[]): void => {
    const h = state.hero;
    if (h.travelMs > 0 || h.controlMs > 0) return;
    let target: Door | null = null;
    for (const d of state.doors) {
      if (d.open || d.floor !== h.floor) continue;
      if (Math.abs(d.x - h.x) > TUNING.openRange) continue;
      if (!target || Math.abs(d.x - h.x) < Math.abs(target.x - h.x)) target = d;
    }
    if (!target) return;
    const room = current();
    room.started = true;
    if (target.index === state.next) {
      target.open = true;
      state.next += 1;
      state.opened += 1;
      const stunned: string[] = [];
      for (const z of state.hazards) {
        if (z.kind === 'ghost' && z.floor === target.floor && Math.abs(z.x - target.x) <= TUNING.stunRange) {
          z.stunMs = TUNING.ghostStunMs;
          stunned.push(z.id);
        }
      }
      events.push({ type: 'doorOpened', id: target.id, index: target.index, stunned });
      if (state.next >= room.words.length) clearRoom(events);
      return;
    }
    room.refusals += 1;
    const bat: Hazard = {
      id: `b${state.batSerial + 1}`,
      kind: 'bat',
      x: target.x,
      floor: target.floor,
      vx: (rng.next() < 0.5 ? -1 : 1) * TUNING.batSpeed,
      stunMs: 0,
    };
    state.batSerial += 1;
    state.hazards.push(bat);
    let removed: string | null = null;
    const bats = state.hazards.filter((z) => z.kind === 'bat');
    if (bats.length > TUNING.maxBats) {
      removed = bats[0]!.id;
      state.hazards = state.hazards.filter((z) => z.id !== removed);
    }
    events.push({ type: 'doorWrong', id: target.id, bat: spawnOf(bat), removed });
    loseCourage(events);
  };

  // ------------------------------------------------------------ movement

  const moveHero = (events: LibraryEvent[]): void => {
    const h = state.hero;
    const limit = HALF_WIDTH - TUNING.heroMargin;
    h.hurtMs = countDown(h.hurtMs);
    h.padMs = countDown(h.padMs);
    if (h.travelMs > 0) {
      h.travelMs = countDown(h.travelMs);
      if (h.travelMs === 0) {
        h.floor = h.toFloor;
        h.x = clamp(h.x, -TUNING.landX, TUNING.landX);
        h.padMs = TUNING.padCooldownMs;
        events.push({ type: 'landed', floor: h.floor });
      }
      return;
    }
    if (h.controlMs > 0) {
      h.controlMs = countDown(h.controlMs);
      if (h.push !== 0) h.x = clamp(h.x + h.push * TUNING.knockSpeed * DT, -limit, limit);
      if (h.controlMs === 0) h.push = 0;
    } else if (state.move !== 0) {
      h.x = clamp(h.x + state.move * TUNING.heroSpeed * DT, -limit, limit);
      h.facing = state.move;
    }
    if (h.padMs === 0 && Math.abs(h.x) >= TUNING.padX && h.floor < FLOOR_COUNT - 1) {
      h.toFloor = h.floor + 1;
      h.travelMs = TUNING.riseMs;
      events.push({ type: 'bounced', toFloor: h.toFloor });
    }
  };

  const moveHazards = (): void => {
    const limit = HALF_WIDTH - TUNING.hazardMargin;
    for (const z of state.hazards) {
      if (z.stunMs > 0) {
        z.stunMs = countDown(z.stunMs);
        continue;
      }
      z.x += z.vx * DT;
      if (z.x > limit) {
        z.x = limit;
        z.vx = -Math.abs(z.vx);
      } else if (z.x < -limit) {
        z.x = -limit;
        z.vx = Math.abs(z.vx);
      }
    }
  };

  const hazardHits = (events: LibraryEvent[]): void => {
    const h = state.hero;
    if (h.travelMs > 0 || h.hurtMs > 0) return;
    const hit = state.hazards.find((z) => z.stunMs === 0 && z.floor === h.floor && Math.abs(z.x - h.x) < TUNING.hitRange);
    if (!hit) return;
    const away = h.x === hit.x ? -h.facing : Math.sign(h.x - hit.x);
    h.hurtMs = TUNING.hurtMs;
    h.controlMs = TUNING.knockMs;
    h.push = away;
    hit.vx = -away * Math.abs(hit.vx);
    events.push({ type: 'heroHit', by: hit.kind, hazardId: hit.id });
    loseCourage(events);
  };

  // ------------------------------------------------------------ the simulation

  // The first room is set up at creation (the view reads the state before the first tick); its
  // `roomStarted` event comes with the first tick. A visit with no rooms is over before it starts.
  const pending: LibraryEvent[] = [];
  if (shift.length === 0) state.phase = 'complete';
  else startRoom(pending);

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase !== 'playing') return [];
      const events: LibraryEvent[] = [];
      if (command.type === 'move') {
        const dir = Number.isFinite(command.dir) ? command.dir : 0;
        state.move = dir > 0.3 ? 1 : dir < -0.3 ? -1 : 0;
      } else if (command.type === 'drop') {
        const h = state.hero;
        if (h.travelMs === 0 && h.controlMs === 0 && h.floor > 0) {
          h.toFloor = h.floor - 1;
          h.travelMs = TUNING.dropMs;
          events.push({ type: 'dropped', toFloor: h.toFloor });
        }
      } else if (command.type === 'open') {
        openDoor(events);
      }
      return events;
    },
    tick() {
      if (state.phase !== 'playing') return [];
      const events = pending.splice(0);
      state.timeMs += STEP_MS;
      moveHero(events);
      moveHazards();
      hazardHits(events);
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
