/**
 * Dungeon Liberator 3D rules core: state, commands, and events (section 6 of
 * docs/game-dungeon-liberator-3d.md). The view reads the state every frame (positions, the line,
 * the gate) and animates from the events; every event carries ids, never references.
 * Positions are meters on the room floor: `x` to the right, `z` toward the camera.
 */

// ---------------------------------------------------------------- content kinds

/** Villager models of the vault pack, in the order of the seeded list. */
export const VILLAGER_KINDS = ['villager', 'farmer', 'innkeeper', 'druid', 'guard'] as const;

export type VillagerKind = (typeof VILLAGER_KINDS)[number];

// ---------------------------------------------------------------- state

/** One room of the shift: a sentence and its reading record. */
export interface RoomSentence {
  /** The sentence id from the story (the evidence `itemId`). */
  id: string;
  /** The room id: `room-1`, `room-2`, ... */
  roomId: string;
  /** The sentence as the student reads it. */
  text: string;
  /** The words in sentence order; punctuation stays attached. */
  words: string[];
  translation?: string;
  /** Zero-based story paragraph the sentence comes from, when known. */
  paragraph?: number;
  /** Villagers touched out of order in this room (reading attempts beyond the first). */
  refusals: number;
  /** True once the Knight touched any villager of this room (freed or refused). */
  started: boolean;
  /** True once the Knight led the whole line through the gate. */
  cleared: boolean;
}

export interface Knight {
  x: number;
  z: number;
  /** Heading in degrees: 0 faces +Z (the camera), 90 faces +X. */
  facing: number;
  /** Milliseconds left without control after a skeleton bump (0 = in control). */
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
  /** The villager's spot: where it stands before it is freed and runs back to after a scatter. */
  homeX: number;
  homeZ: number;
  /** True while the villager walks in the line behind the Knight. */
  following: boolean;
  /** Milliseconds left of the step-back after a touch out of order (0 = none). */
  refusedMs: number;
  /** True while the villager runs back to its spot (after a scatter or a refusal); not touchable. */
  returning: boolean;
  /** True while the Knight overlaps the villager; a touch counts only when this turns true. */
  contact: boolean;
}

export interface Skeleton {
  id: string;
  x: number;
  z: number;
  /** Velocity in meters per second. */
  vx: number;
  vz: number;
}

export interface DungeonLiberatorState {
  phase: 'playing' | 'complete';
  helper: boolean;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  /** The shift: every room in order. */
  shift: RoomSentence[];
  /** The index of the current room in `shift` (zero-based). */
  room: number;
  /** The number of rooms of the shift (`shift.length`). */
  rooms: number;
  knight: Knight;
  villagers: Villager[];
  /** Villager ids in the line, in sentence order. */
  line: string[];
  /** The index of the next word to free. */
  next: number;
  skeletons: Skeleton[];
  /** True when the whole sentence follows the Knight; the gate glows and lets the line out. */
  gateOpen: boolean;
  /** The held steer command (a direction of length 0 to 1). */
  steer: { x: number; z: number };
  /** Milliseconds left after a scatter during which a touch out of order is ignored. */
  graceMs: number;
  /** The Knight's recent path, newest first (the line follows it). */
  path: { x: number; z: number }[];
  /** Villagers freed in the shift (right touches), and rooms cleared. */
  freed: number;
  roomsCleared: number;
}

// ---------------------------------------------------------------- commands

export type DungeonLiberatorCommand =
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

export interface SkeletonSpawn {
  id: string;
  x: number;
  z: number;
}

export type ScatterCause = 'skeleton-line' | 'skeleton-knight';

export type DungeonLiberatorEvent =
  | {
      type: 'roomStarted';
      roomId: string;
      sentenceId: string;
      words: string[];
      villagers: VillagerSpawn[];
      skeletons: SkeletonSpawn[];
    }
  /** The villager joins the line. */
  | { type: 'villagerFreed'; id: string; index: number }
  /** Out of order; the villager steps back for 1.5 s. Counts a reading attempt. */
  | { type: 'villagerRefused'; id: string }
  /** These villagers run back to their spots. Not a reading error. */
  | { type: 'lineScattered'; ids: string[]; by: ScatterCause }
  /** The Knight is pushed back, 0.8 s without control. */
  | { type: 'knightBumped'; skeletonId: string }
  | { type: 'gateOpened'; roomId: string }
  | { type: 'roomCleared'; roomId: string; sentenceId: string }
  | { type: 'shiftComplete'; rooms: number };

export type DungeonLiberatorEventType = DungeonLiberatorEvent['type'];

/** Every event type the core emits; there is no game over. */
export const DUNGEON_LIBERATOR_EVENT_TYPES: readonly DungeonLiberatorEventType[] = [
  'roomStarted',
  'villagerFreed',
  'villagerRefused',
  'lineScattered',
  'knightBumped',
  'gateOpened',
  'roomCleared',
  'shiftComplete',
];
