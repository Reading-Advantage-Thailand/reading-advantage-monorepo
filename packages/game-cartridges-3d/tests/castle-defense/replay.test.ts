/** A Castle Defense run is a function of its seed: the same commands replay to the same snapshot. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createCastleDefense, type CastleDefenseEvent } from '../../src/castle-defense/core/index.js';
import { nextCommand } from '../../src/castle-defense/qc/bot.js';
import { STORY, create, wrongChoice } from './helpers.js';

describe('replay', () => {
  it('same seed -> same waves and first step', () => {
    const a = create(42).snapshot();
    expect(create(42).snapshot()).toEqual(a);
    expect(create(43).snapshot().shift.map((s) => s.id)).not.toEqual(a.shift.map((s) => s.id));
  });

  it('same seed + same commands -> same events and snapshot; right, wrong, and rejected commands mixed', () => {
    const run = (): { events: CastleDefenseEvent[]; snapshot: unknown } => {
      const sim = create(1234);
      const chaos = createRng(99);
      const events: CastleDefenseEvent[] = [...sim.dispatch({ type: 'start' }), ...sim.dispatch({ type: 'pick', choice: 99 })];
      for (let i = 0; i < 120 && sim.state.phase === 'playing'; i++) {
        const roll = chaos.next();
        if (roll < 0.6) {
          const c = nextCommand(sim.state);
          if (c) events.push(...sim.dispatch(c));
        } else if (roll < 0.85) {
          if (sim.state.step?.choices.some((c) => !c.right && !c.blocked)) events.push(...sim.dispatch({ type: 'pick', choice: wrongChoice(sim) }));
        } else {
          events.push(...sim.dispatch({ type: 'pick', choice: 99 }), ...sim.dispatch({ type: 'build', post: 99 }));
        }
      }
      return { events, snapshot: sim.snapshot() };
    };
    const a = run();
    const b = run();
    expect(a.events).toEqual(b.events);
    expect(a.snapshot).toEqual(b.snapshot);
    expect(a.events.some((e) => e.type === 'rejected')).toBe(true);
    expect(a.events.some((e) => e.type === 'attackerStrike')).toBe(true);
    expect(a.events.some((e) => e.type === 'volley')).toBe(true);
  });

  it('the recorder replays the commands to the same snapshot', () => {
    const rec = createRecorder(77, create(77));
    rec.dispatch({ type: 'start' });
    for (let i = 0; i < 40 && rec.state.phase === 'playing'; i++) {
      const c = nextCommand(rec.state);
      if (c) rec.dispatch(c);
      if (i % 5 === 4 && rec.state.step) {
        const wrong = rec.state.step.choices.find((x) => !x.right && !x.blocked);
        if (wrong) rec.dispatch({ type: 'pick', choice: wrong.index });
      }
      rec.tick();
    }
    expect(rec.commands.length).toBeGreaterThan(10);
    const replayed = rec.replay((s) => createCastleDefense(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
  });

  it('snapshot() is a deep copy and tick() returns nothing', () => {
    const sim = create(1);
    expect(sim.tick()).toEqual([]);
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    expect(snap).not.toBe(sim.state);
    snap.shift[0]!.cleared = true;
    expect(sim.state.shift[0]!.cleared).toBe(false);
  });
});
