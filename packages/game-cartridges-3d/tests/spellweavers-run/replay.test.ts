/** A recorded Spellweaver's Run replays to the same snapshot from its seed. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createSpellweaversRun, type SpellweaversEvent } from '../../src/spellweavers-run/core/index.js';
import { nextChoice } from '../../src/spellweavers-run/qc/bot.js';
import { STORY, create, stepsOf } from './helpers.js';

describe('replay', () => {
  it('same seed + same commands at the same steps -> same events and snapshot', () => {
    const seed = 1234;
    const rec = createRecorder(seed, create(seed));
    const chaos = createRng(99);
    const events: SpellweaversEvent[] = [];
    for (let step = 0; step < stepsOf(180_000) && rec.state.phase !== 'complete'; step++) {
      const roll = chaos.next();
      if (roll < 0.1) {
        const c = nextChoice(rec.state);
        if (c) events.push(...rec.dispatch(c));
      } else if (roll < 0.14) {
        events.push(...rec.dispatch({ type: 'choose', lane: chaos.int(3) }));
      }
      events.push(...rec.tick());
    }
    expect(rec.commands.length).toBeGreaterThan(10);
    expect(events.some((e) => e.type === 'wordCollected')).toBe(true);
    expect(events.some((e) => e.type === 'courageLost')).toBe(true);
    const replayed = rec.replay((s) => createSpellweaversRun(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
    // The same seed gives the same events; a different seed gives a different run.
    const again = createRecorder(seed, create(seed));
    const second: SpellweaversEvent[] = [];
    const chaos2 = createRng(99);
    for (let step = 0; step < stepsOf(180_000) && again.state.phase !== 'complete'; step++) {
      const roll = chaos2.next();
      if (roll < 0.1) {
        const c = nextChoice(again.state);
        if (c) second.push(...again.dispatch(c));
      } else if (roll < 0.14) {
        second.push(...again.dispatch({ type: 'choose', lane: chaos2.int(3) }));
      }
      second.push(...again.tick());
    }
    expect(second).toEqual(events);
    const other = create(seed + 1).snapshot();
    expect(other.sentences.map((s) => s.id)).not.toEqual(replayed.sentences.map((s) => s.id));
  });

  it('snapshot() is a deep copy', () => {
    const sim = create(1);
    sim.tick();
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    expect(snap).not.toBe(sim.state);
    snap.sentences[0]!.misses = 99;
    expect(sim.state.sentences[0]!.misses).toBe(0);
  });
});
