/**
 * One simulation pattern for turn-based and real-time games (section 10 of
 * docs/apk3d-cartridge.md). A game core is a `Simulation`: pure rules on a seeded state, time
 * enters only through `tick()`, and every event carries ids, never object references. The view
 * sends commands, runs the fixed-step loop, and renders the returned events in order.
 */
import { BOUNDED_FRAME_DELTA_CEILING_MS } from '../contracts/index.js';

export interface Simulation<S, C, E> {
  /** The current state; read it after any call. */
  readonly state: S;
  /** A student action (answer, drag, serve). */
  dispatch(command: C): E[];
  /** One fixed step of STEP_MS. A turn game returns []. */
  tick(): E[];
  /** A structured-clone-safe copy of the state. */
  snapshot(): S;
}

/** The fixed step in milliseconds (30 steps per second); the view interpolates between steps. */
export const STEP_MS = 1000 / 30;

/**
 * The longest frame delta the loop accepts. This is the APK constant
 * `BOUNDED_FRAME_DELTA_CEILING_MS` (`capability:bounded-frame-delta`): a longer frame (a tab in
 * the background, a phone lock) counts as 50 ms; the lost time is dropped, never caught up.
 */
export const MAX_FRAME_MS: number = BOUNDED_FRAME_DELTA_CEILING_MS;

/** The most steps one frame may run; the rest of the accumulator is dropped. */
export const MAX_STEPS_PER_FRAME = 2;

/** Float slack so that 50 + 16.667 still counts as two steps of 33.333. */
const STEP_EPSILON_MS = 1e-6;

/** What the loop hands the view once per frame. */
export interface SimulationView<E> {
  /**
   * Renders the events of this frame in order (dispatched events first, then tick events) and
   * the interpolation `alpha` in [0, 1): the share of a step since the last tick.
   */
  render(events: readonly E[], alpha: number): void;
}

/** The clock and frame scheduler the loop uses; tests inject fakes (no DOM needed). */
export interface LoopClock {
  /** Milliseconds; only differences matter. */
  now(): number;
  /** Schedules `callback` for the next frame and returns a handle. */
  requestFrame(callback: () => void): number;
  cancelFrame(handle: number): void;
}

export interface FixedStepLoop<C> {
  /** True between `start()` and `stop()`. */
  readonly running: boolean;
  /** Steps run since `start()`. */
  readonly steps: number;
  /** Starts the loop with an empty accumulator; a second call is ignored. */
  start(): void;
  /** Stops the loop; the last frame stays. */
  stop(): void;
  /** Empties the accumulator and restarts the clock (`resume()`: no catch-up steps). */
  reset(): void;
  /** Sends a command to the simulation now; its events render in the next frame, in order. */
  dispatch(command: C): void;
  /** Runs one frame by hand: measure the delta, step, render. Tests call it directly. */
  frame(): void;
}

const browserClock = (): LoopClock => ({
  now: () => performance.now(),
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
});

/**
 * A fixed-step loop with a clamped accumulator: each frame adds `min(delta, MAX_FRAME_MS)` and
 * runs at most `MAX_STEPS_PER_FRAME` steps; whatever is left beyond a full step is dropped.
 */
export function createFixedStepLoop<S, C, E>(
  sim: Simulation<S, C, E>,
  view: SimulationView<E>,
  clock: LoopClock = browserClock(),
): FixedStepLoop<C> {
  let running = false;
  let handle: number | null = null;
  let last = 0;
  let accumulator = 0;
  let steps = 0;
  let pending: E[] = [];

  const frame = (): void => {
    const now = clock.now();
    const delta = Math.min(Math.max(0, now - last), MAX_FRAME_MS);
    last = now;
    accumulator += delta;
    const events = pending;
    pending = [];
    let ran = 0;
    while (accumulator >= STEP_MS - STEP_EPSILON_MS && ran < MAX_STEPS_PER_FRAME) {
      events.push(...sim.tick());
      accumulator = Math.max(0, accumulator - STEP_MS);
      ran += 1;
    }
    steps += ran;
    if (accumulator >= STEP_MS - STEP_EPSILON_MS) accumulator = 0; // drop the rest, never catch up
    view.render(events, accumulator / STEP_MS);
  };

  const schedule = (): void => {
    handle = clock.requestFrame(() => {
      handle = null;
      if (!running) return;
      frame();
      if (running) schedule();
    });
  };

  return {
    get running() {
      return running;
    },
    get steps() {
      return steps;
    },
    start() {
      if (running) return;
      running = true;
      steps = 0;
      last = clock.now();
      accumulator = 0;
      schedule();
    },
    stop() {
      running = false;
      if (handle !== null) clock.cancelFrame(handle);
      handle = null;
    },
    reset() {
      accumulator = 0;
      last = clock.now();
    },
    dispatch(command) {
      pending.push(...sim.dispatch(command));
    },
    frame,
  };
}

/**
 * A clock another loop drives: a Phaser scene calls `run(time)` from its `update(time)`, a test
 * calls it by hand. `requestFrame` queues the callback; `run` sets the time and runs the queue,
 * so the fixed-step loop steps once per host frame and keeps its clamp of `MAX_FRAME_MS`.
 */
export interface ManualClock {
  readonly clock: LoopClock;
  /** Runs the frames queued since the last call, at `now` milliseconds. */
  run(now: number): void;
}

export function createManualClock(start = 0): ManualClock {
  let now = start;
  let nextHandle = 1;
  const queue = new Map<number, () => void>();
  return {
    clock: {
      now: () => now,
      requestFrame: (callback) => {
        const handle = nextHandle++;
        queue.set(handle, callback);
        return handle;
      },
      cancelFrame: (handle) => void queue.delete(handle),
    },
    run(at) {
      now = at;
      const callbacks = [...queue.values()];
      queue.clear();
      for (const callback of callbacks) callback();
    },
  };
}

// ---------------------------------------------------------------- recorder

export interface RecordedCommand<C> {
  /** Ticks run before the command. */
  step: number;
  command: C;
}

/**
 * A simulation wrapper that records every command with its step, so a run replays from the
 * seed: `replay(create)` builds a fresh simulation, repeats the ticks and commands in order,
 * and returns its snapshot (the replay test compares it with `snapshot()`).
 */
export interface Recorder<S, C, E> extends Simulation<S, C, E> {
  readonly seed: number;
  readonly step: number;
  readonly commands: readonly RecordedCommand<C>[];
  replay(create: (seed: number) => Simulation<S, C, E>): S;
}

export function createRecorder<S, C, E>(seed: number, sim: Simulation<S, C, E>): Recorder<S, C, E> {
  const commands: RecordedCommand<C>[] = [];
  let step = 0;
  return {
    seed,
    get step() {
      return step;
    },
    get state() {
      return sim.state;
    },
    commands,
    dispatch(command) {
      commands.push({ step, command });
      return sim.dispatch(command);
    },
    tick() {
      step += 1;
      return sim.tick();
    },
    snapshot: () => sim.snapshot(),
    replay(create) {
      const fresh = create(seed);
      let at = 0;
      for (const { step: target, command } of commands) {
        for (; at < target; at++) fresh.tick();
        fresh.dispatch(command);
      }
      for (; at < step; at++) fresh.tick();
      return fresh.snapshot();
    },
  };
}
