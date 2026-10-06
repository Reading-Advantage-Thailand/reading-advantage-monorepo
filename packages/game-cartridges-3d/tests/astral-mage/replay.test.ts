/** A recorded Astral Mage run replays to the same snapshot from its seed. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createAstralMage, type AstralMageEvent } from '../../src/astral-mage/core/index.js';
import { nextCast } from '../../src/astral-mage/qc/bot.js';
import { STORY, create, stepsOf } from './helpers.js';

describe('replay', () => {
  it('same seed + same commands at the same steps -> same snapshot and events', () => {
    const seed = 1234;
    const rec = createRecorder(seed, create(seed));
    const chaos = createRng(99);
    const events: AstralMageEvent[] = [];
    for (let step = 0; step < stepsOf(120_000) && rec.state.phase === 'playing'; step++) {
      const roll = chaos.next();
      const live = rec.state.crystals.filter((c) => !c.struck);
      if (roll < 0.15) {
        const c = nextCast(rec.state);
        if (c) events.push(...rec.dispatch(c));
      } else if (roll < 0.2 && live.length > 0) {
        events.push(...rec.dispatch({ type: 'cast', crystalId: live[chaos.int(live.length)]!.id }));
      } else if (roll < 0.25) {
        events.push(...rec.dispatch({ type: 'aim', dir: chaos.next() < 0.5 ? -1 : 1 }));
      } else if (roll < 0.28) {
        events.push(...rec.dispatch({ type: 'cast' }));
      }
      events.push(...rec.tick());
    }
    expect(rec.commands.length).toBeGreaterThan(10);
    expect(events.some((e) => e.type === 'crystalStruck')).toBe(true);
    expect(events.some((e) => e.type === 'crystalFizzled')).toBe(true);
    const replayed = rec.replay((s) => createAstralMage(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
    // The same seed gives the same events again; a different seed gives a different casting.
    const again = createRecorder(seed, create(seed));
    const first = again.tick();
    const other = createAstralMage(STORY, { seed: seed + 1, helper: false }).snapshot();
    expect(first.find((e) => e.type === 'ritualStarted')).toEqual(create(seed).tick().find((e) => e.type === 'ritualStarted'));
    expect(other.casting.map((r) => r.id)).not.toEqual(replayed.casting.map((r) => r.id));
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
