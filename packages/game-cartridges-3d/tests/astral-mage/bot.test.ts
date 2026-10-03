/** The QC bot plays a whole casting within a step limit, through the public commands. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createAstralMage, evidenceOf, type AstralMageEvent } from '../../src/astral-mage/core/index.js';
import { nextCast } from '../../src/astral-mage/qc/bot.js';
import { LONG_STORY, STORY, ofType, stepsOf } from './helpers.js';

const LIMIT_STEPS = stepsOf(5 * 60_000);
/** The bot acts every 5 steps (6 times per second), as the QC driver does. */
const ACT_EVERY = 5;

describe('bot', () => {
  it.each(
    [1, 2, 3, 4, 5, 6, 7, 8].flatMap((seed) =>
      (['pip-is-brave', 'the-school-garden'] as const).map((story) => [seed, seed % 2 === 0, story] as const),
    ),
  )('seed %i helper %s plays %s to the end', { timeout: 30_000 }, (seed, helper, storyId) => {
    const story = storyId === 'pip-is-brave' ? STORY : LONG_STORY;
    const sim = createRecorder(seed, createAstralMage(story, { seed, helper }));
    const events: AstralMageEvent[] = [];
    let steps = 0;
    while (sim.state.phase === 'playing' && steps < LIMIT_STEPS) {
      if (steps % ACT_EVERY === 0) {
        const c = nextCast(sim.state);
        if (c) events.push(...sim.dispatch(c));
      }
      events.push(...sim.tick());
      steps += 1;
    }
    expect(sim.state.phase).toBe('complete');
    expect(steps).toBeLessThan(LIMIT_STEPS);
    expect(sim.state.ritualsCleared).toBe(sim.state.rituals);
    expect(ofType(events, 'castingComplete')).toHaveLength(1);
    expect(sim.state.casting.every((r) => r.cleared)).toBe(true);
    // The bot reads: it never casts at a wrong crystal.
    expect(ofType(events, 'crystalFizzled')).toHaveLength(0);
    // One evidence item per story item (sentence) the casting used, all solved on the first try.
    const evidence = evidenceOf(sim.state, story, seed, 1000);
    expect(storyGameEvidenceSchema.safeParse(evidence).success).toBe(true);
    expect(evidence.items).toHaveLength(sim.state.rituals);
    expect(new Set(evidence.items.map((i) => i.itemId)).size).toBe(evidence.items.length);
    expect(evidence.items.every((i) => i.solved && i.correctFirstTry && i.attempts === 1)).toBe(true);
    expect(evidence.practice).toEqual([]);
  });

  it('returns null with nothing to do, and waits while a bolt flies or the next crystal is dim', () => {
    const sim = createAstralMage(STORY, { seed: 1, helper: false });
    const c = nextCast(sim.state)!;
    expect(c).toMatchObject({ type: 'cast' });
    sim.dispatch(c);
    expect(nextCast(sim.state)).toBeNull();
    const other = createAstralMage(STORY, { seed: 1, helper: false });
    other.state.crystals.find((k) => k.index === 0)!.dimMs = 500;
    expect(nextCast(other.state)).toBeNull();
    expect(nextCast(createAstralMage([], { seed: 1, helper: false }).state)).toBeNull();
  });
});
