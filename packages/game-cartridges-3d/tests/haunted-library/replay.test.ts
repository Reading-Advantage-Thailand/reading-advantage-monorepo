/** A recorded Haunted Library run replays to the same snapshot from its seed. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createHauntedLibrary, type LibraryEvent } from '../../src/haunted-library/core/index.js';
import { nextCommand } from '../../src/haunted-library/qc/bot.js';
import { STORY, create, stepsOf } from './helpers.js';

describe('replay', () => {
  it('same seed + same commands at the same steps -> same snapshot and same events', () => {
    const seed = 1234;
    const rec = createRecorder(seed, create(seed));
    const chaos = createRng(99);
    const events: LibraryEvent[] = [];
    for (let step = 0; step < stepsOf(120_000) && rec.state.phase === 'playing'; step++) {
      const roll = chaos.next();
      if (roll < 0.2) {
        const c = nextCommand(rec.state);
        if (c) events.push(...rec.dispatch(c));
      } else if (roll < 0.25) {
        events.push(...rec.dispatch({ type: 'move', dir: chaos.next() * 2 - 1 }));
      } else if (roll < 0.27) {
        events.push(...rec.dispatch({ type: 'drop' }));
      } else if (roll < 0.29) {
        events.push(...rec.dispatch({ type: 'open' }));
      }
      events.push(...rec.tick());
    }
    expect(rec.commands.length).toBeGreaterThan(10);
    expect(events.some((e) => e.type === 'doorOpened')).toBe(true);
    const replayed = rec.replay((s) => createHauntedLibrary(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
    // A different seed gives a different visit.
    const other = createHauntedLibrary(STORY, { seed: seed + 1, helper: false }).snapshot();
    expect(other.shift.map((r) => r.id)).not.toEqual(replayed.shift.map((r) => r.id));
  });

  it('two runs with the same seed give the same events', () => {
    const play = (): LibraryEvent[] => {
      const sim = create(21);
      const out: LibraryEvent[] = [];
      for (let step = 0; step < stepsOf(60_000) && sim.state.phase === 'playing'; step++) {
        if (step % 5 === 0) {
          const c = nextCommand(sim.state);
          if (c) out.push(...sim.dispatch(c));
        }
        out.push(...sim.tick());
      }
      return out;
    };
    expect(play()).toEqual(play());
  });

  it('snapshot() is a deep copy', () => {
    const sim = create(1);
    sim.tick();
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    expect(snap).not.toBe(sim.state);
    snap.doors[0]!.x = 99;
    expect(sim.state.doors[0]!.x).not.toBe(99);
  });
});
