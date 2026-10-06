import { describe, expect, it } from 'vitest';
import {
  MAX_FRAME_MS,
  MAX_STEPS_PER_FRAME,
  STEP_MS,
  angleDelta,
  createFixedStepLoop,
  createManualClock,
  createRecorder,
  createRng,
  damp,
  easeInOutCubic,
  easeOutBack,
  easeOutQuad,
  hashString,
  lerp,
  lerpAngle,
  pingPong,
  remap,
  smoothstep,
  type LoopClock,
  type Simulation,
} from '../sim/index.js';
import { BOUNDED_FRAME_DELTA_CEILING_MS } from '../contracts/index.js';

// ---------------------------------------------------------------- a small simulation

interface CounterState {
  ticks: number;
  hits: number;
  log: string[];
}
type CounterCommand = { type: 'hit'; id: string };
type CounterEvent = { type: 'ticked'; ticks: number } | { type: 'hit'; id: string; roll: number };

/** A seeded counter: every hit rolls the rng, so a replay must repeat the same rolls. */
function createCounter(seed: number): Simulation<CounterState, CounterCommand, CounterEvent> {
  const rng = createRng(seed);
  const state: CounterState = { ticks: 0, hits: 0, log: [] };
  return {
    state,
    dispatch(command) {
      const roll = rng.int(100);
      state.hits += 1;
      state.log.push(`${state.ticks}:${command.id}:${roll}`);
      return [{ type: 'hit', id: command.id, roll }];
    },
    tick() {
      state.ticks += 1;
      return [{ type: 'ticked', ticks: state.ticks }];
    },
    snapshot: () => structuredClone(state),
  };
}

/** A clock the test advances by hand; `flush()` runs the scheduled frame. */
function fakeClock(): LoopClock & { advance(ms: number): void; flush(): number; pending: number } {
  let t = 1000;
  let next: (() => void) | null = null;
  let handle = 0;
  return {
    now: () => t,
    requestFrame(callback) {
      next = callback;
      return ++handle;
    },
    cancelFrame() {
      next = null;
    },
    advance(ms) {
      t += ms;
    },
    flush() {
      const cb = next;
      next = null;
      cb?.();
      return handle;
    },
    get pending() {
      return next ? 1 : 0;
    },
  };
}

function harness() {
  const sim = createCounter(1);
  const clock = fakeClock();
  const frames: { events: CounterEvent[]; alpha: number }[] = [];
  const loop = createFixedStepLoop(
    sim,
    { render: (events, alpha) => frames.push({ events: [...events], alpha }) },
    clock,
  );
  return { sim, clock, frames, loop };
}

describe('fixed-step loop', () => {
  it('uses the APK frame ceiling and the 30 Hz step', () => {
    expect(MAX_FRAME_MS).toBe(BOUNDED_FRAME_DELTA_CEILING_MS);
    expect(MAX_FRAME_MS).toBe(50);
    expect(STEP_MS).toBeCloseTo(33.333, 3);
    expect(MAX_STEPS_PER_FRAME).toBe(2);
  });

  it('runs one step per 33 ms and interpolates between steps', () => {
    const { sim, clock, frames, loop } = harness();
    loop.start();
    expect(loop.running).toBe(true);
    clock.advance(16);
    clock.flush();
    expect(sim.state.ticks).toBe(0);
    expect(frames[0]!.alpha).toBeCloseTo(16 / STEP_MS, 6);
    clock.advance(20);
    clock.flush();
    expect(sim.state.ticks).toBe(1);
    expect(frames[1]!.events).toEqual([{ type: 'ticked', ticks: 1 }]);
    expect(frames[1]!.alpha).toBeCloseTo((36 - STEP_MS) / STEP_MS, 6);
    loop.stop();
    expect(loop.running).toBe(false);
    expect(clock.pending).toBe(0);
  });

  it('runs at most 2 steps for a long frame and drops the rest', () => {
    const { sim, clock, loop } = harness();
    loop.start();
    clock.advance(5000);
    clock.flush();
    expect(sim.state.ticks).toBeLessThanOrEqual(MAX_STEPS_PER_FRAME);
    const before = sim.state.ticks;
    clock.advance(5000);
    clock.flush();
    expect(sim.state.ticks - before).toBeLessThanOrEqual(MAX_STEPS_PER_FRAME);
    // Ten seconds of wall time in ten frames: never caught up.
    for (let i = 0; i < 8; i++) {
      clock.advance(1000);
      clock.flush();
    }
    expect(loop.steps).toBe(sim.state.ticks);
    expect(sim.state.ticks).toBeLessThanOrEqual(10 * MAX_STEPS_PER_FRAME);
    expect(sim.state.ticks).toBeCloseTo(Math.floor((10 * MAX_FRAME_MS) / STEP_MS), -1);
  });

  it('never runs more than MAX_STEPS_PER_FRAME steps when the accumulator is large', () => {
    // A frame of MAX_FRAME_MS on top of a nearly full accumulator still gives two steps at most.
    const { sim, clock, loop } = harness();
    loop.start();
    clock.advance(STEP_MS - 0.001);
    clock.flush();
    expect(sim.state.ticks).toBe(0);
    clock.advance(10_000);
    clock.flush();
    expect(sim.state.ticks).toBe(2);
  });

  it('reset empties the accumulator so resume runs no catch-up steps', () => {
    const { sim, clock, loop } = harness();
    loop.start();
    clock.advance(30);
    clock.flush();
    loop.stop();
    clock.advance(60_000);
    loop.reset();
    loop.start();
    clock.advance(1);
    clock.flush();
    expect(sim.state.ticks).toBe(0);
  });

  it('renders dispatched events before the tick events of the same frame, in order', () => {
    const { clock, frames, loop } = harness();
    loop.start();
    loop.dispatch({ type: 'hit', id: 'a' });
    loop.dispatch({ type: 'hit', id: 'b' });
    clock.advance(40);
    clock.flush();
    expect(frames[0]!.events.map((e) => (e.type === 'hit' ? e.id : e.type))).toEqual(['a', 'b', 'ticked']);
    clock.advance(1);
    clock.flush();
    expect(frames[1]!.events).toEqual([]);
  });

  it('start is idempotent and stop cancels the pending frame', () => {
    const { clock, loop } = harness();
    loop.start();
    loop.start();
    expect(clock.pending).toBe(1);
    loop.stop();
    expect(clock.pending).toBe(0);
    clock.flush();
    expect(loop.running).toBe(false);
  });

  it('frame() drives the loop by hand without a scheduler', () => {
    const sim = createCounter(3);
    let t = 0;
    const clock: LoopClock = { now: () => t, requestFrame: () => 0, cancelFrame: () => {} };
    const loop = createFixedStepLoop(sim, { render: () => {} }, clock);
    loop.start();
    t = 100;
    loop.frame();
    expect(sim.state.ticks).toBe(1); // 100 ms clamps to 50 ms: one step
    t = 200;
    loop.frame();
    expect(sim.state.ticks).toBe(3); // 16.7 left + 50 = two steps
  });
});

describe('manual clock (a Phaser scene drives the loop)', () => {
  it('steps once per run() at the fixed step and clamps a long frame', () => {
    const manual = createManualClock();
    const ticks: number[] = [];
    const sim: Simulation<number, never, number> = {
      state: 0,
      dispatch: () => [],
      tick: () => {
        ticks.push(1);
        return [ticks.length];
      },
      snapshot: () => ticks.length,
    };
    const rendered: number[][] = [];
    const loop = createFixedStepLoop(sim, { render: (events) => rendered.push([...events]) }, manual.clock);
    loop.start();
    manual.run(0);
    expect(ticks.length).toBe(0);
    manual.run(34);
    expect(ticks.length).toBe(1);
    manual.run(34 + 500); // a long frame counts as MAX_FRAME_MS (50 ms): one step, 17 ms kept
    expect(ticks.length).toBe(2);
    manual.run(34 + 500 + 50); // 67 ms in the accumulator: two steps, the cap per frame
    expect(ticks.length).toBe(4);
    expect(rendered.length).toBe(4);
    loop.stop();
    manual.run(1000);
    expect(ticks.length).toBe(4);
  });
});

describe('recorder', () => {
  it('records commands with their step and replays to the same snapshot', () => {
    const rec = createRecorder(42, createCounter(42));
    rec.tick();
    rec.tick();
    rec.dispatch({ type: 'hit', id: 'a' });
    rec.tick();
    rec.dispatch({ type: 'hit', id: 'b' });
    rec.dispatch({ type: 'hit', id: 'c' });
    for (let i = 0; i < 5; i++) rec.tick();
    expect(rec.step).toBe(8);
    expect(rec.commands).toEqual([
      { step: 2, command: { type: 'hit', id: 'a' } },
      { step: 3, command: { type: 'hit', id: 'b' } },
      { step: 3, command: { type: 'hit', id: 'c' } },
    ]);
    const replayed = rec.replay(createCounter);
    expect(replayed).toEqual(rec.snapshot());
    expect(replayed.ticks).toBe(8);
    expect(replayed.hits).toBe(3);
    expect(replayed.log[0]).toMatch(/^2:a:\d+$/);
    // A different seed gives different rolls, so the log differs.
    expect(rec.replay((seed) => createCounter(seed + 1))).not.toEqual(rec.snapshot());
  });

  it('replays through the loop too', () => {
    const rec = createRecorder(9, createCounter(9));
    const clock = fakeClock();
    const loop = createFixedStepLoop(rec, { render: () => {} }, clock);
    loop.start();
    for (let i = 0; i < 20; i++) {
      if (i % 4 === 1) loop.dispatch({ type: 'hit', id: `h${i}` });
      clock.advance(16.7);
      clock.flush();
    }
    loop.stop();
    expect(rec.step).toBeGreaterThan(5);
    expect(rec.commands.length).toBe(5);
    expect(rec.replay(createCounter)).toEqual(rec.snapshot());
  });
});

describe('rng', () => {
  it('is the same generator the demo used', () => {
    expect(createRng(42).next()).toBeCloseTo(createRng(42).next(), 12);
    expect(hashString('pip-is-brave')).toBe(hashString('pip-is-brave'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});

describe('motion', () => {
  it('easing functions start at 0, end at 1, and clamp', () => {
    for (const f of [smoothstep, easeOutQuad, easeInOutCubic, easeOutBack]) {
      expect(f(0)).toBeCloseTo(0, 10);
      expect(f(1)).toBeCloseTo(1, 10);
      expect(f(-1)).toBeCloseTo(f(0), 10);
      expect(f(2)).toBeCloseTo(f(1), 10);
    }
    expect(easeOutBack(0.8)).toBeGreaterThan(1);
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 10);
  });

  it('lerp, remap, damp, angles, pingPong', () => {
    expect(lerp(2, 4, 0.25)).toBe(2.5);
    expect(remap(5, 0, 10, 100, 200)).toBe(150);
    expect(remap(50, 0, 10, 100, 200)).toBe(200);
    expect(damp(0, 10, 4, 0)).toBe(0);
    expect(damp(0, 10, 4, 10)).toBeCloseTo(10, 6);
    expect(damp(0, 10, 4, 0.25)).toBeCloseTo(10 * (1 - Math.exp(-1)), 10);
    expect(angleDelta(350, 10)).toBe(20);
    expect(angleDelta(10, 350)).toBe(-20);
    expect(angleDelta(0, 180)).toBe(180);
    expect(lerpAngle(350, 10, 0.5)).toBe(360);
    expect(pingPong(0.25)).toBe(0.5);
    expect(pingPong(0.75)).toBe(0.5);
    expect(pingPong(1.5)).toBe(1);
  });
});
