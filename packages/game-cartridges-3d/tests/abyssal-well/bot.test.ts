/** The QC bot plays a whole run through the public commands. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createAbyssalWell, evidenceOf, type AbyssalWellEvent } from '../../src/abyssal-well/core/index.js';
import { nextCommand } from '../../src/abyssal-well/qc/bot.js';
import { LONG_STORY, STORY, ofType } from './helpers.js';

describe('bot', () => {
  it.each(
    [1, 2, 3, 4, 5, 6, 7, 8].flatMap((seed) =>
      (['pip-is-brave', 'the-school-garden'] as const).map((story) => [seed, seed % 2 === 0, story] as const),
    ),
  )('seed %i helper %s plays %s to the end', (seed, helper, storyId) => {
    const story = storyId === 'pip-is-brave' ? STORY : LONG_STORY;
    const sim = createRecorder(seed, createAbyssalWell(story, { seed, helper }));
    const events: AbyssalWellEvent[] = [];
    for (let i = 0; i < 400 && sim.state.phase === 'playing'; i++) {
      const c = nextCommand(sim.state);
      if (!c) throw new Error(`the bot found no command at step ${i}`);
      events.push(...sim.dispatch(c));
    }
    expect(sim.state.phase).toBe('complete');
    expect(sim.state.descentsCleared).toBe(sim.state.descentCount);
    expect(ofType(events, 'wellComplete')).toHaveLength(1);
    expect(sim.state.descents.every((d) => d.cleared)).toBe(true);
    // The bot reads: it never shoots a wrong creature, so courage never drops.
    expect(ofType(events, 'repelled')).toHaveLength(0);
    expect(sim.state.courage).toBe(sim.state.maxCourage);
    // One evidence item per story item (sentence) the run used, all solved on the first try.
    const evidence = evidenceOf(sim.state, story, seed, 1000);
    expect(storyGameEvidenceSchema.safeParse(evidence).success).toBe(true);
    expect(evidence.items).toHaveLength(sim.state.descentCount);
    expect(new Set(evidence.items.map((i) => i.itemId)).size).toBe(evidence.items.length);
    expect(evidence.items.every((i) => i.solved && i.correctFirstTry && i.attempts === 1)).toBe(true);
    expect(evidence.practice).toEqual([]);
  });

  it('starts first, and returns null when the run is over or empty', () => {
    const sim = createAbyssalWell(STORY, { seed: 1, helper: false });
    expect(nextCommand(sim.state)).toEqual({ type: 'start' });
    sim.dispatch({ type: 'start' });
    expect(nextCommand(sim.state)).toMatchObject({ type: 'fire' });
    expect(nextCommand(createAbyssalWell([], { seed: 1, helper: false }).state)).toBeNull();
  });
});
