/**
 * `capability:time-and-frame-loop` shared core.
 *
 * Shared timing primitives own bounded elapsed or remaining time and threshold
 * detection. A pure tick contract returns updated time and a threshold signal
 * to game-owned rules. Games own count direction, duration, terminal state,
 * secondary health or stability predicates, and threshold effects.
 *
 * Source evidence: babel-architect (BA-HIST-005 active time threshold
 * transition with 250 ms clamp), dragon-flight (DF-HIST-001 duration-threshold
 * transition), dragon-rider (DR-HIST-003 duration-to-boss transition),
 * enchanted-library (EL-CUR-006), magic-defense (MD-HIST-005 countdown
 * termination).
 */

/** Pure tick result returned to game-owned rules. */
export interface TimeThresholdTick {
  /** Elapsed milliseconds accumulated by the timer. */
  readonly elapsedMs: number;
  /** Remaining milliseconds (countdown) or zero (stopwatch). */
  readonly remainingMs: number;
  /** Whether the threshold was crossed by this tick. */
  readonly thresholdCrossed: boolean;
}

/** Pure bounded timing primitive. */
export interface TimeThresholdTimer {
  /** Original duration the timer was constructed with. */
  readonly durationMs: number;
  /** Cumulative elapsed milliseconds. */
  readonly elapsedMs: number;
  /** Remaining milliseconds for countdown timers; zero for stopwatches. */
  readonly remainingMs: number;
  /** Whether the threshold has been crossed and the timer is terminal. */
  readonly isTerminal: boolean;
  /**
   * Advances the timer by one tick.
   * @param deltaMs Bounded frame delta supplied by the scheduler.
   * @returns A pure tick result with updated time and threshold signal.
   */
  tick(deltaMs: number): TimeThresholdTick;
  /** Resets the timer to its initial state. */
  reset(): void;
}

function assertDelta(deltaMs: number): void {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new Error("Time threshold timer rejects a negative or non-finite delta");
  }
}

function assertDuration(durationMs: number): void {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error("Time threshold timer requires a positive finite duration");
  }
}

/**
 * Creates a countdown timer that counts down from a bounded duration.
 * @param options Duration in milliseconds.
 * @returns A pure timer that signals threshold crossing at zero remaining.
 */
export function createCountdownTimer(options: { readonly durationMs: number }): TimeThresholdTimer {
  assertDuration(options.durationMs);
  const durationMs = options.durationMs;
  let elapsedMs = 0;
  let terminal = false;

  return Object.freeze({
    get durationMs() {
      return durationMs;
    },
    get elapsedMs() {
      return elapsedMs;
    },
    get remainingMs() {
      return Math.max(0, durationMs - elapsedMs);
    },
    get isTerminal() {
      return terminal;
    },
    tick(deltaMs: number): TimeThresholdTick {
      assertDelta(deltaMs);
      if (terminal) {
        return Object.freeze({ elapsedMs, remainingMs: 0, thresholdCrossed: false });
      }
      const before = elapsedMs;
      elapsedMs = Math.min(durationMs, elapsedMs + deltaMs);
      const crossed = before < durationMs && elapsedMs >= durationMs;
      if (crossed) terminal = true;
      return Object.freeze({
        elapsedMs,
        remainingMs: Math.max(0, durationMs - elapsedMs),
        thresholdCrossed: crossed,
      });
    },
    reset(): void {
      elapsedMs = 0;
      terminal = false;
    },
  });
}

/**
 * Creates a stopwatch timer that counts up to a bounded threshold duration.
 * @param options Duration in milliseconds.
 * @returns A pure timer that signals threshold crossing at the duration.
 */
export function createStopwatchTimer(options: { readonly durationMs: number }): TimeThresholdTimer {
  assertDuration(options.durationMs);
  const durationMs = options.durationMs;
  let elapsedMs = 0;
  let terminal = false;

  return Object.freeze({
    get durationMs() {
      return durationMs;
    },
    get elapsedMs() {
      return elapsedMs;
    },
    get remainingMs() {
      return 0;
    },
    get isTerminal() {
      return terminal;
    },
    tick(deltaMs: number): TimeThresholdTick {
      assertDelta(deltaMs);
      if (terminal) {
        return Object.freeze({ elapsedMs, remainingMs: 0, thresholdCrossed: false });
      }
      const before = elapsedMs;
      elapsedMs += deltaMs;
      const crossed = before < durationMs && elapsedMs >= durationMs;
      if (crossed) terminal = true;
      return Object.freeze({
        elapsedMs,
        remainingMs: 0,
        thresholdCrossed: crossed,
      });
    },
    reset(): void {
      elapsedMs = 0;
      terminal = false;
    },
  });
}
