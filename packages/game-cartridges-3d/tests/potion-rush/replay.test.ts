/** A recorded Potion Rush run replays to the same snapshot from its seed. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createPotionRush, type PotionRushEvent } from '../../src/potion-rush/core/index.js';
import { nextDrop } from '../../src/potion-rush/qc/bot.js';
import { STORY, create, stepsOf } from './helpers.js';

describe('replay', () => {
  it('same seed + same commands at the same steps -> same snapshot', () => {
    const seed = 1234;
    const rec = createRecorder(seed, create(seed));
    const chaos = createRng(99);
    const events: PotionRushEvent[] = [];
    for (let step = 0; step < stepsOf(90_000) && rec.state.phase === 'playing'; step++) {
      const roll = chaos.next();
      if (roll < 0.5) {
        const c = nextDrop(rec.state);
        if (c) events.push(...rec.dispatch(c));
      } else if (roll < 0.6 && rec.state.belt.length > 0) {
        events.push(...rec.dispatch({ type: 'drop', itemId: chaos.pick(rec.state.belt).id, cauldron: chaos.int(3) }));
      }
      events.push(...rec.tick());
    }
    expect(rec.commands.length).toBeGreaterThan(10);
    expect(rec.state.served).toBeGreaterThan(0);
    const replayed = rec.replay((s) => createPotionRush(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
    // A different seed gives a different shift.
    const other = createPotionRush(STORY, { seed: seed + 1, helper: false }).snapshot();
    expect(other.orders.map((o) => o.id)).not.toEqual(replayed.orders.map((o) => o.id));
  });

  it('snapshot() is a deep copy', () => {
    const sim = create(1);
    sim.tick();
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    expect(snap).not.toBe(sim.state);
    snap.slots[0] = null;
    expect(sim.state.slots[0]).not.toBeNull();
  });
});
