/** A recorded Sorcerer's Ziggurat run replays to the same snapshot and events from its seed. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createSorcererZiggurat, type ZigguratEvent } from '../../src/sorcerer-ziggurat/core/index.js';
import { nextStep } from '../../src/sorcerer-ziggurat/qc/bot.js';
import { STORY, create } from './helpers.js';

describe('replay', () => {
  it('same seed + same commands -> same snapshot and events', () => {
    const seed = 1234;
    const rec = createRecorder(seed, create(seed));
    const chaos = createRng(99);
    const events: ZigguratEvent[] = [];
    for (let n = 0; n < 200 && rec.state.phase === 'climbing'; n++) {
      const roll = chaos.next();
      if (roll < 0.5) {
        const c = nextStep(rec.state);
        if (c) events.push(...rec.dispatch(c));
      } else if (roll < 0.9) {
        const cube = rec.state.cubes[chaos.int(rec.state.cubes.length)];
        if (cube) events.push(...rec.dispatch({ type: 'step', cubeId: cube.id }));
      } else {
        events.push(...rec.dispatch({ type: 'step', lane: (['left', 'forward', 'right'] as const)[chaos.int(3)]! }));
      }
      events.push(...rec.tick());
    }
    expect(rec.commands.length).toBeGreaterThan(5);
    expect(events.some((e) => e.type === 'cubeCrumbled')).toBe(true);
    expect(events.some((e) => e.type === 'stepped')).toBe(true);
    const replayed = rec.replay((s) => createSorcererZiggurat(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
    // A different seed gives a different climb.
    const other = createSorcererZiggurat(STORY, { seed: seed + 1, helper: false }).state;
    expect(other.climb.map((r) => r.id)).not.toEqual(create(seed).state.climb.map((r) => r.id));
  });

  it('snapshot() is a deep copy', () => {
    const sim = create(1);
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    expect(snap).not.toBe(sim.state);
    snap.cubes[0]!.word = 'changed';
    expect(sim.state.cubes[0]!.word).not.toBe('changed');
  });
});
