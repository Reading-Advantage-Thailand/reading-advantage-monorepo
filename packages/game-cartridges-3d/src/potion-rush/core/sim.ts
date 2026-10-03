/**
 * The Potion Rush 3D simulation (task 15): a real-time `Simulation` on the fixed step. Rules
 * from sections 2, 3, and 7 of docs/game-potion-rush-3d.md: customers arrive and wait, words of
 * open orders ride the belt, a drop is right only when it is the next word of the sentence, a
 * complete potion is served for coins, a customer out of patience sits down and comes back,
 * and the shift ends when every order is served. There is no game over.
 */
import { STEP_MS, createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { ordersOf, type PotionRushInput } from './content.js';
import {
  INGREDIENT_KINDS,
  type BeltItem,
  type Cauldron,
  type Mood,
  type Order,
  type PotionRushCommand,
  type PotionRushEvent,
  type PotionRushState,
  type Slot,
} from './types.js';

/** Every tuning number of the game (section 7 of the design). */
export const TUNING = {
  /** Counter spots and cauldrons. */
  slots: 3,
  /** The most orders in one shift. */
  maxOrders: 8,
  /** Belt speed as a fraction of the belt per second. */
  beltSpeed: 0.09,
  /** Speed added per served order, and the cap of the sum. */
  speedUpPerOrder: 0.08,
  speedUpMax: 0.4,
  /** Helper mode multiplies the belt speed by this. */
  helperSpeedFactor: 0.75,
  /** An ingredient spawns this often; the first one after `firstSpawnMs`. */
  spawnEveryMs: 2100,
  firstSpawnMs: 500,
  /** The chance a spawn is the next word of the neediest customer (when the pool has it). */
  nextWordBias: 0.7,
  /** Patience of a new customer, shrunk per served order, never below the floor. */
  patienceMs: 60_000,
  patienceShrinkPerOrder: 0.9,
  patienceFloorMs: 45_000,
  /** Customers arrive every patience / 3; sooner when the shop is empty; a full shop retries. */
  arrivalDivisor: 3,
  emptyShopArrivalMs: 3000,
  arrivalRetryMs: 1000,
  /** A seated customer comes back after this long, when a spot is free. */
  returnAfterMs: 15_000,
  /** Mood thresholds as a share of the patience left. */
  moodWaitingAt: 0.5,
  moodGrumpyAt: 0.25,
  /** Extra coins for a customer served while happy, and the rush multiplier on the coins. */
  tipCoins: 5,
  rushMultiplier: 2,
} as const;

export interface PotionRushOptions {
  seed: number;
  helper: boolean;
}

export type PotionRushSimulation = Simulation<PotionRushState, PotionRushCommand, PotionRushEvent>;

const norm = (word: string): string => word.toLowerCase();

const orderById = (state: PotionRushState, id: string): Order => {
  const order = state.orders.find((o) => o.id === id);
  if (!order) throw new Error(`potion rush: unknown order ${id}`);
  return order;
};

/** The words a slot's order still needs, in order (the cauldron's progress removed). */
function remainingWords(state: PotionRushState, slotIndex: number): string[] {
  const slot = state.slots[slotIndex];
  if (!slot) return [];
  const order = orderById(state, slot.orderId);
  const cauldron = state.cauldrons[slotIndex]!;
  return order.words.slice(cauldron.words.length);
}

/** The word cauldron `i` needs next, or null when its spot is empty or the potion is ready. */
export function nextWordOf(state: PotionRushState, cauldron: number): string | null {
  const c = state.cauldrons[cauldron];
  if (!c || c.ready) return null;
  return remainingWords(state, cauldron)[0] ?? null;
}

/**
 * The one cauldron that needs the item's word next, or null when none or more than one does.
 * The view uses it for taps: a tapped word flies into that cauldron.
 */
export function targetFor(state: PotionRushState, itemId: string): number | null {
  const item = state.belt.find((i) => i.id === itemId);
  if (!item) return null;
  const word = norm(item.word);
  let found: number | null = null;
  for (let i = 0; i < state.cauldrons.length; i++) {
    const next = nextWordOf(state, i);
    if (next !== null && norm(next) === word) {
      if (found !== null) return null;
      found = i;
    }
  }
  return found;
}

/** The mood for a share of patience left. */
export function moodFor(share: number): Mood {
  if (share <= TUNING.moodGrumpyAt) return 'grumpy';
  if (share <= TUNING.moodWaitingAt) return 'waiting';
  return 'happy';
}

/** Patience of the next customer after `served` orders. */
export function patienceFor(served: number): number {
  return Math.max(TUNING.patienceFloorMs, TUNING.patienceMs * TUNING.patienceShrinkPerOrder ** served);
}

/** Belt speed after `served` orders, as a fraction of the belt per second. */
export function beltSpeedFor(served: number, helper: boolean): number {
  const boost = Math.min(TUNING.speedUpMax, TUNING.speedUpPerOrder * served);
  return TUNING.beltSpeed * (1 + boost) * (helper ? TUNING.helperSpeedFactor : 1);
}

const emptyCauldron = (index: number): Cauldron => ({ index, orderId: null, words: [], ready: false });

export function createPotionRush(input: PotionRushInput, options: PotionRushOptions): PotionRushSimulation {
  const rng: Rng = createRng(options.seed);
  const orders = ordersOf(input, rng, TUNING.maxOrders);

  const state: PotionRushState = {
    phase: 'playing',
    helper: options.helper,
    timeMs: 0,
    orders,
    queue: orders.map((o) => o.id),
    slots: Array.from({ length: TUNING.slots }, () => null),
    cauldrons: Array.from({ length: TUNING.slots }, (_, i) => emptyCauldron(i)),
    belt: [],
    pool: [],
    seated: [],
    served: 0,
    total: orders.length,
    coins: 0,
    tips: 0,
    rush: false,
    combo: 0,
    beltSpeed: beltSpeedFor(0, options.helper),
    nextSpawnMs: TUNING.firstSpawnMs,
    nextArrivalMs: 0,
    spawned: 0,
  };
  // A shift with no orders is over before it starts (the manifest needs 3 sentences).
  if (orders.length === 0) state.phase = 'complete';

  // ------------------------------------------------------------ the pool

  /**
   * Rebuilds the pool: the words every waiting order still needs, minus the words on the belt
   * (case-insensitive, with multiplicity). So every open order can always finish: each word it
   * needs is on the belt now or spawns from the pool later.
   */
  const rebalancePool = (): void => {
    const onBelt = new Map<string, number>();
    for (const item of state.belt) onBelt.set(norm(item.word), (onBelt.get(norm(item.word)) ?? 0) + 1);
    const pool: string[] = [];
    for (let i = 0; i < state.slots.length; i++) {
      for (const word of remainingWords(state, i)) {
        const key = norm(word);
        const left = onBelt.get(key) ?? 0;
        if (left > 0) onBelt.set(key, left - 1);
        else pool.push(word);
      }
    }
    state.pool = pool;
  };

  // ------------------------------------------------------------ rush and moods

  const updateRush = (events: PotionRushEvent[]): void => {
    const rush = state.slots.every((s) => s !== null);
    if (rush === state.rush) return;
    state.rush = rush;
    events.push({ type: rush ? 'rushStarted' : 'rushEnded' });
  };

  const updateMood = (slotIndex: number, slot: Slot, events: PotionRushEvent[]): void => {
    const mood = moodFor(slot.patienceMs / slot.maxPatienceMs);
    if (mood === slot.mood) return;
    slot.mood = mood;
    events.push({ type: 'moodChanged', slot: slotIndex, mood });
  };

  // ------------------------------------------------------------ customers

  const seat = (slotIndex: number, order: Order, returned: boolean, events: PotionRushEvent[]): void => {
    const patience = patienceFor(state.served);
    state.slots[slotIndex] = {
      customerId: order.customerId,
      orderId: order.id,
      kind: order.kind,
      patienceMs: patience,
      maxPatienceMs: patience,
      mood: 'happy',
      returned,
    };
    state.cauldrons[slotIndex] = emptyCauldron(slotIndex);
    const payload = { slot: slotIndex, customerId: order.customerId, kind: order.kind, sentenceId: order.id };
    events.push(returned ? { type: 'customerReturned', ...payload } : { type: 'customerArrived', ...payload });
  };

  /** Brings the next customer to a free spot: a seated one whose time came first, else the queue. */
  const arrive = (events: PotionRushEvent[]): void => {
    if (state.timeMs < state.nextArrivalMs) return;
    const free = state.slots.findIndex((s) => s === null);
    if (free === -1) {
      state.nextArrivalMs = state.timeMs + TUNING.arrivalRetryMs;
      return;
    }
    const due = state.seated.findIndex((s) => s.returnAtMs <= state.timeMs);
    if (due !== -1) {
      const [back] = state.seated.splice(due, 1);
      seat(free, orderById(state, back!.orderId), true, events);
    } else if (state.queue.length > 0) {
      seat(free, orderById(state, state.queue.shift()!), false, events);
    } else {
      state.nextArrivalMs = state.timeMs + TUNING.arrivalRetryMs;
      return;
    }
    const waiting = state.slots.filter((s) => s !== null).length;
    const interval = waiting <= 1 ? TUNING.emptyShopArrivalMs : patienceFor(state.served) / TUNING.arrivalDivisor;
    state.nextArrivalMs = state.timeMs + interval;
    rebalancePool();
    updateRush(events);
  };

  const sitDown = (slotIndex: number, slot: Slot, events: PotionRushEvent[]): void => {
    state.slots[slotIndex] = null;
    state.cauldrons[slotIndex] = emptyCauldron(slotIndex);
    state.seated.push({
      customerId: slot.customerId,
      orderId: slot.orderId,
      kind: slot.kind,
      returnAtMs: state.timeMs + TUNING.returnAfterMs,
    });
    events.push({ type: 'customerSatDown', slot: slotIndex, customerId: slot.customerId });
    // The shop has a free spot: the next customer comes soon.
    state.nextArrivalMs = Math.min(state.nextArrivalMs, state.timeMs + TUNING.emptyShopArrivalMs);
    rebalancePool();
    updateRush(events);
  };

  const tickPatience = (events: PotionRushEvent[]): void => {
    for (let i = 0; i < state.slots.length; i++) {
      const slot = state.slots[i];
      if (!slot) continue;
      // A ready potion holds the customer: the patience meter stops.
      if (state.cauldrons[i]!.ready) continue;
      slot.patienceMs = Math.max(0, slot.patienceMs - STEP_MS);
      if (slot.patienceMs <= 0) sitDown(i, slot, events);
      else updateMood(i, slot, events);
    }
  };

  // ------------------------------------------------------------ the belt

  const spawn = (events: PotionRushEvent[]): void => {
    if (state.timeMs < state.nextSpawnMs) return;
    state.nextSpawnMs = state.timeMs + TUNING.spawnEveryMs;
    if (state.pool.length === 0) return;
    // Most of the time the belt brings the next word of the customer with the least patience
    // left (when the pool has it); the rest of the spawns are any word of the pool.
    const inPool = (w: string) => state.pool.find((p) => norm(p) === norm(w));
    const neediest = state.slots
      .map((slot, i) => ({ slot, next: nextWordOf(state, i) }))
      .filter((c): c is { slot: Slot; next: string } => c.slot !== null && c.next !== null && inPool(c.next) !== undefined)
      .sort((a, b) => a.slot.patienceMs / a.slot.maxPatienceMs - b.slot.patienceMs / b.slot.maxPatienceMs)[0];
    let word: string;
    if (neediest && rng.next() < TUNING.nextWordBias) word = inPool(neediest.next)!;
    else word = rng.pick(state.pool);
    state.pool.splice(state.pool.indexOf(word), 1);
    state.spawned += 1;
    const item: BeltItem = { id: `i${state.spawned}`, word, kind: rng.pick(INGREDIENT_KINDS), position: 1 };
    state.belt.push(item);
    events.push({ type: 'itemSpawned', itemId: item.id, word: item.word, kind: item.kind });
  };

  const moveBelt = (events: PotionRushEvent[]): void => {
    const step = (state.beltSpeed * STEP_MS) / 1000;
    const left: BeltItem[] = [];
    for (const item of state.belt) {
      item.position -= step;
      if (item.position < 0) left.push(item);
    }
    if (left.length === 0) return;
    state.belt = state.belt.filter((i) => i.position >= 0);
    for (const item of left) events.push({ type: 'itemLeft', itemId: item.id, word: item.word, kind: item.kind });
    rebalancePool();
  };

  // ------------------------------------------------------------ commands

  const drop = (itemId: string, cauldronIndex: number): PotionRushEvent[] => {
    const events: PotionRushEvent[] = [];
    const item = state.belt.find((i) => i.id === itemId);
    const cauldron = state.cauldrons[cauldronIndex];
    if (!item || !cauldron) return events;
    const slot = state.slots[cauldronIndex];
    if (!slot || cauldron.ready) {
      events.push({ type: 'wordRejected', cauldron: cauldronIndex, itemId, word: item.word });
      return events;
    }
    const order = orderById(state, slot.orderId);
    order.started = true;
    const expected = order.words[cauldron.words.length]!;
    if (norm(expected) !== norm(item.word)) {
      order.wrong += 1;
      state.combo = 0;
      events.push({ type: 'wordRejected', cauldron: cauldronIndex, itemId, word: item.word });
      return events;
    }
    state.belt = state.belt.filter((i) => i.id !== itemId);
    cauldron.orderId = order.id;
    cauldron.words.push(expected);
    state.combo += 1;
    events.push({
      type: 'wordAccepted',
      cauldron: cauldronIndex,
      itemId,
      word: expected,
      index: cauldron.words.length - 1,
      combo: state.combo,
    });
    if (cauldron.words.length === order.words.length) {
      cauldron.ready = true;
      events.push({ type: 'potionReady', cauldron: cauldronIndex });
    }
    rebalancePool();
    return events;
  };

  const serve = (cauldronIndex: number): PotionRushEvent[] => {
    const events: PotionRushEvent[] = [];
    const cauldron = state.cauldrons[cauldronIndex];
    const slot = state.slots[cauldronIndex];
    if (!cauldron || !cauldron.ready || !slot) return events;
    const order = orderById(state, slot.orderId);
    const base = Math.floor(slot.patienceMs / 1000);
    const coins = base * (state.rush ? TUNING.rushMultiplier : 1);
    const tip = slot.mood === 'happy' ? TUNING.tipCoins : 0;
    order.served = true;
    state.served += 1;
    state.coins += coins + tip;
    state.tips += tip;
    state.slots[cauldronIndex] = null;
    state.cauldrons[cauldronIndex] = emptyCauldron(cauldronIndex);
    state.beltSpeed = beltSpeedFor(state.served, state.helper);
    events.push({ type: 'potionServed', cauldron: cauldronIndex, customerId: slot.customerId, coins, tip, rush: state.rush });
    // A free spot: the next customer comes soon.
    state.nextArrivalMs = Math.min(state.nextArrivalMs, state.timeMs + TUNING.emptyShopArrivalMs);
    rebalancePool();
    updateRush(events);
    if (state.served >= state.total) {
      state.phase = 'complete';
      events.push({ type: 'shiftComplete', served: state.served, coins: state.coins });
    }
    return events;
  };

  // ------------------------------------------------------------ the simulation

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase !== 'playing') return [];
      switch (command.type) {
        case 'drop':
          return drop(command.itemId, command.cauldron);
        case 'serve':
          return serve(command.cauldron);
        default:
          return [];
      }
    },
    tick() {
      if (state.phase !== 'playing') return [];
      const events: PotionRushEvent[] = [];
      state.timeMs += STEP_MS;
      tickPatience(events);
      arrive(events);
      moveBelt(events);
      spawn(events);
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
