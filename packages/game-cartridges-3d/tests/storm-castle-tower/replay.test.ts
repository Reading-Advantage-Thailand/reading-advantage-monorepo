/** A recorded Storm Castle Tower run replays to the same snapshot from its seed. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createStormCastleTower, type StormCastleTowerEvent } from '../../src/storm-castle-tower/core/index.js';
import { nextCommand } from '../../src/storm-castle-tower/qc/bot.js';
import { STORY, create, stepsOf } from './helpers.js';

describe('replay', () => {
  it('same seed + same commands at the same steps -> same snapshot and events', () => {
    const seed = 1234;
    const rec = createRecorder(seed, create(seed));
    const chaos = createRng(99);
    const events: StormCastleTowerEvent[] = [];
    for (let step = 0; step < stepsOf(150_000) && rec.state.phase === 'playing'; step++) {
      const roll = chaos.next();
      if (roll < 0.12) {
        const c = nextCommand(rec.state);
        if (c) events.push(...rec.dispatch(c));
      } else if (roll < 0.18) {
        events.push(...rec.dispatch({ type: 'steer', x: chaos.next() * 2 - 1, z: chaos.next() * 2 - 1 }));
      }
      events.push(...rec.tick());
    }
    expect(rec.commands.length).toBeGreaterThan(10);
    expect(events.some((e) => e.type === 'hazardFell')).toBe(true);
    expect(events.some((e) => e.type === 'windowOpened')).toBe(true);
    const replayed = rec.replay((s) => createStormCastleTower(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
    // The same seed gives the same first events; a different seed gives a different climb.
    const first = create(seed).tick().find((e) => e.type === 'windowsPlaced');
    expect(first).toEqual(create(seed).tick().find((e) => e.type === 'windowsPlaced'));
    const other = createStormCastleTower(STORY, { seed: seed + 1, helper: false }).snapshot();
    expect(other.shift.map((r) => r.id)).not.toEqual(create(seed).state.shift.map((r) => r.id));
  });

  it('snapshot() is a deep copy', () => {
    const sim = create(1);
    sim.tick();
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    expect(snap).not.toBe(sim.state);
    snap.windows[0]!.col = 99;
    expect(sim.state.windows[0]!.col).not.toBe(99);
  });
});
