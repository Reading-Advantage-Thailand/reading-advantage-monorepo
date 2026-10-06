/**
 * The Village Guardian 3D simulation: a real-time `Simulation` on the fixed step. Rules from
 * sections 2, 3, and 6 of docs/game-village-guardian-3d.md: the guardian walks the village green
 * and calls the villagers in the order of the sentence (the right one joins the line behind the
 * guardian; one called out of order hides for 1.5 s). Bandits patrol and bounce off the fences;
 * goblins also creep toward a guardian who comes near. A threat on the line scares it from that
 * villager on; a threat on the guardian pushes it back and scares the whole line. The barn door
 * opens when the whole sentence follows, and the village is saved when the guardian leads the
 * line to the open door. No lives, no defeat, no timer: a setback sends the team home to rest.
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
import { watchOf, villagerKindsOf, type VillageGuardianInput } from './content.js';
import type {
  ScareCause,
  Threat,
  ThreatKind,
  Villager,
  VillageGuardianCommand,
  VillageGuardianEvent,
  VillageGuardianState,
  VillageSentence,
} from './types.js';

/** The village green in meters; the barn door is in the far fence line. */
export const GREEN: Rect = { minX: -5.5, maxX: 5.5, minZ: -4.5, maxZ: 4.5 };
export const BARN_DOOR: Vec2 = { x: 0, z: -4.5 };
export const GUARDIAN_START: Vec2 = { x: 0, z: 3.5 };

/** Every tuning number of the game (section 6 of the design). */
export const TUNING = {
  /** The most villages in one watch. */
  maxVillages: 5,
  guardianSpeed: 3.2,
  threatSpeed: 1.3,
  /** Threat speed grows this much per village, at most this much in all. */
  threatSpeedUpPerVillage: 0.1,
  threatSpeedUpMax: 0.3,
  /** Threats: 1 in the first village, +1 per village, at most 3 (Helper mode: +1 every second village, at most 2). */
  threatsMax: 3,
  threatsHelperMax: 2,
  /** Goblins (the creeping threats): one from the third village (Helper mode: one from the fourth). */
  goblinsFromVillage: 2,
  goblinsHelperFromVillage: 3,
  /** A goblin creeps toward a guardian this near, turning this share of its heading per step. */
  creepRange: 3,
  creepTurn: 0.03,
  /** After a bump a threat rests (no creeping) for this long. */
  threatRestMs: 2500,
  guardianRadius: 0.4,
  villagerRadius: 0.35,
  threatRadius: 0.45,
  /** The barn door counts as reached inside this radius of `BARN_DOOR`. */
  doorRadius: 0.9,
  lineSpacing: 0.8,
  /** Villagers keep this far apart, from the guardian's start, and from the barn door. */
  villagerSpacing: 1.6,
  villagerKeepOutGuardian: 2,
  villagerKeepOutDoor: 1.5,
  /** Threats start this far from the guardian and apart. */
  threatKeepOutGuardian: 3.5,
  threatSpacing: 2,
  /** Spread margin from the fences. */
  spawnMargin: 0.8,
  /** A villager called out of order hides this far back for this long. */
  refusedMs: 1500,
  refusedStepBack: 0.7,
  /** A bumped guardian is pushed at this speed for this long. */
  bumpedMs: 800,
  bumpSpeed: 2,
  /** Villagers catch up with the line and run home at these speeds. */
  followSpeed: 4.2,
  returnSpeed: 3,
  /** A villager counts as home inside this distance of its spot. */
  homeEpsilon: 0.05,
  /** After a scare, a call out of order is ignored for this long (the target just changed). */
  scareGraceMs: 1000,
  /** The path records a point every this many meters. */
  pathGap: 0.05,
} as const;

export interface VillageGuardianOptions {
  seed: number;
  helper: boolean;
}

export type VillageGuardianSimulation = Simulation<VillageGuardianState, VillageGuardianCommand, VillageGuardianEvent>;

/** Threats in village `village` (zero-based). */
export function threatCountFor(village: number, helper: boolean): number {
  return helper
    ? Math.min(TUNING.threatsHelperMax, 1 + Math.floor(village / 2))
    : Math.min(TUNING.threatsMax, 1 + village);
}

/** Goblins among the threats of village `village` (zero-based); the rest are bandits. */
export function goblinCountFor(village: number, helper: boolean): number {
  const count = threatCountFor(village, helper);
  const goblins = helper
    ? village >= TUNING.goblinsHelperFromVillage ? 1 : 0
    : village >= TUNING.goblinsFromVillage ? 1 : 0;
  return Math.min(count - 1 > 0 ? count - 1 : 0, goblins);
}

/** Threat speed in village `village` (zero-based), in meters per second. */
export function threatSpeedFor(village: number): number {
  return TUNING.threatSpeed * (1 + Math.min(TUNING.threatSpeedUpMax, TUNING.threatSpeedUpPerVillage * village));
}

/** The villager the guardian must call next, or null when the line is complete. */
export function nextVillagerOf(state: VillageGuardianState): Villager | null {
  return state.villagers.find((v) => v.index === state.next) ?? null;
}

const DT = STEP_MS / 1000;

/** One step off a timer; float dust below a microsecond counts as zero. */
const countDown = (ms: number): number => (ms - STEP_MS < 1e-6 ? 0 : ms - STEP_MS);

export function createVillageGuardian(input: VillageGuardianInput, options: VillageGuardianOptions): VillageGuardianSimulation {
  const rng: Rng = createRng(options.seed);
  const shift = watchOf(input, rng, TUNING.maxVillages);

  const state: VillageGuardianState = {
    phase: 'playing',
    helper: options.helper,
    timeMs: 0,
    shift,
    village: 0,
    villages: shift.length,
    guardian: { x: GUARDIAN_START.x, z: GUARDIAN_START.z, facing: 180, bumpedMs: 0, pushX: 0, pushZ: 0 },
    villagers: [],
    line: [],
    next: 0,
    threats: [],
    barnOpen: false,
    steer: { x: 0, z: 0 },
    graceMs: 0,
    path: [{ x: GUARDIAN_START.x, z: GUARDIAN_START.z }],
    rescued: 0,
    villagesCleared: 0,
  };

  const current = (): VillageSentence => state.shift[state.village]!;

  // ------------------------------------------------------------ villages

  const startVillage = (events: VillageGuardianEvent[]): void => {
    const village = current();
    state.guardian = { x: GUARDIAN_START.x, z: GUARDIAN_START.z, facing: 180, bumpedMs: 0, pushX: 0, pushZ: 0 };
    state.path = [{ x: GUARDIAN_START.x, z: GUARDIAN_START.z }];
    state.line = [];
    state.next = 0;
    state.barnOpen = false;
    state.graceMs = 0;
    const spots = spreadPoints(rng, village.words.length, GREEN, {
      minDistance: TUNING.villagerSpacing,
      keepOut: [
        { ...GUARDIAN_START, r: TUNING.villagerKeepOutGuardian },
        { ...BARN_DOOR, r: TUNING.villagerKeepOutDoor },
      ],
      margin: TUNING.spawnMargin,
    });
    const kinds = villagerKindsOf(rng, village.words.length);
    state.villagers = village.words.map((word, index) => ({
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
    const count = threatCountFor(state.village, state.helper);
    const goblins = goblinCountFor(state.village, state.helper);
    const speed = threatSpeedFor(state.village);
    const starts = spreadPoints(rng, count, GREEN, {
      minDistance: TUNING.threatSpacing,
      keepOut: [{ ...GUARDIAN_START, r: TUNING.threatKeepOutGuardian }],
      margin: TUNING.spawnMargin,
    });
    state.threats = starts.map((p, i) => {
      const angle = rng.next() * Math.PI * 2;
      const kind: ThreatKind = i >= count - goblins ? 'goblin-warrior' : 'bandit';
      return { id: `t${i + 1}`, kind, x: p.x, z: p.z, vx: Math.cos(angle) * speed, vz: Math.sin(angle) * speed, restMs: 0 };
    });
    events.push({
      type: 'villageStarted',
      villageId: village.villageId,
      sentenceId: village.id,
      words: village.words.slice(),
      villagers: state.villagers.map(({ id, word, index, kind, x, z }) => ({ id, word, index, kind, x, z })),
      threats: state.threats.map(({ id, kind, x, z }) => ({ id, kind, x, z })),
    });
  };

  const clearVillage = (events: VillageGuardianEvent[]): void => {
    const village = current();
    village.cleared = true;
    state.villagesCleared += 1;
    events.push({ type: 'villageSaved', villageId: village.villageId, sentenceId: village.id });
    if (state.village + 1 >= state.villages) {
      state.phase = 'complete';
      state.barnOpen = false;
      events.push({ type: 'watchComplete', villages: state.villagesCleared });
      return;
    }
    state.village += 1;
    startVillage(events);
  };

  // ------------------------------------------------------------ the line

  /** Villagers from line position `from` on run back to their spots. */
  const scare = (from: number, by: ScareCause, events: VillageGuardianEvent[]): void => {
    const ids = state.line.slice(from);
    if (ids.length === 0) return;
    for (const id of ids) {
      const v = state.villagers.find((x) => x.id === id)!;
      v.following = false;
      v.returning = true;
    }
    state.line = state.line.slice(0, from);
    state.next = state.line.length;
    state.graceMs = TUNING.scareGraceMs;
    events.push({ type: 'lineScared', ids, by });
  };

  const touchable = (v: Villager): boolean => !v.following && v.refusedMs <= 0 && !v.returning;

  /**
   * A call counts when the guardian *enters* contact with a touchable villager while in control.
   * A guardian pushed by a threat, or one standing on a spot a villager returns to, calls no one:
   * the guardian must step off and come back.
   */
  const callVillagers = (events: VillageGuardianEvent[]): void => {
    const village = current();
    const g = state.guardian;
    let handled = false;
    for (const v of state.villagers) {
      const touching = circlesTouch(g, TUNING.guardianRadius, v, TUNING.villagerRadius);
      const entered = touching && !v.contact;
      // A second villager entered in the same step waits for the next step (its contact stays unset).
      if (handled && entered) continue;
      v.contact = touching;
      if (!entered || !touchable(v) || g.bumpedMs > 0) continue;
      // Right after a scare the next word changed under the guardian's feet: a villager out of
      // order is passed, not refused (a threat is never a reading error).
      if (v.index !== state.next && state.graceMs > 0) continue;
      handled = true; // one call per step
      village.started = true;
      if (v.index === state.next) {
        v.following = true;
        state.line.push(v.id);
        state.next += 1;
        state.rescued += 1;
        events.push({ type: 'villagerJoined', id: v.id, index: v.index });
        if (state.next >= village.words.length) {
          state.barnOpen = true;
          events.push({ type: 'barnOpened', villageId: village.villageId });
        }
      } else {
        village.refusals += 1;
        v.refusedMs = TUNING.refusedMs;
        const away = velocityAwayFrom(v, g, TUNING.refusedStepBack, { x: 0, z: -1 });
        const back = clampToRect({ x: v.x + away.x, z: v.z + away.z }, GREEN, TUNING.villagerRadius);
        v.x = back.x;
        v.z = back.z;
        events.push({ type: 'villagerRefused', id: v.id });
      }
    }
  };

  // ------------------------------------------------------------ movement

  const moveGuardian = (): void => {
    const g = state.guardian;
    state.graceMs = countDown(state.graceMs);
    let pos: Vec2;
    if (g.bumpedMs > 0) {
      g.bumpedMs = countDown(g.bumpedMs);
      pos = stepMover(g, { x: g.pushX, z: g.pushZ }, TUNING.bumpSpeed, DT);
    } else {
      pos = stepMover(g, state.steer, TUNING.guardianSpeed, DT);
      if (Math.hypot(state.steer.x, state.steer.z) > 1e-6) g.facing = headingOf(state.steer);
    }
    const clamped = clampToRect(pos, GREEN, TUNING.guardianRadius);
    g.x = clamped.x;
    g.z = clamped.z;
    state.path = recordPath(state.path, g, TUNING.pathGap, (TUNING.maxVillages + 3) * TUNING.lineSpacing + 2);
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

  const moveThreats = (): void => {
    const g = state.guardian;
    for (const t of state.threats) {
      t.restMs = countDown(t.restMs);
      // A goblin near the guardian turns its heading a little toward the guardian (the speed stays).
      // The open barn door keeps every threat off, and so does a guardian pushed back.
      if (t.kind === 'goblin-warrior' && Math.hypot(t.vx, t.vz) > 1e-9 && t.restMs === 0 && !state.barnOpen && g.bumpedMs <= 0 && distance(t, g) < TUNING.creepRange) {
        const speed = Math.hypot(t.vx, t.vz);
        const dir = directionTo(t, g);
        const nx = t.vx / speed * (1 - TUNING.creepTurn) + dir.x * TUNING.creepTurn;
        const nz = t.vz / speed * (1 - TUNING.creepTurn) + dir.z * TUNING.creepTurn;
        const len = Math.hypot(nx, nz);
        if (len > 1e-9) {
          t.vx = (nx / len) * speed;
          t.vz = (nz / len) * speed;
        }
      }
      Object.assign(t, bouncePatroller(t, GREEN, TUNING.threatRadius, DT));
    }
  };

  // ------------------------------------------------------------ threat contacts

  const threatContacts = (events: VillageGuardianEvent[]): void => {
    // With the barn door open, the lantern light keeps the threats off: no bumps, no scares.
    if (state.barnOpen) return;
    const g = state.guardian;
    if (g.bumpedMs <= 0) {
      const hit = state.threats.find((s) => circlesTouch(g, TUNING.guardianRadius, s, TUNING.threatRadius));
      if (hit) {
        const push = directionTo(hit, g);
        const dir = Math.hypot(push.x, push.z) < 1e-9 ? { x: 0, z: 1 } : push;
        g.bumpedMs = TUNING.bumpedMs;
        g.pushX = dir.x;
        g.pushZ = dir.z;
        const speed = Math.hypot(hit.vx, hit.vz);
        const away = velocityAwayFrom(hit, g, speed, { x: 0, z: -1 });
        hit.vx = away.x;
        hit.vz = away.z;
        hit.restMs = TUNING.threatRestMs;
        events.push({ type: 'guardianBumped', threatId: hit.id });
        scare(0, 'threat-guardian', events);
        return;
      }
    }
    let earliest = -1;
    for (let i = 0; i < state.line.length; i++) {
      const v = state.villagers.find((x) => x.id === state.line[i])!;
      if (state.threats.some((s) => circlesTouch(v, TUNING.villagerRadius, s, TUNING.threatRadius))) {
        earliest = i;
        break;
      }
    }
    if (earliest >= 0) scare(earliest, 'threat-line', events);
  };

  const reachBarn = (events: VillageGuardianEvent[]): void => {
    if (!state.barnOpen) return;
    if (!circlesTouch(state.guardian, TUNING.guardianRadius, BARN_DOOR, TUNING.doorRadius)) return;
    clearVillage(events);
  };

  // ------------------------------------------------------------ the simulation

  // The first village is set up at creation (the view reads the state before the first tick); its
  // `villageStarted` event comes with the first tick. A watch with no villages is over before it starts.
  const pending: VillageGuardianEvent[] = [];
  if (shift.length === 0) state.phase = 'complete';
  else startVillage(pending);

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
      moveGuardian();
      moveVillagers();
      moveThreats();
      callVillagers(events);
      threatContacts(events);
      reachBarn(events);
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
