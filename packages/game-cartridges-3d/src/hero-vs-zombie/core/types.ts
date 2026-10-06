/**
 * Hero vs. Zombie 3D rules core: state, commands, and events (section 6 of
 * docs/game-hero-vs-zombie-3d.md). The view reads the state every frame (positions, the orbs,
 * the charges) and animates from the events; every event carries ids, never references.
 * Positions are meters on the churchyard floor: `x` to the right, `z` toward the camera.
 */

// ---------------------------------------------------------------- content

/** One story word of the night and what the student did with it. */
export interface NightWord {
  /** The word id, equal to the story vocabulary id (the evidence `itemId`). */
  id: string;
  /** The English term on the banner ("Find: brave"). */
  term: string;
  /** The meaning on the right orb. */
  translation: string;
  /** Orb touches for this word, right and wrong. */
  attempts: number;
  /** True once the student took the right orb for this word. */
  solved: boolean;
  /** True once a missed word was queued a second time; a word returns at most once. */
  returned: boolean;
}

/** One round: a word on the banner and its orbs in the churchyard. */
export interface Round {
  /** `r1`, `r2`, ... */
  id: string;
  /** The word id (`NightWord.id`). */
  itemId: string;
  term: string;
}

// ---------------------------------------------------------------- state

export interface Orb {
  /** Unique in the night: `r1-o1`, `r1-o2`, ... */
  id: string;
  /** The meaning the orb shows. */
  text: string;
  /** True for the orb with the round word's meaning. */
  correct: boolean;
  /** The id of the word whose meaning the orb carries (the round word, or a decoy's owner). */
  wordId: string;
  x: number;
  z: number;
  /** True while the hero overlaps the orb; a touch counts only when this turns true. */
  contact: boolean;
}

export interface Hero {
  x: number;
  z: number;
  /** Heading in degrees: 0 faces +Z (the camera), 90 faces +X. */
  facing: number;
  /** Milliseconds left without control after a zombie bump (0 = in control). */
  bumpedMs: number;
  /** The push direction of the bump (a unit vector) while `bumpedMs` runs. */
  pushX: number;
  pushZ: number;
}

export interface Zombie {
  /** Stable for the night: `z1`, `z2`, ... (a zombie keeps its id when it rises again). */
  id: string;
  x: number;
  z: number;
  /** Milliseconds left on the ground after a Blast (0 = up). It rises again at a grave after. */
  downMs: number;
  /** True while the zombie climbs out of a grave; it walks and bumps once `riseMs` is over. */
  rising: boolean;
  /** Milliseconds left of the rise (0 when `rising` is false). */
  riseMs: number;
  /** Milliseconds left of the attack pause after a bump (the zombie stands still). */
  attackMs: number;
  /** The grave the zombie last rose from (`GRAVES[].id`). */
  graveId: string;
}

export type HeroVsZombiePhase = 'night' | 'dawn' | 'complete';

export interface HeroVsZombieState {
  phase: HeroVsZombiePhase;
  helper: boolean;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  /** The night's words, in the seeded first-pass order. */
  words: NightWord[];
  /** Word ids of rounds not started yet; a missed word joins the end once. */
  queue: string[];
  /** The current round, or null after the last word is found. */
  round: Round | null;
  /** Zero-based index of the current round (the last one after the night). */
  roundIndex: number;
  /** Rounds known so far: every word once plus the returns so far. */
  total: number;
  /** Rounds won (right orbs taken). */
  rounds: number;
  /** Orbs per round: 3 in Helper mode, 4 otherwise. */
  orbCount: number;
  hero: Hero;
  /** The orbs of the current round; empty after the last word is found. */
  orbs: Orb[];
  zombies: Zombie[];
  /** Blast charges, 0 to `TUNING.chargesMax`. */
  charges: number;
  coins: number;
  /** Zombies knocked down by Blasts in the night. */
  knocked: number;
  /** Zombie bumps in the night (never a reading error). */
  bumps: number;
  /** The held steer command (a direction of length 0 to 1). */
  steer: { x: number; z: number };
  /** Milliseconds left of the dawn (0 outside the dawn phase). */
  dawnMs: number;
}

// ---------------------------------------------------------------- commands

export type HeroVsZombieCommand =
  /** The move direction, length 0 to 1 (0 = stop); it holds until the next steer. */
  | { type: 'steer'; x: number; z: number }
  /** Use one Blast charge (ignored with no charge). */
  | { type: 'blast' };

// ---------------------------------------------------------------- events

export interface OrbSpawn {
  id: string;
  text: string;
  x: number;
  z: number;
}

export type HeroVsZombieEvent =
  | { type: 'roundStarted'; roundId: string; itemId: string; term: string; orbs: OrbSpawn[] }
  /** The right orb: it bursts, a charge is added, coins are paid. */
  | { type: 'orbTaken'; id: string; correct: true; roundId: string; itemId: string; firstTry: boolean; charges: number; coins: number }
  /** A wrong orb; an attempt counts and `orbsMoved` follows. */
  | { type: 'orbWrong'; id: string; roundId: string; itemId: string }
  /** The orbs of the round moved to new spots (the same ids and texts). */
  | { type: 'orbsMoved'; orbs: { id: string; x: number; z: number }[] }
  /** A missed word is queued once more. */
  | { type: 'wordReturns'; itemId: string }
  /** A zombie climbs out of a grave (at the start, when the horde grows, or again after a Blast). */
  | { type: 'zombieRose'; zombieId: string; x: number; z: number }
  /** A zombie reached the hero: the hero is pushed back, 0.8 s without control. Never a reading error. */
  | { type: 'heroBumped'; zombieId: string }
  /** A Blast: one charge used, every zombie within the radius knocked down. */
  | { type: 'blast'; charges: number; knocked: string[]; coins: number }
  /** The last word is found; the zombies crumble. */
  | { type: 'dawn' }
  | { type: 'nightComplete'; rounds: number; coins: number };

export type HeroVsZombieEventType = HeroVsZombieEvent['type'];

/** Every event type the core emits; there is no game over. */
export const HERO_VS_ZOMBIE_EVENT_TYPES: readonly HeroVsZombieEventType[] = [
  'roundStarted',
  'orbTaken',
  'orbWrong',
  'orbsMoved',
  'wordReturns',
  'zombieRose',
  'heroBumped',
  'blast',
  'dawn',
  'nightComplete',
];
