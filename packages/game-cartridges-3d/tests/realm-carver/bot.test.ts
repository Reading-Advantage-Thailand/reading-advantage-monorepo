/** The QC bot plays a whole campaign within a step limit, on the state alone. */
import { describe, expect, it } from 'vitest';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createRealmCarver, evidenceOf, type RealmCarverEvent } from '../../src/realm-carver/core/index.js';
import { nextSteer } from '../../src/realm-carver/qc/bot.js';
import { storyGameEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { LONG_STORY, STORY, ofType, stepsOf } from './helpers.js';

const LIMIT_STEPS = stepsOf(8 * 60_000);
/** The bot steers every 5 steps (6 times per second), faster than the carver steps (every 150 ms). */
const STEER_EVERY = 5;

describe('bot', () => {
  it.each(
    [1, 2, 3, 4, 5, 6, 7, 8].flatMap((seed) =>
      (['pip-is-brave', 'the-school-garden'] as const).map((story) => [seed, seed % 2 === 0, story] as const),
    ),
  )('seed %i helper %s plays %s to the end', { timeout: 30_000 }, (seed, helper, inputId) => {
    const story = inputId === 'pip-is-brave' ? STORY : LONG_STORY;
    const sim = createRecorder(seed, createRealmCarver(story, { seed, helper }));
    const events: RealmCarverEvent[] = [];
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
    expect(sim.state.realmsCleared).toBe(sim.state.realms);
    expect(ofType(events, 'campaignComplete')).toHaveLength(1);
    expect(sim.state.shift.every((r) => r.cleared)).toBe(true);
    // The bot reads: it never carves a wrong word on purpose.
    expect(ofType(events, 'wordMissed')).toHaveLength(0);
    // Evidence: one item per story item (realm), all solved.
    const evidence = evidenceOf(sim.state, story, seed, 1000);
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence.items.map((i) => i.itemId)).toEqual(sim.state.shift.map((r) => r.id));
    expect(evidence.items.every((i) => i.solved && i.attempts === 1)).toBe(true);
  });

  it('returns null with nothing to do, and stops when the cut would meet a monster', () => {
    const sim = createRealmCarver(STORY, { seed: 1, helper: false });
    const c = nextSteer(sim.state)!;
    expect(c.type).toBe('steer');
    expect(Math.hypot(c.x, c.z)).toBeGreaterThan(0);
    expect(nextSteer(createRealmCarver([], { seed: 1, helper: false }).state)).toBeNull();
  });
});
