/**
 * The Dungeon Liberator 3D simulation: a real-time `Simulation` on the fixed step. Rules from
 * sections 2, 3, and 6 of docs/game-dungeon-liberator-3d.md: the Knight walks a room, frees the
 * villagers in the order of the sentence (the right one joins the line behind the Knight; one
 * out of order steps back for 1.5 s), skeletons patrol and bounce off the walls (a skeleton on
 * the line scatters it from that villager; a skeleton on the Knight pushes the Knight back and
 * scatters the whole line), the gate opens when the whole sentence follows, and the room is
 * cleared when the Knight reaches the open gate. No lives, no defeat.
 */
import {
  STEP_MS,
  bouncePatroller,
  circlesTouch,
  clampToRect,
  createRng,
  directionTo,
  distance,
  followLeader,
  headingOf,
  moveToward,
  recordPath,
  spreadPoints,
  stepMover,
  velocityAwayFrom,
  type Rng,
  type Rect,
  type Simulation,
  type Vec2,
} from '@reading-advantage/advantage-play-kit-3d/sim';
import { shiftOf, villagerKindsOf, type DungeonLiberatorInput } from './content.js';
import type {
  DungeonLiberatorCommand,
  DungeonLiberatorEvent,
  DungeonLiberatorState,
  RoomSentence,
  ScatterCause,
  Skeleton,
  Villager,
} from './types.js';

/** The room floor in meters; the gate is in the far wall. */
export const ROOM: Rect = { minX: -5.5, maxX: 5.5, minZ: -4.5, maxZ: 4.5 };
export const GATE: Vec2 = { x: 0, z: -4.5 };
export const KNIGHT_START: Vec2 = { x: 0, z: 3.5 };

/** Every tuning number of the game (section 6 of the design). */
export const TUNING = {
  /** The most rooms in one shift. */
  maxRooms: 5,
  knightSpeed: 3.2,
  skeletonSpeed: 1.4,
  /** Skeleton speed grows this much per room, at most this much in all. */
  skeletonSpeedUpPerRoom: 0.1,
  skeletonSpeedUpMax: 0.3,
  /** Skeletons: 1 in Helper mode, 2 otherwise, +1 from the third room, at most 3. */
  skeletonsHelper: 1,
  skeletons: 2,
  skeletonsFromRoom: 2,
  skeletonsMax: 3,
  knightRadius: 0.4,
  villagerRadius: 0.35,
  skeletonRadius: 0.45,
  /** The gate counts as reached inside this radius of `GATE`. */
  gateRadius: 0.9,
  lineSpacing: 0.8,
  /** Villagers keep this far apart, from the Knight's start, and from the gate. */
  villagerSpacing: 1.6,
  villagerKeepOutKnight: 2,
  villagerKeepOutGate: 1.5,
  /** Skeletons start this far from the Knight and apart. */
  skeletonKeepOutKnight: 3.5,
  skeletonSpacing: 2,
  /** Spread margin from the walls. */
  spawnMargin: 0.8,
  /** A refused villager steps back this far and stays back this long. */
  refusedMs: 1500,
  refusedStepBack: 0.7,
  /** A bumped Knight is pushed at this speed for this long. */
  bumpedMs: 800,
  bumpSpeed: 2,
  /** Villagers catch up with the line and run home at these speeds. */
  followSpeed: 4.2,
  returnSpeed: 3,
  /** A villager counts as home inside this distance of its spot. */
  homeEpsilon: 0.05,
  /** After a scatter, a touch out of order is ignored for this long (the target just changed). */
  scatterGraceMs: 1000,
  /** The path records a point every this many meters. */
  pathGap: 0.05,
} as const;

export interface DungeonLiberatorOptions {
  seed: number;
  helper: boolean;
}

export type DungeonLiberatorSimulation = Simulation<DungeonLiberatorState, DungeonLiberatorCommand, DungeonLiberatorEvent>;

/** Skeletons in room `room` (zero-based). */
export function skeletonCountFor(room: number, helper: boolean): number {
  const base = helper ? TUNING.skeletonsHelper : TUNING.skeletons;
  return Math.min(TUNING.skeletonsMax, base + (room >= TUNING.skeletonsFromRoom ? 1 : 0));
}

/** Skeleton speed in room `room` (zero-based), in meters per second. */
export function skeletonSpeedFor(room: number): number {
  return TUNING.skeletonSpeed * (1 + Math.min(TUNING.skeletonSpeedUpMax, TUNING.skeletonSpeedUpPerRoom * room));
}

/** The villager the Knight must free next, or null when the line is complete. */
export function nextVillagerOf(state: DungeonLiberatorState): Villager | null {
  return state.villagers.find((v) => v.index === state.next) ?? null;
}

const DT = STEP_MS / 1000;

/** One step off a timer; float dust below a microsecond counts as zero. */
const countDown = (ms: number): number => (ms - STEP_MS < 1e-6 ? 0 : ms - STEP_MS);

export function createDungeonLiberator(input: DungeonLiberatorInput, options: DungeonLiberatorOptions): DungeonLiberatorSimulation {
  const rng: Rng = createRng(options.seed);
  const shift = shiftOf(input, rng, TUNING.maxRooms);

  const state: DungeonLiberatorState = {
    phase: 'playing',
    helper: options.helper,
    timeMs: 0,
    shift,
    room: 0,
    rooms: shift.length,
    knight: { x: KNIGHT_START.x, z: KNIGHT_START.z, facing: 180, bumpedMs: 0, pushX: 0, pushZ: 0 },
    villagers: [],
    line: [],
    next: 0,
    skeletons: [],
    gateOpen: false,
    steer: { x: 0, z: 0 },
    graceMs: 0,
    path: [{ x: KNIGHT_START.x, z: KNIGHT_START.z }],
    freed: 0,
    roomsCleared: 0,
  };

  const current = (): RoomSentence => state.shift[state.room]!;

  // ------------------------------------------------------------ rooms

  const startRoom = (events: DungeonLiberatorEvent[]): void => {
    const room = current();
    state.knight = { x: KNIGHT_START.x, z: KNIGHT_START.z, facing: 180, bumpedMs: 0, pushX: 0, pushZ: 0 };
    state.path = [{ x: KNIGHT_START.x, z: KNIGHT_START.z }];
    state.line = [];
    state.next = 0;
    state.gateOpen = false;
    state.graceMs = 0;
    const spots = spreadPoints(rng, room.words.length, ROOM, {
      minDistance: TUNING.villagerSpacing,
      keepOut: [
        { ...KNIGHT_START, r: TUNING.villagerKeepOutKnight },
        { ...GATE, r: TUNING.villagerKeepOutGate },
      ],
      margin: TUNING.spawnMargin,
    });
    const kinds = villagerKindsOf(rng, room.words.length);
    state.villagers = room.words.map((word, index) => ({
      id: `v${index + 1}`,
      word,
      index,
      kind: kinds[index]!,
      x: spots[index]!.x,
      z: spots[index]!.z,
      homeX: spots[index]!.x,
      homeZ: spots[index]!.z,
      following: false,
      refusedMs: 0,
      returning: false,
      contact: false,
    }));
    const count = skeletonCountFor(state.room, state.helper);
    const speed = skeletonSpeedFor(state.room);
    const starts = spreadPoints(rng, count, ROOM, {
      minDistance: TUNING.skeletonSpacing,
      keepOut: [{ ...KNIGHT_START, r: TUNING.skeletonKeepOutKnight }],
      margin: TUNING.spawnMargin,
    });
    state.skeletons = starts.map((p, i) => {
      const angle = rng.next() * Math.PI * 2;
      return { id: `k${i + 1}`, x: p.x, z: p.z, vx: Math.cos(angle) * speed, vz: Math.sin(angle) * speed };
    });
    events.push({
      type: 'roomStarted',
      roomId: room.roomId,
      sentenceId: room.id,
      words: room.words.slice(),
      villagers: state.villagers.map(({ id, word, index, kind, x, z }) => ({ id, word, index, kind, x, z })),
      skeletons: state.skeletons.map(({ id, x, z }) => ({ id, x, z })),
    });
  };

  const clearRoom = (events: DungeonLiberatorEvent[]): void => {
    const room = current();
    room.cleared = true;
    state.roomsCleared += 1;
    events.push({ type: 'roomCleared', roomId: room.roomId, sentenceId: room.id });
    if (state.room + 1 >= state.rooms) {
      state.phase = 'complete';
      state.gateOpen = false;
      events.push({ type: 'shiftComplete', rooms: state.roomsCleared });
      return;
    }
    state.room += 1;
    startRoom(events);
  };

  // ------------------------------------------------------------ the line

  /** Villagers from line position `from` on run back to their spots. */
  const scatter = (from: number, by: ScatterCause, events: DungeonLiberatorEvent[]): void => {
    const ids = state.line.slice(from);
    if (ids.length === 0) return;
    for (const id of ids) {
      const v = state.villagers.find((x) => x.id === id)!;
      v.following = false;
      v.returning = true;
    }
    state.line = state.line.slice(0, from);
    state.next = state.line.length;
    state.graceMs = TUNING.scatterGraceMs;
    events.push({ type: 'lineScattered', ids, by });
  };

  const touchable = (v: Villager): boolean => !v.following && v.refusedMs <= 0 && !v.returning;

  /**
   * A touch counts when the Knight *enters* contact with a touchable villager while in control.
   * A Knight pushed by a skeleton, or one standing on a spot a villager returns to, touches no
   * one: the Knight must step off and come back.
   */
  const touchVillagers = (events: DungeonLiberatorEvent[]): void => {
    const room = current();
    const k = state.knight;
    let handled = false;
    for (const v of state.villagers) {
      const touching = circlesTouch(k, TUNING.knightRadius, v, TUNING.villagerRadius);
      const entered = touching && !v.contact;
      v.contact = touching;
      if (handled || !entered || !touchable(v) || k.bumpedMs > 0) continue;
      // Right after a scatter the next word changed under the Knight's feet: a villager out of
      // order is passed, not refused (a skeleton is never a reading error).
      if (v.index !== state.next && state.graceMs > 0) continue;
      handled = true; // one touch per step
      room.started = true;
      if (v.index === state.next) {
        v.following = true;
        state.line.push(v.id);
        state.next += 1;
        state.freed += 1;
        events.push({ type: 'villagerFreed', id: v.id, index: v.index });
        if (state.next >= room.words.length) {
          state.gateOpen = true;
          events.push({ type: 'gateOpened', roomId: room.roomId });
        }
      } else {
        room.refusals += 1;
        v.refusedMs = TUNING.refusedMs;
        const away = velocityAwayFrom(v, k, TUNING.refusedStepBack, { x: 0, z: -1 });
        const back = clampToRect({ x: v.x + away.x, z: v.z + away.z }, ROOM, TUNING.villagerRadius);
        v.x = back.x;
        v.z = back.z;
        events.push({ type: 'villagerRefused', id: v.id });
      }
    }
  };

  // ------------------------------------------------------------ movement

  const moveKnight = (): void => {
    const k = state.knight;
    state.graceMs = countDown(state.graceMs);
    let pos: Vec2;
    if (k.bumpedMs > 0) {
      k.bumpedMs = countDown(k.bumpedMs);
      pos = stepMover(k, { x: k.pushX, z: k.pushZ }, TUNING.bumpSpeed, DT);
    } else {
      pos = stepMover(k, state.steer, TUNING.knightSpeed, DT);
      if (Math.hypot(state.steer.x, state.steer.z) > 1e-6) k.facing = headingOf(state.steer);
    }
    const clamped = clampToRect(pos, ROOM, TUNING.knightRadius);
    k.x = clamped.x;
    k.z = clamped.z;
    state.path = recordPath(state.path, k, TUNING.pathGap, (TUNING.maxRooms + 3) * TUNING.lineSpacing + 2);
  };

  const moveVillagers = (): void => {
    const slots = followLeader(state.path, TUNING.lineSpacing, state.line.length);
    for (const v of state.villagers) {
      if (v.following) {
        const slot = slots[state.line.indexOf(v.id)]!;
        const p = moveToward(v, slot, TUNING.followSpeed * DT);
        v.x = p.x;
        v.z = p.z;
        continue;
      }
      if (v.refusedMs > 0) {
        v.refusedMs = countDown(v.refusedMs);
        if (v.refusedMs === 0) v.returning = distance(v, { x: v.homeX, z: v.homeZ }) > TUNING.homeEpsilon;
        continue;
      }
      if (v.returning) {
        const p = moveToward(v, { x: v.homeX, z: v.homeZ }, TUNING.returnSpeed * DT);
        v.x = p.x;
        v.z = p.z;
        if (distance(v, { x: v.homeX, z: v.homeZ }) <= TUNING.homeEpsilon) v.returning = false;
      }
    }
  };

  const moveSkeletons = (): void => {
    for (const s of state.skeletons) Object.assign(s, bouncePatroller(s, ROOM, TUNING.skeletonRadius, DT));
  };

  // ------------------------------------------------------------ skeleton contacts

  const skeletonContacts = (events: DungeonLiberatorEvent[]): void => {
    // With the gate open, the light keeps the skeletons off: no bumps, no scatters.
    if (state.gateOpen) return;
    const k = state.knight;
    if (k.bumpedMs <= 0) {
      const hit = state.skeletons.find((s) => circlesTouch(k, TUNING.knightRadius, s, TUNING.skeletonRadius));
      if (hit) {
        const push = directionTo(hit, k);
        const dir = Math.hypot(push.x, push.z) < 1e-9 ? { x: 0, z: 1 } : push;
        k.bumpedMs = TUNING.bumpedMs;
        k.pushX = dir.x;
        k.pushZ = dir.z;
        const speed = Math.hypot(hit.vx, hit.vz);
        const away = velocityAwayFrom(hit, k, speed, { x: 0, z: -1 });
        hit.vx = away.x;
        hit.vz = away.z;
        events.push({ type: 'knightBumped', skeletonId: hit.id });
        scatter(0, 'skeleton-knight', events);
        return;
      }
    }
    let earliest = -1;
    for (let i = 0; i < state.line.length; i++) {
      const v = state.villagers.find((x) => x.id === state.line[i])!;
      if (state.skeletons.some((s) => circlesTouch(v, TUNING.villagerRadius, s, TUNING.skeletonRadius))) {
        earliest = i;
        break;
      }
    }
    if (earliest >= 0) scatter(earliest, 'skeleton-line', events);
  };

  const reachGate = (events: DungeonLiberatorEvent[]): void => {
    if (!state.gateOpen) return;
    if (!circlesTouch(state.knight, TUNING.knightRadius, GATE, TUNING.gateRadius)) return;
    clearRoom(events);
  };

  // ------------------------------------------------------------ the simulation

  // The first room is set up at creation (the view reads the state before the first tick); its
  // `roomStarted` event comes with the first tick. A shift with no rooms is over before it starts.
  const pending: DungeonLiberatorEvent[] = [];
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
      moveKnight();
      moveVillagers();
      moveSkeletons();
      touchVillagers(events);
      skeletonContacts(events);
      reachGate(events);
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
