/**
 * `capability:bounded-frame-delta` shared core.
 *
 * Shared loop infrastructure owns elapsed-frame measurement and the 50
 * millisecond ceiling. A scheduler passes bounded delta to a
 * transport-independent game callback. Each game owns its tick, adapter,
 * rendering effects, cleanup, and terminal transitions.
 *
 * Source evidence: babel-architect (BA-HIST-011) — the historical shell drives
 * the rules tick through requestAnimationFrame, clamps each frame delta to
 * 50 ms, updates the adapter, and cancels on cleanup.
 */

/** The exact frame-delta ceiling accepted from babel-architect, in milliseconds. */
export const BOUNDED_FRAME_DELTA_CEILING_MS = 50;

/** Transport-independent game tick callback that receives the bounded delta. */
export type BoundedFrameTick = (deltaMs: number) => void;

/** Bounded frame scheduler owned by the shared loop infrastructure. */
export interface BoundedFrameScheduler {
  /** Cumulative elapsed milliseconds after clamping. */
  readonly elapsedMs: number;
  /** Number of ticks dispatched. */
  readonly tickCount: number;
  /** The last delta passed to the game callback, after clamping. */
  readonly lastDeltaMs: number;
  /** Whether the last delta was clamped to the ceiling. */
  readonly lastDeltaWasClamped: boolean;
  /** Whether the scheduler has been cancelled. */
  readonly cancelled: boolean;
  /**
   * Dispatches one bounded delta to the game callback.
   * @param rawDeltaMs Raw frame delta measured by the transport.
   */
  tick(rawDeltaMs: number): void;
  /** Cancels the scheduler so no further ticks can be dispatched. */
  cancel(): void;
}

/**
 * Clamps a raw frame delta to the accepted 50 ms ceiling.
 * @param rawDeltaMs Raw frame delta measured by the transport.
 * @returns The clamped delta, never greater than the ceiling.
 * @throws When the raw delta is negative.
 */
export function clampFrameDelta(rawDeltaMs: number): number {
  if (!Number.isFinite(rawDeltaMs) || rawDeltaMs < 0) {
    throw new Error("Bounded frame delta rejects a negative or non-finite delta");
  }
  return Math.min(rawDeltaMs, BOUNDED_FRAME_DELTA_CEILING_MS);
}

/**
 * Creates a bounded frame scheduler that passes clamped deltas to a game callback.
 * @param tick Transport-independent game tick callback.
 * @returns A scheduler that tracks elapsed time and cancels cleanly.
 */
export function createBoundedFrameScheduler(tick: BoundedFrameTick): BoundedFrameScheduler {
  let elapsedMs = 0;
  let tickCount = 0;
  let lastDeltaMs = 0;
  let lastDeltaWasClamped = false;
  let cancelled = false;

  return Object.freeze({
    get elapsedMs() {
      return elapsedMs;
    },
    get tickCount() {
      return tickCount;
    },
    get lastDeltaMs() {
      return lastDeltaMs;
    },
    get lastDeltaWasClamped() {
      return lastDeltaWasClamped;
    },
    get cancelled() {
      return cancelled;
    },
    tick(rawDeltaMs: number): void {
      if (cancelled) {
        throw new Error("Bounded frame scheduler has been cancelled");
      }
      const clamped = clampFrameDelta(rawDeltaMs);
      lastDeltaWasClamped = clamped < rawDeltaMs;
      lastDeltaMs = clamped;
      elapsedMs += clamped;
      tickCount += 1;
      tick(clamped);
    },
    cancel(): void {
      cancelled = true;
    },
  });
}
