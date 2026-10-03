/** The QC bot plays a whole synthesis within a step limit, through the public commands. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createAlchemistsSynthesis, evidenceOf, type AlchemistsSynthesisEvent } from '../../src/alchemists-synthesis/core/index.js';
import { nextChoice } from '../../src/alchemists-synthesis/qc/bot.js';
import { SHORT_STORY, STORY, ofType, stepsOf } from './helpers.js';

const LIMIT_STEPS = stepsOf(5 * 60_000);
/** The bot acts every 5 steps (6 times per second), as the QC driver does. */
const ACT_EVERY = 5;

describe('bot', () => {
  it.each(
    [1, 2, 3, 4, 5, 6, 7, 8].flatMap((seed) =>
      (['pip-is-brave', 'the-school-garden'] as const).map((story) => [seed, seed % 2 === 0, story] as const),
    ),
  )('seed %i helper %s plays %s to the end', { timeout: 30_000 }, (seed, helper, storyId) => {
    const story = storyId === 'pip-is-brave' ? STORY : SHORT_STORY;
    const sim = createRecorder(seed, createAlchemistsSynthesis(story, { seed, helper }));
    const events: AlchemistsSynthesisEvent[] = [];
    let steps = 0;
    while (sim.state.phase === 'playing' && steps < LIMIT_STEPS) {
      if (steps % ACT_EVERY === 0) {
        const c = nextChoice(sim.state);
        if (c) events.push(...sim.dispatch(c));
      }
      events.push(...sim.tick());
      steps += 1;
    }
    expect(sim.state.phase).toBe('complete');
    expect(steps).toBeLessThan(LIMIT_STEPS);
    expect(sim.state.brewed).toBe(sim.state.rounds);
    expect(ofType(events, 'synthesisComplete')).toHaveLength(1);
    expect(sim.state.words.every((w) => w.solved)).toBe(true);
    // The bot reads: it never picks a wrong jar.
    expect(ofType(events, 'jarFizzled')).toHaveLength(0);
    // One evidence item per story word the synthesis used, all solved on the first try.
    const evidence = evidenceOf(sim.state, story, seed, 1000);
    expect(storyGameEvidenceSchema.safeParse(evidence).success).toBe(true);
    expect(evidence.items).toHaveLength(sim.state.rounds);
    expect(evidence.items).toHaveLength(Math.min(10, story.vocabulary.length));
    expect(new Set(evidence.items.map((i) => i.itemId)).size).toBe(evidence.items.length);
    expect(evidence.items.every((i) => story.vocabulary.some((v) => v.id === i.itemId))).toBe(true);
    expect(evidence.items.every((i) => i.solved && i.correctFirstTry && i.attempts === 1)).toBe(true);
    expect(evidence.practice).toEqual([]);
  });

  it('returns null with nothing to do, and waits while a pour runs', () => {
    const sim = createAlchemistsSynthesis(STORY, { seed: 1, helper: false });
    const c = nextChoice(sim.state)!;
    expect(c).toMatchObject({ type: 'choose' });
    sim.dispatch(c);
    expect(nextChoice(sim.state)).toBeNull();
    expect(nextChoice(createAlchemistsSynthesis([], { seed: 1, helper: false }).state)).toBeNull();
  });
});
