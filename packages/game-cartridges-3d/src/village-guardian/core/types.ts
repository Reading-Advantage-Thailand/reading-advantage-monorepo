/**
 * Village Guardian 3D rules core: state, commands, and events (section 6 of
 * docs/game-village-guardian-3d.md). The view reads the state every frame (positions, the line,
 * the barn door) and animates from the events; every event carries ids, never references.
 * Positions are meters on the village green: `x` to the right, `z` toward the camera.
 */

// ---------------------------------------------------------------- content kinds

/** Villager models of the folk pack, in the order of the seeded list. */
export const VILLAGER_KINDS = ['villager', 'farmer', 'innkeeper', 'druid', 'guard'] as const;

export type VillagerKind = (typeof VILLAGER_KINDS)[number];

/** Threat models: bandits wander; goblins also creep toward the guardian when it comes near. */
export const THREAT_KINDS = ['bandit', 'goblin-warrior'] as const;

export type ThreatKind = (typeof THREAT_KINDS)[number];

// ---------------------------------------------------------------- state

/** One village of the watch: a sentence and its reading record. */
export interface VillageSentence {
  /** The sentence id from the story (the evidence `itemId`). */
  id: string;
  /** The village id: `village-1`, `village-2`, ... */
  villageId: string;
  /** The sentence as the student reads it. */
  text: string;
  /** The words in sentence order; punctuation stays attached. */
  words: string[];
  translation?: string;
  /** Zero-based story paragraph the sentence comes from, when known. */
  paragraph?: number;
  /** Villagers called out of order in this village (reading attempts beyond the first). */
  refusals: number;
  /** True once the guardian called any villager of this village (right or wrong). */
  started: boolean;
  /** True once the guardian led the whole line to the barn. */
  cleared: boolean;
}

export interface Guardian {
  x: number;
  z: number;
  /** Heading in degrees: 0 faces +Z (the camera), 90 faces +X. */
  facing: number;
  /** Milliseconds left without control after a threat bump (0 = in control). */
  bumpedMs: number;
  /** The push direction of the bump (a unit vector) while `bumpedMs` runs. */
  pushX: number;
  pushZ: number;
}

export interface Villager {
  id: string;
  word: string;
  /** The word's position in the sentence (also its position in the line). */
  index: number;
  kind: VillagerKind;
  x: number;
  z: number;
  /** The villager's spot: where it stands before it is called and runs back to after a scare. */
  homeX: number;
  homeZ: number;
  /** True while the villager walks in the line behind the guardian. */
  following: boolean;
  /** Milliseconds left of the hide after a call out of order (0 = none). */
  refusedMs: number;
  /** True while the villager runs back to its spot (after a scare or a hide); not touchable. */
  returning: boolean;
  /** True while the guardian overlaps the villager; a call counts only when this turns true. */
  contact: boolean;
}

export interface Threat {
  id: string;
  kind: ThreatKind;
  x: number;
  z: number;
  /** Velocity in meters per second. */
  vx: number;
  vz: number;
  /** Milliseconds left after a bump during which a goblin does not creep toward the guardian. */
  restMs: number;
}

export interface VillageGuardianState {
  phase: 'playing' | 'complete';
  helper: boolean;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  /** The watch: every village in order. */
  shift: VillageSentence[];
  /** The index of the current village in `shift` (zero-based). */
  village: number;
  /** The number of villages of the watch (`shift.length`). */
  villages: number;
  guardian: Guardian;
  villagers: Villager[];
  /** Villager ids in the line, in sentence order. */
  line: string[];
  /** The index of the next word to call. */
  next: number;
  threats: Threat[];
  /** True when the whole sentence follows the guardian; the barn door glows and takes the line in. */
  barnOpen: boolean;
  /** The held steer command (a direction of length 0 to 1). */
  steer: { x: number; z: number };
  /** Milliseconds left after a scare during which a call out of order is ignored. */
  graceMs: number;
  /** The guardian's recent path, newest first (the line follows it). */
  path: { x: number; z: number }[];
  /** Villagers called in the watch (right calls), and villages cleared. */
  rescued: number;
  villagesCleared: number;
}

// ---------------------------------------------------------------- commands

export type VillageGuardianCommand =
  /** The walk direction, length 0 to 1 (0 = stop); it holds until the next steer. */
  { type: 'steer'; x: number; z: number };

// ---------------------------------------------------------------- events

export interface VillagerSpawn {
  id: string;
  word: string;
  index: number;
  kind: VillagerKind;
  x: number;
  z: number;
}

export interface ThreatSpawn {
  id: string;
  kind: ThreatKind;
  x: number;
  z: number;
}

export type ScareCause = 'threat-line' | 'threat-guardian';

export type VillageGuardianEvent =
  | {
      type: 'villageStarted';
      villageId: string;
      sentenceId: string;
      words: string[];
      villagers: VillagerSpawn[];
      threats: ThreatSpawn[];
    }
  /** The villager joins the line. */
  | { type: 'villagerJoined'; id: string; index: number }
  /** Out of order; the villager hides for 1.5 s. Counts a reading attempt. */
  | { type: 'villagerRefused'; id: string }
  /** These villagers run back to their spots. Not a reading error. */
  | { type: 'lineScared'; ids: string[]; by: ScareCause }
  /** The guardian is pushed back, 0.8 s without control; the threat backs off. */
  | { type: 'guardianBumped'; threatId: string }
  | { type: 'barnOpened'; villageId: string }
  | { type: 'villageSaved'; villageId: string; sentenceId: string }
  | { type: 'watchComplete'; villages: number };

export type VillageGuardianEventType = VillageGuardianEvent['type'];

/** Every event type the core emits; there is no game over. */
export const VILLAGE_GUARDIAN_EVENT_TYPES: readonly VillageGuardianEventType[] = [
  'villageStarted',
  'villagerJoined',
  'villagerRefused',
  'lineScared',
  'guardianBumped',
  'barnOpened',
  'villageSaved',
  'watchComplete',
];
