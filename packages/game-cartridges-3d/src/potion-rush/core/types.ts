/**
 * Potion Rush 3D rules core: state, commands, and events (section 7 of
 * docs/game-potion-rush-3d.md). The view reads the state every frame (belt positions, patience,
 * cauldron progress) and animates from the events; every event carries ids, never references.
 */

// ---------------------------------------------------------------- content kinds

/** Customer models of the potion-shop pack, in the order of the seeded list. */
export const CUSTOMER_KINDS = [
  'farmer',
  'villager',
  'innkeeper',
  'guard',
  'druid',
  'orc-warrior',
  'goblin-warrior',
  'skeleton',
] as const;

export type CustomerKind = (typeof CUSTOMER_KINDS)[number];

/** Ingredient models that carry the words on the conveyor. */
export const INGREDIENT_KINDS = ['bottle', 'mushroom', 'apple', 'pumpkin', 'crystal-cluster', 'bread'] as const;

export type IngredientKind = (typeof INGREDIENT_KINDS)[number];

export type Mood = 'happy' | 'waiting' | 'grumpy';

// ---------------------------------------------------------------- state

/** One order of the shift: a sentence and the customer who asks for it. */
export interface Order {
  /** The order id, equal to the story sentence id (the evidence `itemId`). */
  id: string;
  /** The sentence as the student reads it. */
  text: string;
  /** The words in the order the cauldron needs them; punctuation stays attached. */
  words: string[];
  translation?: string;
  /** Zero-based story paragraph the sentence comes from, when known. */
  paragraph?: number;
  customerId: string;
  kind: CustomerKind;
  /** Wrong words dropped into this order's cauldron while the customer waited. */
  wrong: number;
  /** True once the student dropped any word (right or wrong) for this order. */
  started: boolean;
  served: boolean;
}

/** A customer at a counter spot, waiting for the potion. */
export interface Slot {
  customerId: string;
  orderId: string;
  kind: CustomerKind;
  /** Patience left, in milliseconds; the meter shows `patienceMs / maxPatienceMs`. */
  patienceMs: number;
  maxPatienceMs: number;
  mood: Mood;
  /** True when this customer sat down before and came back. */
  returned: boolean;
}

/** One cauldron; cauldron `i` brews for the customer of slot `i`. */
export interface Cauldron {
  index: number;
  /** The order it brews, or null while empty. Equal to the slot's order once a word is in. */
  orderId: string | null;
  /** Accepted words so far, in order. */
  words: string[];
  /** True when every word is in: the potion glows and waits for `serve`. */
  ready: boolean;
}

/** A word on the conveyor. */
export interface BeltItem {
  id: string;
  word: string;
  kind: IngredientKind;
  /** 0 to 1 along the belt; items enter at 1 (the right end) and leave below 0. */
  position: number;
}

/** A customer who ran out of patience and waits at a table. */
export interface Seated {
  customerId: string;
  orderId: string;
  kind: CustomerKind;
  /** Game time when the customer may come back to the counter. */
  returnAtMs: number;
}

export interface PotionRushState {
  phase: 'playing' | 'complete';
  helper: boolean;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  /** The shift: every order, in arrival order. */
  orders: Order[];
  /** Order ids of customers who have not come to the counter yet. */
  queue: string[];
  /** The counter spots; null while empty. */
  slots: (Slot | null)[];
  cauldrons: Cauldron[];
  belt: BeltItem[];
  /** The active word pool: words open orders still need and the belt does not carry. */
  pool: string[];
  seated: Seated[];
  served: number;
  /** The number of orders of the shift (`orders.length`). */
  total: number;
  coins: number;
  /** Coins that came from tips (part of `coins`; the tip jar). */
  tips: number;
  rush: boolean;
  /** Correct words in a row; a wrong word resets it. */
  combo: number;
  /** Current belt speed as a fraction of the belt per second. */
  beltSpeed: number;
  /** Game time of the next ingredient spawn and the next customer arrival. */
  nextSpawnMs: number;
  nextArrivalMs: number;
  /** Counters for ids. */
  spawned: number;
}

// ---------------------------------------------------------------- commands

export type PotionRushCommand =
  /** A word into a cauldron (a drag or a tap). */
  | { type: 'drop'; itemId: string; cauldron: number }
  /** Serve a complete potion. */
  | { type: 'serve'; cauldron: number };

// ---------------------------------------------------------------- events

export type PotionRushEvent =
  | { type: 'customerArrived'; slot: number; customerId: string; kind: CustomerKind; sentenceId: string }
  | { type: 'itemSpawned'; itemId: string; word: string; kind: IngredientKind }
  | { type: 'itemLeft'; itemId: string; word: string; kind: IngredientKind }
  | { type: 'wordAccepted'; cauldron: number; itemId: string; word: string; index: number; combo: number }
  /** The item stays on the belt at its position; the view flies it back. */
  | { type: 'wordRejected'; cauldron: number; itemId: string; word: string }
  | { type: 'potionReady'; cauldron: number }
  | { type: 'potionServed'; cauldron: number; customerId: string; coins: number; tip: number; rush: boolean }
  | { type: 'moodChanged'; slot: number; mood: Mood }
  | { type: 'customerSatDown'; slot: number; customerId: string }
  | { type: 'customerReturned'; slot: number; customerId: string; kind: CustomerKind; sentenceId: string }
  | { type: 'rushStarted' }
  | { type: 'rushEnded' }
  | { type: 'shiftComplete'; served: number; coins: number };

export type PotionRushEventType = PotionRushEvent['type'];

/** Every event type the core emits; there is no game over. */
export const POTION_RUSH_EVENT_TYPES: readonly PotionRushEventType[] = [
  'customerArrived',
  'itemSpawned',
  'itemLeft',
  'wordAccepted',
  'wordRejected',
  'potionReady',
  'potionServed',
  'moodChanged',
  'customerSatDown',
  'customerReturned',
  'rushStarted',
  'rushEnded',
  'shiftComplete',
];
