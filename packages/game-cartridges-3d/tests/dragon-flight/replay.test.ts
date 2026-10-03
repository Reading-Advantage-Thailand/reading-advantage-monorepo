/** A recorded Dragon Flight replays to the same snapshot from its seed. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createDragonFlight, type DragonFlightEvent } from '../../src/dragon-flight/core/index.js';
import { nextChoice } from '../../src/dragon-flight/qc/bot.js';
import { STORY, create, stepsOf } from './helpers.js';

describe('replay', () => {
  it('same seed + same commands at the same steps -> same snapshot', () => {
    const seed = 1234;
    const rec = createRecorder(seed, create(seed));
    const chaos = createRng(99);
    const events: DragonFlightEvent[] = [];
    for (let step = 0; step < stepsOf(5 * 60_000) && rec.state.phase !== 'complete'; step++) {
      const roll = chaos.next();
      if (roll < 0.01) {
        const c = nextChoice(rec.state);
        if (c) events.push(...rec.dispatch(c));
      } else if (roll < 0.015) {
        events.push(...rec.dispatch({ type: 'choose', gate: chaos.int(3) }));
      }
      events.push(...rec.tick());
    }
    expect(rec.commands.length).toBeGreaterThan(5);
    expect(rec.state.roundIndex).toBeGreaterThan(2);
    expect(events.some((e) => e.type === 'gateChosen' && !e.correct)).toBe(true);
    const replayed = rec.replay((s) => createDragonFlight(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
    // A different seed gives a different flight.
    const other = createDragonFlight(STORY, { seed: seed + 1, helper: false }).snapshot();
    expect(other.words.map((w) => w.id)).not.toEqual(replayed.words.map((w) => w.id));
  });

  it('snapshot() is a deep copy', () => {
    const sim = create(1);
    sim.tick();
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    expect(snap).not.toBe(sim.state);
    snap.round = null;
    snap.words[0]!.attempts = 9;
    expect(sim.state.round).not.toBeNull();
    expect(sim.state.words[0]!.attempts).toBe(0);
  });
});
