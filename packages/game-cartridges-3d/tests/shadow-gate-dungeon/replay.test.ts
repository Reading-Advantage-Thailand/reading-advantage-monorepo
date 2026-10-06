/** A recorded Shadow Gate Dungeon run replays to the same snapshot from its seed. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createShadowGate, type ShadowGateEvent } from '../../src/shadow-gate-dungeon/core/index.js';
import { nextSteer } from '../../src/shadow-gate-dungeon/qc/bot.js';
import { STORY, create, stepsOf } from './helpers.js';

describe('replay', () => {
  it('same seed + same commands at the same steps -> same snapshot and events', () => {
    const seed = 1234;
    const run = () => {
      const rec = createRecorder(seed, create(seed));
      const chaos = createRng(99);
      const events: ShadowGateEvent[] = [];
      for (let step = 0; step < stepsOf(120_000) && rec.state.phase === 'playing'; step++) {
        const roll = chaos.next();
        if (roll < 0.2) {
          const c = nextSteer(rec.state);
          if (c) events.push(...rec.dispatch(c));
        } else if (roll < 0.25) {
          events.push(...rec.dispatch({ type: 'steer', x: chaos.next() * 2 - 1, z: chaos.next() * 2 - 1 }));
        }
        events.push(...rec.tick());
      }
      return { rec, events };
    };
    const a = run();
    const b = run();
    expect(a.rec.commands.length).toBeGreaterThan(10);
    expect(a.events.some((e) => e.type === 'crystalTaken')).toBe(true);
    expect(b.events).toEqual(a.events);
    const replayed = a.rec.replay((s) => createShadowGate(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(a.rec.snapshot());
    // A different seed gives a different delve.
    const other = createShadowGate(STORY, { seed: seed + 1, helper: false }).snapshot();
    expect(other.shift.map((r) => r.id)).not.toEqual(replayed.shift.map((r) => r.id));
  });

  it('snapshot() is a deep copy', () => {
    const sim = create(1);
    sim.tick();
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    expect(snap).not.toBe(sim.state);
    snap.crystals[0]!.x = 99;
    expect(sim.state.crystals[0]!.x).not.toBe(99);
  });
});
