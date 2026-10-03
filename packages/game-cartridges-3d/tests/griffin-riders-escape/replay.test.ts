/** A recorded Griffin Riders Escape replays to the same snapshot from its seed. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createGriffinRidersEscape, type EscapeEvent } from '../../src/griffin-riders-escape/core/index.js';
import { nextChoice } from '../../src/griffin-riders-escape/qc/bot.js';
import { STORY, create, stepsOf } from './helpers.js';

function play(seed: number) {
  const rec = createRecorder(seed, create(seed));
  const chaos = createRng(99);
  const events: EscapeEvent[] = [];
  for (let step = 0; step < stepsOf(240_000) && rec.state.phase !== 'complete'; step++) {
    const roll = chaos.next();
    if (roll < 0.05) {
      const c = nextChoice(rec.state);
      if (c) events.push(...rec.dispatch(c));
    } else if (roll < 0.09) {
      events.push(...rec.dispatch({ type: 'lane', lane: chaos.int(3) }));
    } else if (roll < 0.11) {
      events.push(...rec.dispatch({ type: 'steer', dir: chaos.next() < 0.5 ? -1 : 1 }));
    }
    events.push(...rec.tick());
  }
  return { rec, events };
}

describe('replay', () => {
  it('same seed + same commands at the same steps -> same events and snapshot', () => {
    const seed = 1234;
    const { rec, events } = play(seed);
    expect(rec.commands.length).toBeGreaterThan(10);
    expect(events.some((e) => e.type === 'wordCollected')).toBe(true);
    expect(events.some((e) => e.type === 'courageLost')).toBe(true);
    const replayed = rec.replay((s) => createGriffinRidersEscape(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
    expect(play(seed).events).toEqual(events);
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
    snap.waves[0]!.gates[0]!.text = 'changed';
    expect(sim.state.sentences[0]!.misses).toBe(0);
    expect(sim.state.waves[0]!.gates[0]!.text).not.toBe('changed');
  });
});
