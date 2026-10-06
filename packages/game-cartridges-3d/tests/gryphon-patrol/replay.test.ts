/** A recorded Gryphon Patrol replays to the same snapshot from its seed. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createGryphonPatrol, type PatrolEvent } from '../../src/gryphon-patrol/core/index.js';
import { nextChoice } from '../../src/gryphon-patrol/qc/bot.js';
import { STORY, create, stepsOf } from './helpers.js';

function play(seed: number) {
  const rec = createRecorder(seed, create(seed));
  const chaos = createRng(99);
  const events: PatrolEvent[] = [];
  for (let step = 0; step < stepsOf(240_000) && rec.state.phase !== 'complete'; step++) {
    const roll = chaos.next();
    if (roll < 0.06) {
      const c = nextChoice(rec.state);
      if (c) events.push(...rec.dispatch(c));
    } else if (roll < 0.1) {
      events.push(...rec.dispatch({ type: 'shoot', enemy: `e${1 + chaos.int(4)}` }));
    } else if (roll < 0.14) {
      events.push(...rec.dispatch({ type: 'moveTo', x: chaos.next() * 16, y: chaos.next() * 9 }));
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
    const replayed = rec.replay((s) => createGryphonPatrol(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
    // The same seed gives the same events; a different seed gives a different patrol.
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
    snap.round!.enemies[0]!.x = -5;
    expect(sim.state.sentences[0]!.misses).toBe(0);
    expect(sim.state.round!.enemies[0]!.x).not.toBe(-5);
  });
});
