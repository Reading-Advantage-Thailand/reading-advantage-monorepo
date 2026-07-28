/**
 * Deterministic test fixtures for the seven accepted capabilities.
 *
 * Provides a deterministic clock, RNG, and input sequence that game-owned
 * rules and shared systems can consume without depending on real time, real
 * browser input, or non-deterministic Math.random.
 */

/** Deterministic clock that advances only when explicitly injected. */
export interface DeterministicClock {
  /** Current virtual time in milliseconds. */
  now(): number;
  /** Advances the clock by a delta. */
  advance(deltaMs: number): void;
  /** Resets the clock to zero. */
  reset(): void;
}

/**
 * Creates a deterministic clock for bounded-frame-loop and time-threshold tests.
 * @param initialMs Optional initial time; defaults to zero.
 * @returns A clock that advances only when `advance` is called.
 */
export function createDeterministicClock(initialMs = 0): DeterministicClock {
  let elapsed = initialMs;
  return Object.freeze({
    now: () => elapsed,
    advance: (deltaMs: number) => {
      elapsed += deltaMs;
    },
    reset: () => {
      elapsed = 0;
    },
  });
}

/**
 * Creates a deterministic pseudo-random generator for cartridge tests.
 * @param seed Integer seed for the Mulberry32 generator.
 * @returns A function yielding repeatable values from zero up to one.
 */
export function createDeterministicRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic input descriptor used to replay physical input sequences. */
export interface DeterministicInputDescriptor {
  readonly modality: "keyboard" | "pointer";
  readonly code?: string;
  readonly phase?: "down" | "up" | "drag";
  readonly x?: number;
  readonly y?: number;
  readonly deltaX?: number;
  readonly deltaY?: number;
}

/** Deterministic input sequence that yields descriptors in order. */
export interface DeterministicInputSequence {
  /** Returns the next descriptor, or undefined when the sequence is exhausted. */
  next(): DeterministicInputDescriptor | undefined;
  /** Resets the sequence to the first descriptor. */
  reset(): void;
}

/** One deterministic responsive browser fixture. */
export interface ResponsiveViewportFixture {
  /** Human-readable fixture identifier. */
  readonly id: "narrow-phone" | "reference-phone" | "tablet-portrait" | "tablet-landscape" | "desktop" | "wide-desktop";
  /** Viewport width. */
  readonly width: number;
  /** Viewport height. */
  readonly height: number;
  /** Expected normative profile. */
  readonly expectedProfile: "compact" | "wide";
}

/** Complete deterministic viewport matrix from the responsive composition specification. */
export const RESPONSIVE_VIEWPORT_FIXTURES: readonly ResponsiveViewportFixture[] = Object.freeze([
  Object.freeze({ id: "narrow-phone", width: 360, height: 800, expectedProfile: "compact" }),
  Object.freeze({ id: "reference-phone", width: 390, height: 844, expectedProfile: "compact" }),
  Object.freeze({ id: "tablet-portrait", width: 768, height: 1024, expectedProfile: "compact" }),
  Object.freeze({ id: "tablet-landscape", width: 1024, height: 768, expectedProfile: "wide" }),
  Object.freeze({ id: "desktop", width: 1440, height: 900, expectedProfile: "wide" }),
  Object.freeze({ id: "wide-desktop", width: 1920, height: 1080, expectedProfile: "wide" }),
]);

/** Locale fixtures covering short, long, Thai, English, duplicate, and enlarged-text cases. */
export const WORST_CASE_TEXT_FIXTURES = Object.freeze({
  englishShort: "river",
  englishLong: "environmental responsibility through collaborative problem solving",
  thaiShort: "แม่น้ำ",
  thaiLong: "ความรับผิดชอบต่อสิ่งแวดล้อมผ่านการเรียนรู้ร่วมกัน",
  duplicates: Object.freeze(["light", "light"]),
  enlargedTextScale: 1.5,
});

/**
 * Creates a deterministic input sequence for replay tests.
 * @param descriptors Ordered physical input descriptors to replay.
 * @returns A sequence that yields descriptors in order.
 */
export function createDeterministicInputSequence(
  descriptors: readonly DeterministicInputDescriptor[],
): DeterministicInputSequence {
  const frozen = Object.freeze([...descriptors]);
  let index = 0;
  return Object.freeze({
    next: () => frozen[index++],
    reset: () => {
      index = 0;
    },
  });
}
