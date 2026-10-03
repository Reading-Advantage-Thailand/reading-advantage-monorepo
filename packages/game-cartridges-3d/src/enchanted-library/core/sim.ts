/**
 * The Enchanted Library 3D simulation: a real-time `Simulation` on the fixed step. The hero walks
 * the reading hall. Each round shows a Thai prompt and a few books with English words; touching
 * the book with the matching word collects it (the round is cleared), and touching another book
 * is a reading attempt that costs courage. Spirits drift through the hall: a spirit that touches
 * the hero costs courage and knocks the hero back, unless the shield is up (3 charges; a right
 * book gives one back). When courage runs out the team rests and returns to the middle with full
 * courage. No timer decides a result and there is no game over.
 */
import {
  STEP_MS,
  bouncePatroller,
  clampToRect,
  createRng,
  directionTo,
  distance,
  headingOf,
  moveToward,
  spreadPoints,
  type Rect,
  type Rng,
  type Simulation,
  type Vec2,
} from '@reading-advantage/advantage-play-kit-3d/sim';
import { decoysOf, visitOf, type LibraryInput } from './content.js';
import type { Book, Hero, LibraryCommand, LibraryEvent, LibraryRound, LibraryState, Spirit } from './types.js';

/** The reading hall in meters and the place where the team starts (and returns after a rest). */
export const HALL: Rect = { minX: -5.6, maxX: 5.6, minZ: -3.8, maxZ: 3.8 };
export const HERO_START: Vec2 = { x: 0, z: 2.6 };

/** Where spirits come in (the hall corners and the middle of the side walls). */
export const SPIRIT_DOORS: readonly Vec2[] = [
  { x: -5, z: -3.2 },
  { x: 5, z: -3.2 },
  { x: -5, z: 0 },
  { x: 5, z: 0 },
];

/** Every tuning number of the game. */
export const TUNING = {
  /** The most rounds in one visit. */
  maxRounds: 8,
  heroSpeed: 3.6,
  heroRadius: 0.4,
  bookRadius: 0.5,
  spiritRadius: 0.4,
  spiritSpeed: 1.5,
  maxSpirits: 3,
  helperSpirits: 2,
  /** The first spirit comes after firstSpawnMs, then one every spawnMs while there is room. */
  firstSpawnMs: 4000,
  spawnMs: 6000,
  /** Spirits do not come this close to the hero. */
  spawnKeepOut: 3,
  courage: 5,
  maxCharges: 3,
  shieldMs: 1800,
  /** A raised shield turns spirits away within this distance of the hero. */
  shieldRange: 1.5,
  /** A spirit that was turned away does not bounce again for this long. */
  calmMs: 500,
  hurtMs: 1500,
  knockMs: 300,
  knockSpeed: 3.5,
  /** After a rest the hero cannot act for restControlMs and cannot be hit for restHurtMs. */
  restControlMs: 1000,
  restHurtMs: 1500,
  /** Books keep this far apart, this far from the walls, and this far from the hero. */
  bookSpacing: 2.8,
  bookMargin: 1,
  bookKeepOut: 2,
} as const;

export type EnchantedLibrarySimulation = Simulation<LibraryState, LibraryCommand, LibraryEvent>;

export interface EnchantedLibraryOptions {
  seed: number;
  helper: boolean;
}

const DT = STEP_MS / 1000;
const countDown = (ms: number): number => (ms - STEP_MS < 1e-6 ? 0 : ms - STEP_MS);

/** The right book of the round, or null when it is done. */
export function targetBookOf(state: LibraryState): Book | null {
  return state.books.find((b) => b.correct) ?? null;
}

/** The distance at which the hero touches a book. */
export const TOUCH = TUNING.heroRadius + TUNING.bookRadius;

export function createEnchantedLibrary(input: LibraryInput, options: EnchantedLibraryOptions): EnchantedLibrarySimulation {
  const rng: Rng = createRng(options.seed);
  const rounds = visitOf(input, rng, TUNING.maxRounds);

  const state: LibraryState = {
    phase: 'playing',
    helper: options.helper,
    timeMs: 0,
    rounds,
    round: 0,
    roundCount: rounds.length,
    hero: {
      x: HERO_START.x,
      z: HERO_START.z,
      facing: 180,
      steerX: 0,
      steerZ: 0,
      goal: null,
      hurtMs: 0,
      controlMs: 0,
      pushX: 0,
      pushZ: 0,
      charges: TUNING.maxCharges,
      shieldMs: 0,
    },
    books: [],
    spirits: [],
    spawnMs: TUNING.firstSpawnMs,
    courage: TUNING.courage,
    maxCourage: TUNING.courage,
    collected: 0,
    roundsCleared: 0,
    rests: 0,
    hits: 0,
    spiritSerial: 0,
  };

  const current = (): LibraryRound => state.rounds[state.round]!;
  const maxSpirits = (): number => (state.helper ? TUNING.helperSpirits : TUNING.maxSpirits);

  // ------------------------------------------------------------ rounds

  const startRound = (events: LibraryEvent[]): void => {
    const round = current();
    const decoys = decoysOf(input, round.id, rng);
    const terms = [round.term, ...decoys];
    const spots = spreadPoints(rng, terms.length, HALL, {
      minDistance: TUNING.bookSpacing,
      margin: TUNING.bookMargin,
      keepOut: [{ x: state.hero.x, z: state.hero.z, r: TUNING.bookKeepOut }],
    });
    // Which book stands where is seeded: the right book is not always first.
    const order = rng.shuffle(terms.map((_, i) => i));
    state.books = order.map((termIndex, slot) => ({
      id: `book-${slot + 1}`,
      term: terms[termIndex]!,
      correct: termIndex === 0,
      x: spots[slot]!.x,
      z: spots[slot]!.z,
      spent: false,
    }));
    state.hero.goal = null;
    events.push({
      type: 'roundStarted',
      roundId: round.roundId,
      itemId: round.id,
      term: round.term,
      translation: round.translation,
      books: state.books.map(({ id, term, x, z }) => ({ id, term, x, z })),
    });
  };

  const clearRound = (events: LibraryEvent[]): void => {
    const round = current();
    round.cleared = true;
    state.roundsCleared += 1;
    events.push({ type: 'roundCleared', roundId: round.roundId, itemId: round.id });
    if (state.round + 1 >= state.roundCount) {
      state.phase = 'complete';
      state.spirits = [];
      state.books = [];
      state.hero.steerX = 0;
      state.hero.steerZ = 0;
      state.hero.goal = null;
      events.push({ type: 'visitComplete', rounds: state.roundsCleared });
      return;
    }
    state.round += 1;
    startRound(events);
  };

  // ------------------------------------------------------------ courage

  const rest = (events: LibraryEvent[]): void => {
    const h = state.hero;
    state.rests += 1;
    state.courage = state.maxCourage;
    state.spirits = [];
    state.spawnMs = TUNING.spawnMs;
    Object.assign(h, {
      x: HERO_START.x,
      z: HERO_START.z,
      goal: null,
      steerX: 0,
      steerZ: 0,
      pushX: 0,
      pushZ: 0,
      shieldMs: 0,
      charges: TUNING.maxCharges,
      controlMs: TUNING.restControlMs,
      hurtMs: TUNING.restHurtMs,
    });
    events.push({ type: 'teamRested', courage: state.courage });
  };

  const loseCourage = (events: LibraryEvent[]): void => {
    state.courage = Math.max(0, state.courage - 1);
    events.push({ type: 'courageChanged', courage: state.courage });
    if (state.courage === 0) rest(events);
  };

  // ------------------------------------------------------------ the hero

  const moveHero = (): void => {
    const h: Hero = state.hero;
    h.hurtMs = countDown(h.hurtMs);
    if (h.shieldMs > 0) h.shieldMs = countDown(h.shieldMs);
    let next: Vec2 = { x: h.x, z: h.z };
    if (h.controlMs > 0) {
      h.controlMs = countDown(h.controlMs);
      next = { x: h.x + h.pushX * TUNING.knockSpeed * DT, z: h.z + h.pushZ * TUNING.knockSpeed * DT };
      if (h.controlMs === 0) {
        h.pushX = 0;
        h.pushZ = 0;
      }
    } else {
      const len = Math.hypot(h.steerX, h.steerZ);
      if (len > 0.05) {
        const k = (len > 1 ? 1 / len : 1) * TUNING.heroSpeed * DT;
        next = { x: h.x + h.steerX * k, z: h.z + h.steerZ * k };
        h.goal = null;
      } else if (h.goal) {
        next = moveToward(h, h.goal, TUNING.heroSpeed * DT);
        if (distance(next, h.goal) < 1e-6) h.goal = null;
      }
      if (distance(next, h) > 1e-6) h.facing = headingOf(directionTo(h, next));
    }
    const clamped = clampToRect(next, HALL, TUNING.heroRadius);
    h.x = clamped.x;
    h.z = clamped.z;
  };

  const touchBooks = (events: LibraryEvent[]): void => {
    const h = state.hero;
    if (h.controlMs > 0) return;
    const book = state.books.find((b) => !b.spent && distance(b, h) <= TOUCH);
    if (!book) return;
    const round = current();
    round.started = true;
    if (book.correct) {
      state.collected += 1;
      h.charges = Math.min(TUNING.maxCharges, h.charges + 1);
      events.push({ type: 'bookCollected', id: book.id, itemId: round.id });
      clearRound(events);
      return;
    }
    book.spent = true;
    round.wrong += 1;
    events.push({ type: 'bookWrong', id: book.id });
    loseCourage(events);
  };

  // ------------------------------------------------------------ spirits

  const spawnSpirits = (events: LibraryEvent[]): void => {
    state.spawnMs = countDown(state.spawnMs);
    if (state.spawnMs > 0 || state.spirits.length >= maxSpirits()) return;
    state.spawnMs = TUNING.spawnMs;
    const far = SPIRIT_DOORS.filter((d) => distance(d, state.hero) >= TUNING.spawnKeepOut);
    const door = rng.pick(far.length > 0 ? far : SPIRIT_DOORS);
    const dir = directionTo(door, state.hero);
    const spirit: Spirit = {
      id: `spirit-${state.spiritSerial + 1}`,
      x: door.x,
      z: door.z,
      vx: dir.x * TUNING.spiritSpeed,
      vz: dir.z * TUNING.spiritSpeed,
      calmMs: 0,
    };
    state.spiritSerial += 1;
    state.spirits.push(spirit);
    events.push({ type: 'spiritSpawned', spirit: { id: spirit.id, x: spirit.x, z: spirit.z } });
  };

  const moveSpirits = (): void => {
    state.spirits = state.spirits.map((s) => {
      const moved = bouncePatroller({ x: s.x, z: s.z, vx: s.vx, vz: s.vz }, HALL, TUNING.spiritRadius, DT);
      return { id: s.id, x: moved.x, z: moved.z, vx: moved.vx, vz: moved.vz, calmMs: countDown(s.calmMs) };
    });
  };

  const awayFrom = (s: Spirit, h: Hero): Vec2 => {
    const d = directionTo(h, s);
    return d.x === 0 && d.z === 0 ? { x: 0, z: -1 } : d;
  };

  const spiritContacts = (events: LibraryEvent[]): void => {
    const h = state.hero;
    for (const s of state.spirits) {
      const d = distance(s, h);
      if (h.shieldMs > 0) {
        if (d <= TUNING.shieldRange && s.calmMs === 0) {
          const away = awayFrom(s, h);
          s.vx = away.x * TUNING.spiritSpeed;
          s.vz = away.z * TUNING.spiritSpeed;
          s.calmMs = TUNING.calmMs;
          events.push({ type: 'shieldBlocked', spiritId: s.id });
        }
        continue;
      }
      if (h.hurtMs > 0 || d > TUNING.heroRadius + TUNING.spiritRadius) continue;
      const away = awayFrom(s, h);
      h.hurtMs = TUNING.hurtMs;
      h.controlMs = TUNING.knockMs;
      h.pushX = -away.x;
      h.pushZ = -away.z;
      h.goal = null;
      s.vx = away.x * TUNING.spiritSpeed;
      s.vz = away.z * TUNING.spiritSpeed;
      state.hits += 1;
      events.push({ type: 'heroHit', spiritId: s.id });
      loseCourage(events);
      return;
    }
  };

  // ------------------------------------------------------------ the simulation

  // The first round is set up at creation (the view reads the state before the first tick); its
  // `roundStarted` event comes with the first tick. A visit with no rounds is over before it starts.
  const pending: LibraryEvent[] = [];
  if (rounds.length === 0) state.phase = 'complete';
  else startRound(pending);

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase !== 'playing') return [];
      const events: LibraryEvent[] = [];
      const h = state.hero;
      if (command.type === 'steer') {
        const x = Number.isFinite(command.x) ? command.x : 0;
        const z = Number.isFinite(command.z) ? command.z : 0;
        h.steerX = x;
        h.steerZ = z;
      } else if (command.type === 'goto') {
        const book = command.bookId === undefined ? undefined : state.books.find((b) => b.id === command.bookId);
        const point = book ?? (command.x !== undefined && command.z !== undefined && Number.isFinite(command.x) && Number.isFinite(command.z) ? { x: command.x, z: command.z } : null);
        if (!point) return [];
        h.steerX = 0;
        h.steerZ = 0;
        h.goal = clampToRect({ x: point.x, z: point.z }, HALL, TUNING.heroRadius);
      } else if (command.type === 'shield') {
        if (h.charges <= 0 || h.shieldMs > 0 || h.controlMs > 0) return [];
        h.charges -= 1;
        h.shieldMs = TUNING.shieldMs;
        events.push({ type: 'shieldUp', charges: h.charges });
      }
      return events;
    },
    tick() {
      if (state.phase !== 'playing') return [];
      const events = pending.splice(0);
      state.timeMs += STEP_MS;
      const shielded = state.hero.shieldMs > 0;
      moveHero();
      if (shielded && state.hero.shieldMs === 0) events.push({ type: 'shieldDown' });
      touchBooks(events);
      if (state.phase !== 'playing') return events;
      spawnSpirits(events);
      moveSpirits();
      spiritContacts(events);
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
