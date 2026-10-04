/** The QC bot finishes a run with right lanes at a human pace, on the state alone. */
import { describe, expect, it } from 'vitest';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { TUNING, createSpellweaversRun, evidenceOf, type SpellweaversEvent } from '../../src/spellweavers-run/core/index.js';
import { nextChoice } from '../../src/spellweavers-run/qc/bot.js';
import { LONG_STORY, STORY, ofType, stepsOf } from './helpers.js';

const LIMIT_STEPS = stepsOf(15 * 60_000);

/** Plays with the bot called every `paceSteps` steps; returns the events. */
function play(seed: number, helper: boolean, story: typeof STORY, paceSteps: number) {
  const sim = createRecorder(seed, createSpellweaversRun(story, { seed, helper }));
  const events: SpellweaversEvent[] = [];
  let steps = 0;
  while (sim.state.phase !== 'complete' && steps < LIMIT_STEPS) {
    if (steps % paceSteps === 0) {
      const c = nextChoice(sim.state);
      if (c) events.push(...sim.dispatch(c));
    }
    events.push(...sim.tick());
    steps += 1;
  }
  return { sim, events, steps };
}

describe('bot', () => {
  it.each(
    [1, 2, 3, 4, 5, 6, 7, 8].flatMap((seed) =>
      (['pip-is-brave', 'the-school-garden'] as const).map((story) => [seed, seed % 2 === 0, story] as const),
    ),
  )('seed %i helper %s plays %s to the end with no missed orb', { timeout: 30_000 }, (seed, helper, inputId) => {
    const story = inputId === 'pip-is-brave' ? STORY : LONG_STORY;
    const { sim, events, steps } = play(seed, helper, story, stepsOf(1500));
    expect(sim.state.phase).toBe('complete');
    expect(steps).toBeLessThan(LIMIT_STEPS);
    const n = sim.state.sentences.length;
    expect(n).toBe(Math.min(TUNING.maxSentences, story.sentences.length));
    expect(ofType(events, 'laneChosen').every((e) => e.correct)).toBe(true);
    expect(ofType(events, 'courageLost')).toHaveLength(0);
    expect(ofType(events, 'sentenceCast')).toHaveLength(n);
    expect(ofType(events, 'runComplete')).toHaveLength(1);
    const evidence = evidenceOf(sim.state, story, seed, 1);
    expect(evidence.items).toHaveLength(n);
    expect(evidence.items.every((i) => i.solved && i.correctFirstTry && i.attempts === 1)).toBe(true);
    expect(sim.state.courage).toBe(TUNING.courage);
  });

  it('returns null with nothing to do: before the first round, after a choice, and while resting', () => {
    const sim = createSpellweaversRun(STORY, { seed: 1, helper: false });
    expect(nextChoice(sim.state)).toBeNull();
    sim.tick();
    const c = nextChoice(sim.state)!;
    expect(c.type).toBe('choose');
    sim.dispatch({ type: 'choose', lane: (c.lane + 1) % 3 });
    expect(nextChoice(sim.state)).toBeNull();
    expect(createSpellweaversRun([], { seed: 1, helper: false }).state.phase).toBe('complete');
    expect(nextChoice(createSpellweaversRun([], { seed: 1, helper: false }).state)).toBeNull();
  });
});
