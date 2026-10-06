/**
 * The Hero vs. Zombie 3D simulation: a real-time `Simulation` on the fixed step. Rules from
 * sections 2, 3, and 6 of docs/game-hero-vs-zombie-3d.md: a fixed night of rounds (every story
 * word once, each missed word once more), light orbs with the meaning and decoys, the right orb
 * charges the Blast and pays coins, a wrong orb reshuffles the orbs and counts an attempt,
 * zombies rise from the graves on the edges and chase the hero, a zombie that reaches the hero
 * pushes the hero back (no damage), a Blast knocks down every zombie within the radius and they
 * rise again at a grave, and after the last word the sun rises. No HP, no game over.
 */
import {
  STEP_MS,
  circlesTouch,
  clampToRect,
  createRng,
  directionTo,
  distance,
  headingOf,
  moveToward,
  separateCircles,
  spreadPoints,
  stepMover,
  type Rng,
  type Rect,
  type Simulation,
  type Vec2,
} from '@reading-advantage/advantage-play-kit-3d/sim';
import { nightWordsOf, orbsFor, type HeroVsZombieInput } from './content.js';
import type {
  HeroVsZombieCommand,
  HeroVsZombieEvent,
  HeroVsZombieState,
  NightWord,
  Orb,
  Zombie,
} from './types.js';

/** The churchyard floor in meters. */
export const YARD: Rect = { minX: -6, maxX: 6, minZ: -5, maxZ: 5 };
export const HERO_START: Vec2 = { x: 0, z: 0 };

/** A grave: a zombie spawn point just inside an edge of the yard. */
export interface Grave extends Vec2 {
  id: string;
}

/** The graves along the far edge and both sides (the view's sarcophagi stand just outside them). */
export const GRAVES: readonly Grave[] = [
  { id: 'g-n1', x: -4.5, z: -4.5 },
  { id: 'g-n2', x: -1.5, z: -4.5 },
  { id: 'g-n3', x: 1.5, z: -4.5 },
  { id: 'g-n4', x: 4.5, z: -4.5 },
  { id: 'g-w1', x: -5.5, z: -2.5 },
  { id: 'g-w2', x: -5.5, z: 0.5 },
  { id: 'g-w3', x: -5.5, z: 3.5 },
  { id: 'g-e1', x: 5.5, z: -2.5 },
  { id: 'g-e2', x: 5.5, z: 0.5 },
  { id: 'g-e3', x: 5.5, z: 3.5 },
];

/** Every tuning number of the game (section 6 of the design). */
export const TUNING = {
  /** The most words in one night. */
  maxWords: 10,
  /** Orbs per round, and in Helper mode. */
  orbs: 4,
  orbsHelper: 3,
  /** Speeds in meters per second. */
  heroSpeed: 3.4,
  zombieSpeed: 1.1,
  zombieSpeedHelper: 0.9,
  /** Zombies: 2 in Helper mode, 3 otherwise, +1 every 3 rounds, at most 5. */
  zombies: 3,
  zombiesHelper: 2,
  zombiesEveryRounds: 3,
  zombiesMax: 5,
  heroRadius: 0.4,
  zombieRadius: 0.4,
  orbRadius: 0.45,
  /** Orbs keep this far apart, from the hero, and from the graves; and this far from the walls. */
  orbSpacing: 2.2,
  orbKeepOutHero: 2.5,
  orbKeepOutGrave: 1,
  spawnMargin: 0.8,
  /** A Blast knocks down every zombie within this radius of the hero, for this long. */
  blastRadius: 4.5,
  knockedDownMs: 3000,
  /** A zombie climbs out of a grave for this long before it walks; graves this far from the hero. */
  riseMs: 1200,
  graveKeepOutHero: 3.5,
  /** Blast charges: the most held, and the first round starts with this many. */
  chargesMax: 3,
  chargesAtStart: 1,
  /** Coins per first-try word, per later right orb, and per zombie knocked down. */
  coinsFirstTry: 10,
  coinsLater: 5,
  coinsPerKnocked: 3,
  /** A bumped hero is pushed at this speed for this long; the zombie stands still for this long. */
  bumpedMs: 800,
  bumpSpeed: 2,
  zombieAttackMs: 1000,
  /** The dawn lasts this long before the night is complete. */
  dawnMs: 2500,
} as const;

export interface HeroVsZombieOptions {
  seed: number;
  helper: boolean;
}

export type HeroVsZombieSimulation = Simulation<HeroVsZombieState, HeroVsZombieCommand, HeroVsZombieEvent>;

/** Orbs per round for a mode. */
export function orbCountFor(helper: boolean): number {
  return helper ? TUNING.orbsHelper : TUNING.orbs;
}

/** Zombies in round `roundIndex` (zero-based). */
export function zombieCountFor(roundIndex: number, helper: boolean): number {
  const base = helper ? TUNING.zombiesHelper : TUNING.zombies;
  return Math.min(TUNING.zombiesMax, base + Math.floor(Math.max(0, roundIndex) / TUNING.zombiesEveryRounds));
}

/** Zombie walk speed for a mode, in meters per second. */
export function zombieSpeedFor(helper: boolean): number {
  return helper ? TUNING.zombieSpeedHelper : TUNING.zombieSpeed;
}

/** The orb of the current round with the word's meaning, or null without a round. */
export function correctOrbOf(state: HeroVsZombieState): Orb | null {
  return state.orbs.find((o) => o.correct) ?? null;
}

/** True for a zombie on its feet and out of its grave: it walks, bumps, and blocks the way. */
export function isWalking(zombie: Zombie): boolean {
  return zombie.downMs <= 0 && !zombie.rising;
}

const wordById = (state: HeroVsZombieState, id: string): NightWord => {
  const word = state.words.find((w) => w.id === id);
  if (!word) throw new Error(`hero vs zombie: unknown word ${id}`);
  return word;
};

const DT = STEP_MS / 1000;

/** One step off a timer; float dust below a microsecond counts as zero. */
const countDown = (ms: number): number => (ms - STEP_MS < 1e-6 ? 0 : ms - STEP_MS);

export function createHeroVsZombie(input: HeroVsZombieInput, options: HeroVsZombieOptions): HeroVsZombieSimulation {
  const rng: Rng = createRng(options.seed);
  const words = nightWordsOf(input, rng, TUNING.maxWords);
  const zombieSpeed = zombieSpeedFor(options.helper);

  const state: HeroVsZombieState = {
    phase: 'night',
    helper: options.helper,
    timeMs: 0,
    words,
    queue: words.map((w) => w.id),
    round: null,
    roundIndex: 0,
    total: words.length,
    rounds: 0,
    orbCount: orbCountFor(options.helper),
    hero: { x: HERO_START.x, z: HERO_START.z, facing: 180, bumpedMs: 0, pushX: 0, pushZ: 0 },
    orbs: [],
    zombies: [],
    charges: TUNING.chargesAtStart,
    coins: 0,
    knocked: 0,
    bumps: 0,
    steer: { x: 0, z: 0 },
    dawnMs: 0,
  };

  let started = 0;

  // ------------------------------------------------------------ zombies

  /** Puts the zombie at a seeded grave away from the hero (and from other rising zombies), rising. */
  const rise = (zombie: Zombie, events: HeroVsZombieEvent[]): void => {
    const taken = new Set(state.zombies.filter((z) => z !== zombie && z.rising).map((z) => z.graveId));
    let graves = GRAVES.filter((g) => !taken.has(g.id) && distance(g, state.hero) >= TUNING.graveKeepOutHero);
    if (graves.length === 0) graves = GRAVES.filter((g) => !taken.has(g.id));
    if (graves.length === 0) graves = GRAVES.slice();
    const grave = rng.pick(graves);
    zombie.x = grave.x;
    zombie.z = grave.z;
    zombie.graveId = grave.id;
    zombie.downMs = 0;
    zombie.rising = true;
    zombie.riseMs = TUNING.riseMs;
    zombie.attackMs = 0;
    events.push({ type: 'zombieRose', zombieId: zombie.id, x: zombie.x, z: zombie.z });
  };

  /** Raises new zombies until the horde has the count of the current round. */
  const growHorde = (events: HeroVsZombieEvent[]): void => {
    const want = zombieCountFor(state.roundIndex, state.helper);
    while (state.zombies.length < want) {
      const zombie: Zombie = {
        id: `z${state.zombies.length + 1}`,
        x: 0,
        z: 0,
        downMs: 0,
        rising: false,
        riseMs: 0,
        attackMs: 0,
        graveId: '',
      };
      state.zombies.push(zombie);
      rise(zombie, events);
    }
  };

  // ------------------------------------------------------------ orbs and rounds

  /** Spreads the round's orbs over the yard: apart, away from the hero and the graves. */
  const placeOrbs = (): void => {
    const spots = spreadPoints(rng, state.orbs.length, YARD, {
      minDistance: TUNING.orbSpacing,
      keepOut: [
        { x: state.hero.x, z: state.hero.z, r: TUNING.orbKeepOutHero },
        ...GRAVES.map((g) => ({ x: g.x, z: g.z, r: TUNING.orbKeepOutGrave })),
      ],
      margin: TUNING.spawnMargin,
    });
    state.orbs.forEach((orb, i) => {
      orb.x = spots[i]!.x;
      orb.z = spots[i]!.z;
      orb.contact = false;
    });
  };

  const startRound = (events: HeroVsZombieEvent[]): void => {
    const word = wordById(state, state.queue.shift()!);
    started += 1;
    const id = `r${started}`;
    state.round = { id, itemId: word.id, term: word.term };
    state.roundIndex = started - 1;
    state.orbs = orbsFor(word, state.words, state.orbCount, rng).map((o, i) => ({
      id: `${id}-o${i + 1}`,
      text: o.text,
      correct: o.correct,
      wordId: o.wordId,
      x: 0,
      z: 0,
      contact: false,
    }));
    placeOrbs();
    growHorde(events);
    events.push({
      type: 'roundStarted',
      roundId: id,
      itemId: word.id,
      term: word.term,
      orbs: state.orbs.map(({ id: orbId, text, x, z }) => ({ id: orbId, text, x, z })),
    });
  };

  /** The right orb was taken: the next round, or the dawn after the last word. */
  const endRound = (events: HeroVsZombieEvent[]): void => {
    if (state.queue.length > 0) {
      startRound(events);
      return;
    }
    state.round = null;
    state.orbs = [];
    state.phase = 'dawn';
    state.dawnMs = TUNING.dawnMs;
    events.push({ type: 'dawn' });
  };

  const takeOrb = (orb: Orb, events: HeroVsZombieEvent[]): void => {
    const round = state.round!;
    const word = wordById(state, round.itemId);
    word.attempts += 1;
    if (orb.correct) {
      word.solved = true;
      const firstTry = word.attempts === 1;
      state.coins += firstTry ? TUNING.coinsFirstTry : TUNING.coinsLater;
      state.charges = Math.min(TUNING.chargesMax, state.charges + 1);
      state.rounds += 1;
      events.push({
        type: 'orbTaken',
        id: orb.id,
        correct: true,
        roundId: round.id,
        itemId: word.id,
        firstTry,
        charges: state.charges,
        coins: state.coins,
      });
      endRound(events);
      return;
    }
    events.push({ type: 'orbWrong', id: orb.id, roundId: round.id, itemId: word.id });
    if (!word.returned) {
      word.returned = true;
      state.queue.push(word.id);
      state.total += 1;
      events.push({ type: 'wordReturns', itemId: word.id });
    }
    placeOrbs();
    events.push({ type: 'orbsMoved', orbs: state.orbs.map(({ id, x, z }) => ({ id, x, z })) });
  };

  /**
   * A touch counts when the hero *enters* contact with an orb while in control. A hero pushed by
   * a zombie onto an orb touches nothing: the hero must step off and come back.
   */
  const touchOrbs = (events: HeroVsZombieEvent[]): void => {
    if (state.phase !== 'night' || !state.round) return;
    const hero = state.hero;
    let handled = false;
    for (const orb of state.orbs) {
      const touching = circlesTouch(hero, TUNING.heroRadius, orb, TUNING.orbRadius);
      const entered = touching && !orb.contact;
      orb.contact = touching;
      if (handled || !entered || hero.bumpedMs > 0) continue;
      handled = true; // one touch per step; the orbs move after it
      takeOrb(orb, events);
    }
  };

  // ------------------------------------------------------------ movement

  const moveHero = (): void => {
    const hero = state.hero;
    let pos: Vec2;
    if (hero.bumpedMs > 0) {
      hero.bumpedMs = countDown(hero.bumpedMs);
      pos = stepMover(hero, { x: hero.pushX, z: hero.pushZ }, TUNING.bumpSpeed, DT);
    } else {
      pos = stepMover(hero, state.steer, TUNING.heroSpeed, DT);
      if (Math.hypot(state.steer.x, state.steer.z) > 1e-6) hero.facing = headingOf(state.steer);
    }
    const clamped = clampToRect(pos, YARD, TUNING.heroRadius);
    hero.x = clamped.x;
    hero.z = clamped.z;
  };

  /** Timers run, down zombies rise again, walkers chase the hero and keep apart. */
  const moveZombies = (events: HeroVsZombieEvent[]): void => {
    const walkers: Zombie[] = [];
    for (const z of state.zombies) {
      if (z.downMs > 0) {
        z.downMs = countDown(z.downMs);
        if (z.downMs === 0) rise(z, events);
        continue;
      }
      if (z.rising) {
        z.riseMs = countDown(z.riseMs);
        if (z.riseMs === 0) z.rising = false;
        continue;
      }
      if (z.attackMs > 0) {
        z.attackMs = countDown(z.attackMs);
        walkers.push(z);
        continue;
      }
      const p = moveToward(z, state.hero, zombieSpeed * DT);
      z.x = p.x;
      z.z = p.z;
      walkers.push(z);
    }
    const apart = separateCircles(walkers, 2 * TUNING.zombieRadius);
    walkers.forEach((z, i) => {
      const clamped = clampToRect(apart[i]!, YARD, TUNING.zombieRadius);
      z.x = clamped.x;
      z.z = clamped.z;
    });
  };

  // ------------------------------------------------------------ zombie contacts

  const zombieContacts = (events: HeroVsZombieEvent[]): void => {
    if (state.phase !== 'night') return;
    const hero = state.hero;
    if (hero.bumpedMs > 0) return;
    const hit = state.zombies.find((z) => isWalking(z) && circlesTouch(hero, TUNING.heroRadius, z, TUNING.zombieRadius));
    if (!hit) return;
    const push = directionTo(hit, hero);
    const dir = Math.hypot(push.x, push.z) < 1e-9 ? { x: 0, z: 1 } : push;
    hero.bumpedMs = TUNING.bumpedMs;
    hero.pushX = dir.x;
    hero.pushZ = dir.z;
    hit.attackMs = TUNING.zombieAttackMs;
    state.bumps += 1;
    events.push({ type: 'heroBumped', zombieId: hit.id });
  };

  // ------------------------------------------------------------ commands

  const steer = (x: number, z: number): void => {
    const sx = Number.isFinite(x) ? x : 0;
    const sz = Number.isFinite(z) ? z : 0;
    const len = Math.hypot(sx, sz);
    const scale = len > 1 ? 1 / len : 1;
    state.steer = { x: sx * scale, z: sz * scale };
  };

  const blast = (): HeroVsZombieEvent[] => {
    if (state.phase !== 'night' || state.charges <= 0) return [];
    state.charges -= 1;
    const knocked: string[] = [];
    for (const z of state.zombies) {
      if (z.downMs > 0 || distance(state.hero, z) > TUNING.blastRadius) continue;
      z.downMs = TUNING.knockedDownMs;
      z.rising = false;
      z.riseMs = 0;
      z.attackMs = 0;
      knocked.push(z.id);
    }
    state.knocked += knocked.length;
    state.coins += knocked.length * TUNING.coinsPerKnocked;
    return [{ type: 'blast', charges: state.charges, knocked, coins: state.coins }];
  };

  // ------------------------------------------------------------ the simulation

  // The first round and the first zombies are set up at creation (the view reads the state before
  // the first tick); their events come with the first tick. A night with no words is over before
  // it starts.
  const pending: HeroVsZombieEvent[] = [];
  if (words.length === 0) state.phase = 'complete';
  else startRound(pending);

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase === 'complete') return [];
      switch (command.type) {
        case 'steer':
          steer(command.x, command.z);
          return [];
        case 'blast':
          return blast();
        default:
          return [];
      }
    },
    tick() {
      if (state.phase === 'complete') return [];
      const events = pending.splice(0);
      state.timeMs += STEP_MS;
      moveHero();
      if (state.phase === 'night') {
        moveZombies(events);
        touchOrbs(events);
        zombieContacts(events);
      } else {
        state.dawnMs = countDown(state.dawnMs);
        if (state.dawnMs === 0) {
          state.phase = 'complete';
          events.push({ type: 'nightComplete', rounds: state.rounds, coins: state.coins });
        }
      }
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
