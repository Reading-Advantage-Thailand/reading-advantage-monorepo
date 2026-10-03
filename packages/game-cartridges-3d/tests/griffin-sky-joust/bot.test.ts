/** The QC bot finishes a game through the public commands, a few times a second. */
import { describe, expect, it } from 'vitest';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { TUNING, createGriffinSkyJoust, evidenceOf } from '../../src/griffin-sky-joust/core/index.js';
import { nextCommand } from '../../src/griffin-sky-joust/qc/bot.js';
import { LONG_STORY, STORY, ofType, playBot, stepsOf } from './helpers.js';

describe('bot', () => {
  it.each(
    [1, 2, 3, 4, 5, 6].flatMap((seed) => (['pip-is-brave', 'the-school-garden'] as const).map((story) => [seed, seed % 2 === 0, story] as const)),
  )('seed %i helper %s plays %s to the end', { timeout: 60_000 }, (seed, helper, storyId) => {
    const story = storyId === 'pip-is-brave' ? STORY : LONG_STORY;
    const sim = createRecorder(seed, createGriffinSkyJoust(story, { seed, helper }));
    const { events, steps } = playBot(sim, 3, stepsOf(10 * 60_000));
    expect(sim.state.phase).toBe('complete');
    const n = sim.state.sentences.length;
    expect(n).toBe(Math.min(TUNING.maxSentences, story.sentences.length));
    expect(ofType(events, 'sentenceDone')).toHaveLength(n);
    expect(ofType(events, 'joustComplete')).toHaveLength(1);
    const evidence = evidenceOf(sim.state, story, seed, steps);
    expect(evidence.items).toHaveLength(n);
    expect(evidence.items.every((i) => i.solved)).toBe(true);
    expect(sim.state.courage).toBeGreaterThan(0);
  });

  it('returns null with nothing to do: in the opening beat it climbs, while resting and after the end it waits', () => {
    const sim = createGriffinSkyJoust(STORY, { seed: 1, helper: false });
    expect(nextCommand(sim.state)).toEqual({ type: 'flap', dir: 0 });
    sim.state.restMs = 1000;
    expect(nextCommand(sim.state)).toBeNull();
    const done = createGriffinSkyJoust([], { seed: 1, helper: false });
    expect(nextCommand(done.state)).toBeNull();
  });
});
