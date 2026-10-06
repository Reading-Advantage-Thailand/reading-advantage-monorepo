/** A recorded Griffin Sky-Joust replays to the same snapshot from its seed. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createGriffinSkyJoust, type JoustCommand, type JoustEvent } from '../../src/griffin-sky-joust/core/index.js';
import { nextCommand } from '../../src/griffin-sky-joust/qc/bot.js';
import { STORY, create, stepsOf } from './helpers.js';

/** Plays 3 minutes of seeded random taps mixed with the bot; returns the events. */
function chaosRun(rec: ReturnType<typeof createRecorder<ReturnType<typeof create>['state'], JoustCommand, JoustEvent>>, chaosSeed: number): JoustEvent[] {
  const chaos = createRng(chaosSeed);
  const events: JoustEvent[] = [];
  for (let step = 0; step < stepsOf(180_000) && rec.state.phase !== 'complete'; step++) {
    const roll = chaos.next();
    if (roll < 0.12) {
      const c = nextCommand(rec.state);
      if (c) events.push(...rec.dispatch(c));
    } else if (roll < 0.2) {
      events.push(...rec.dispatch(chaos.next() < 0.5 ? { type: 'flap', dir: (chaos.int(3) - 1) as -1 | 0 | 1 } : { type: 'drift', dir: chaos.next() < 0.5 ? -1 : 1 }));
    }
    events.push(...rec.tick());
  }
  return events;
}

describe('replay', () => {
  it('same seed + same commands at the same steps -> same events and snapshot', () => {
    const seed = 1234;
    const rec = createRecorder(seed, create(seed));
    const events = chaosRun(rec, 99);
    expect(rec.commands.length).toBeGreaterThan(20);
    expect(events.some((e) => e.type === 'wordStruck')).toBe(true);
    const replayed = rec.replay((s) => createGriffinSkyJoust(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
    const again = createRecorder(seed, create(seed));
    expect(chaosRun(again, 99)).toEqual(events);
    expect(create(seed + 1).snapshot().sentences.map((s) => s.id)).not.toEqual(replayed.sentences.map((s) => s.id));
  });

  it('snapshot() is a deep copy', () => {
    const sim = create(1);
    sim.tick();
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    expect(snap).not.toBe(sim.state);
    snap.sentences[0]!.misses = 99;
    snap.griffin.x = -5;
    expect(sim.state.sentences[0]!.misses).toBe(0);
    expect(sim.state.griffin.x).not.toBe(-5);
  });
});
