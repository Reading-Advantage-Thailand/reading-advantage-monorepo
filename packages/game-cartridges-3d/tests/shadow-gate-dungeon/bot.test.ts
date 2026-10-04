/** The QC bot plays a whole delve within a step limit, on the state alone, steering a few times per second. */
import { describe, expect, it } from 'vitest';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createShadowGate, evidenceOf, type ShadowGateEvent } from '../../src/shadow-gate-dungeon/core/index.js';
import { nextSteer } from '../../src/shadow-gate-dungeon/qc/bot.js';
import { LONG_STORY, STORY, ofType, stepsOf } from './helpers.js';

const LIMIT_STEPS = stepsOf(8 * 60_000);
/** The bot steers every 5 steps (6 times per second), as the QC driver does. */
const STEER_EVERY = 5;

describe('bot', () => {
  it.each(
    Array.from({ length: 40 }, (_, i) => i + 1).flatMap((seed) =>
      (['pip-is-brave', 'the-school-garden'] as const).map((story) => [seed, seed % 2 === 0, story] as const),
    ),
  )('seed %i helper %s plays %s to the end', { timeout: 30_000 }, (seed, helper, inputId) => {
    const story = inputId === 'pip-is-brave' ? STORY : LONG_STORY;
    const sim = createRecorder(seed, createShadowGate(story, { seed, helper }));
    const events: ShadowGateEvent[] = [];
    let steps = 0;
    while (sim.state.phase === 'playing' && steps < LIMIT_STEPS) {
      if (steps % STEER_EVERY === 0) {
        const c = nextSteer(sim.state);
        if (c) events.push(...sim.dispatch(c));
      }
      events.push(...sim.tick());
      steps += 1;
    }
    expect(sim.state.phase).toBe('complete');
    expect(steps).toBeLessThan(LIMIT_STEPS);
    expect(sim.state.roomsCleared).toBe(sim.state.rooms);
    expect(ofType(events, 'delveComplete')).toHaveLength(1);
    expect(sim.state.shift.every((r) => r.cleared)).toBe(true);
    // One evidence item per story item (room), all solved.
    const evidence = evidenceOf(sim.state, story, seed, 0);
    expect(evidence.items).toHaveLength(sim.state.rooms);
    expect(evidence.items.every((i) => i.solved)).toBe(true);
    // The bot reads: it takes the right crystal; a brush past a wrong one is rare.
    expect(ofType(events, 'crystalRefused').length).toBeLessThanOrEqual(sim.state.rooms * 2);
    expect(ofType(events, 'crystalTaken')).toHaveLength(sim.state.shift.reduce((n, r) => n + r.words.length, 0));
  });

  it('returns null with nothing to do, and waits while the hero is pushed back', () => {
    const sim = createShadowGate(STORY, { seed: 1, helper: false });
    const c = nextSteer(sim.state)!;
    expect(c.type).toBe('steer');
    expect(Math.hypot(c.x, c.z)).toBeCloseTo(1);
    sim.state.hero.bumpedMs = 100;
    expect(nextSteer(sim.state)).toBeNull();
    expect(nextSteer(createShadowGate([], { seed: 1, helper: false }).state)).toBeNull();
  });
});
