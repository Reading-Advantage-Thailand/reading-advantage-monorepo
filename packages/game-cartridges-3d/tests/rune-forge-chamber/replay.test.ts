/** A recorded Rune Forge Chamber run replays to the same snapshot from its seed. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createRuneForgeChamber, type RuneForgeChamberEvent } from '../../src/rune-forge-chamber/core/index.js';
import { nextChoice } from '../../src/rune-forge-chamber/qc/bot.js';
import { STORY, create, stepsOf } from './helpers.js';

describe('replay', () => {
  it('same seed + same commands at the same steps -> same snapshot and events', () => {
    const seed = 1234;
    const rec = createRecorder(seed, create(seed));
    const chaos = createRng(99);
    const events: RuneForgeChamberEvent[] = [];
    for (let step = 0; step < stepsOf(120_000) && rec.state.phase === 'playing'; step++) {
      const roll = chaos.next();
      if (roll < 0.1) {
        const c = nextChoice(rec.state);
        if (c) events.push(...rec.dispatch(c));
      } else if (roll < 0.17) {
        events.push(...rec.dispatch({ type: 'choose', runeId: rec.state.runes[chaos.int(Math.max(1, rec.state.runes.length))]?.id ?? 'x' }));
      } else if (roll < 0.22) {
        events.push(...rec.dispatch({ type: 'aim', dir: chaos.next() < 0.5 ? -1 : 1 }));
      } else if (roll < 0.25) {
        events.push(...rec.dispatch({ type: 'choose' }));
      }
      events.push(...rec.tick());
    }
    expect(rec.commands.length).toBeGreaterThan(10);
    expect(events.some((e) => e.type === 'runeStruck')).toBe(true);
    expect(events.some((e) => e.type === 'runeFizzled')).toBe(true);
    const replayed = rec.replay((s) => createRuneForgeChamber(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
    // The same seed gives the same first wave again; a different seed gives a different forge.
    const first = create(seed).tick().find((e) => e.type === 'waveStarted');
    expect(first).toEqual(create(seed).tick().find((e) => e.type === 'waveStarted'));
    const other = createRuneForgeChamber(STORY, { seed: seed + 1, helper: false }).snapshot();
    expect(other.forge.map((b) => b.id)).not.toEqual(replayed.forge.map((b) => b.id));
  });

  it('snapshot() is a deep copy', () => {
    const sim = create(1);
    sim.tick();
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    expect(snap).not.toBe(sim.state);
    snap.runes[0]!.word = 'changed';
    expect(sim.state.runes[0]!.word).not.toBe('changed');
  });
});
