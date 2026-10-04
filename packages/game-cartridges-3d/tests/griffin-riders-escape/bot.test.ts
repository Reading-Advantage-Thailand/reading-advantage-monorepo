/** The QC bot finishes an escape with right gates at a human pace, on the state alone. */
import { describe, expect, it } from 'vitest';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { TUNING, createGriffinRidersEscape, evidenceOf, type EscapeEvent } from '../../src/griffin-riders-escape/core/index.js';
import { nextChoice } from '../../src/griffin-riders-escape/qc/bot.js';
import { LONG_STORY, STORY, ofType, stepsOf } from './helpers.js';

const LIMIT_STEPS = stepsOf(15 * 60_000);

function play(seed: number, helper: boolean, story: typeof STORY, paceSteps: number) {
  const sim = createRecorder(seed, createGriffinRidersEscape(story, { seed, helper }));
  const events: EscapeEvent[] = [];
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
    Array.from({ length: 30 }, (_, i) => i + 1).flatMap((seed) =>
      (['pip-is-brave', 'the-school-garden'] as const).map((story) => [seed, seed % 2 === 0, story] as const),
    ),
  )('seed %i helper %s plays %s to the end with no wrong gate and no storm hit', { timeout: 30_000 }, (seed, helper, inputId) => {
    const story = inputId === 'pip-is-brave' ? STORY : LONG_STORY;
    const { sim, events, steps } = play(seed, helper, story, stepsOf(500));
    expect(sim.state.phase).toBe('complete');
    expect(steps).toBeLessThan(LIMIT_STEPS);
    const n = sim.state.sentences.length;
    expect(n).toBe(Math.min(TUNING.maxSentences, story.sentences.length));
    expect(ofType(events, 'gatePassed').every((e) => e.correct)).toBe(true);
    expect(ofType(events, 'stormHit')).toHaveLength(0);
    expect(ofType(events, 'courageLost')).toHaveLength(0);
    expect(ofType(events, 'sentenceCast')).toHaveLength(n);
    expect(ofType(events, 'escapeComplete')).toHaveLength(1);
    const evidence = evidenceOf(sim.state, story, seed, 1);
    expect(evidence.items).toHaveLength(n);
    expect(evidence.items.every((i) => i.solved && i.correctFirstTry && i.attempts === 1)).toBe(true);
    expect(sim.state.courage).toBe(TUNING.courage);
  });

  it('returns null with nothing to do: before the first wave, in the right lane, and after the end', () => {
    const sim = createGriffinRidersEscape(STORY, { seed: 1, helper: false });
    expect(nextChoice(sim.state)).toBeNull();
    sim.tick();
    for (let i = 0; i < 2000 && nextChoice(sim.state); i++) {
      sim.dispatch(nextChoice(sim.state)!);
      sim.tick();
    }
    expect(createGriffinRidersEscape([], { seed: 1, helper: false }).state.phase).toBe('complete');
    expect(nextChoice(createGriffinRidersEscape([], { seed: 1, helper: false }).state)).toBeNull();
  });
});
