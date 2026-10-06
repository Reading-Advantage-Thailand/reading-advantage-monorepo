/**
 * Shadow Gate Dungeon rules core: state, commands, and events (section 6 of
 * docs/game-shadow-gate-dungeon-3d.md). The view reads the state every frame (positions, the
 * crystals, the gate) and animates from the events; every event carries ids, never references.
 * Positions are meters on the dungeon floor: `x` to the right, `z` toward the camera.
 */

// ---------------------------------------------------------------- state

/** One room of the delve: a sentence and its reading record. */
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
  /** Wrong crystals touched in this room (reading attempts beyond the first). */
  refusals: number;
  /** True once the hero touched any crystal of this room (right or wrong). */
  started: boolean;
  /** True once the hero led the finished sentence through the gate. */
  cleared: boolean;
}

export interface Delver {
  x: number;
  z: number;
  /** Heading in degrees: 0 faces +Z (the camera), 90 faces +X. */
  facing: number;
  /** Milliseconds left without control after a shadow bump (0 = in control). */
  bumpedMs: number;
  /** The push direction of the bump (a unit vector) while `bumpedMs` runs. */
  pushX: number;
  pushZ: number;
}

/** A word crystal. Every crystal of a wave looks the same; only the word differs. */
export interface Crystal {
  id: string;
  /** The word on the crystal, without punctuation. */
  word: string;
  x: number;
  z: number;
  /** True while the hero overlaps the crystal; a touch counts only when this turns true. */
  contact: boolean;
}

export interface Shadow {
  id: string;
  x: number;
  z: number;
  /** Milliseconds left after a bump during which the shadow does not chase. */
  restMs: number;
}

export interface ShadowGateState {
  phase: 'playing' | 'complete';
  helper: boolean;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  /** The delve: every room in order. */
  shift: RoomSentence[];
  /** The index of the current room in `shift` (zero-based). */
  room: number;
  /** The number of rooms of the delve (`shift.length`). */
  rooms: number;
  hero: Delver;
  /** The crystals of the current wave (empty while the gate is open). */
  crystals: Crystal[];
  shadows: Shadow[];
  /** The index of the next word to collect; the words before it are built. */
  next: number;
  /** True when the whole sentence is built; the gate glows and takes the hero in. */
  gateOpen: boolean;
  /** The held steer command (a direction of length 0 to 1). */
  steer: { x: number; z: number };
  /** Right crystals taken in the delve, and rooms cleared. */
  collected: number;
  roomsCleared: number;
  /** The waves dealt in the current room (the crystal ids carry it). */
  wave: number;
}

// ---------------------------------------------------------------- commands

export type ShadowGateCommand =
  /** The walk direction, length 0 to 1 (0 = stop); it holds until the next steer. */
  { type: 'steer'; x: number; z: number };

// ---------------------------------------------------------------- events

export interface CrystalSpawn {
  id: string;
  word: string;
  x: number;
  z: number;
}

export interface ShadowSpawn {
  id: string;
  x: number;
  z: number;
}

/** Why a new wave of crystals appeared. */
export type WaveCause = 'start' | 'taken' | 'refused' | 'bumped';

export type ShadowGateEvent =
  | { type: 'roomStarted'; roomId: string; sentenceId: string; words: string[]; shadows: ShadowSpawn[] }
  /** A new wave of crystals stands on the floor. */
  | { type: 'wavePlaced'; cause: WaveCause; crystals: CrystalSpawn[] }
  /** The right word: it joins the sentence. */
  | { type: 'crystalTaken'; id: string; index: number }
  /** The wrong word. Counts a reading attempt. */
  | { type: 'crystalRefused'; id: string }
  /** The hero is pushed back, 0.8 s without control; the crystals shuffle. Not a reading error. */
  | { type: 'heroBumped'; shadowId: string }
  | { type: 'gateOpened'; roomId: string }
  | { type: 'roomCleared'; roomId: string; sentenceId: string }
  | { type: 'delveComplete'; rooms: number };

export type ShadowGateEventType = ShadowGateEvent['type'];

/** Every event type the core emits; there is no game over. */
export const SHADOW_GATE_EVENT_TYPES: readonly ShadowGateEventType[] = [
  'roomStarted',
  'wavePlaced',
  'crystalTaken',
  'crystalRefused',
  'heroBumped',
  'gateOpened',
  'roomCleared',
  'delveComplete',
];
