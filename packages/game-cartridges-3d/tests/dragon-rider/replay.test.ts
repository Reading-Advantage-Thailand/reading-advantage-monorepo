/** A recorded Dragon Rider replays to the same snapshot from its seed. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createDragonRider, type DragonRiderEvent } from '../../src/dragon-rider/core/index.js';
import { nextChoice } from '../../src/dragon-rider/qc/bot.js';
import { STORY, create, stepsOf } from './helpers.js';

describe('replay', () => {
  it('same seed + same commands at the same steps -> same snapshot and same events', () => {
    const seed = 1234;
    const rec = createRecorder(seed, create(seed));
    const chaos = createRng(99);
    const events: DragonRiderEvent[] = [];
    for (let step = 0; step < stepsOf(8 * 60_000) && rec.state.phase !== 'complete'; step++) {
      const roll = chaos.next();
      if (roll < 0.01) {
        const c = nextChoice(rec.state);
        if (c) events.push(...rec.dispatch(c));
      } else if (roll < 0.015) {
        events.push(...rec.dispatch({ type: 'choose', gate: chaos.int(2) }));
      }
      events.push(...rec.tick());
    }
    expect(rec.commands.length).toBeGreaterThan(5);
    expect(events.some((e) => e.type === 'gateChosen' && !e.correct)).toBe(true);
    const replayed = rec.replay((s) => createDragonRider(STORY, { seed: s }));
    expect(replayed).toEqual(rec.snapshot());
    const other = createDragonRider(STORY, { seed: seed + 1 }).snapshot();
    expect(other.words.map((w) => w.id)).not.toEqual(replayed.words.map((w) => w.id));
  });

  it('snapshot() is a deep copy', () => {
    const sim = create(1);
    sim.tick();
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    snap.round = null;
    snap.words[0]!.attempts = 9;
    expect(sim.state.round).not.toBeNull();
    expect(sim.state.words[0]!.attempts).toBe(0);
  });
});
