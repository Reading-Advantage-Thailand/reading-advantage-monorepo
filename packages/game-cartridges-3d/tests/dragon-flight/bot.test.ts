/** The QC bot finishes a flight with right gates at a human pace, on the state alone. */
import { describe, expect, it } from 'vitest';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { TUNING, createDragonFlight, type DragonFlightEvent } from '../../src/dragon-flight/core/index.js';
import { nextChoice } from '../../src/dragon-flight/qc/bot.js';
import { SHORT_STORY, STORY, ofType, stepsOf } from './helpers.js';

const LIMIT_STEPS = stepsOf(10 * 60_000);

/** Plays with the bot called every `paceSteps` steps; returns the events. */
function play(seed: number, helper: boolean, story: typeof STORY, paceSteps: number) {
  const sim = createRecorder(seed, createDragonFlight(story, { seed, helper }));
  const events: DragonFlightEvent[] = [];
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
  )('seed %i helper %s plays %s to the end without a wrong gate', (seed, helper, storyId) => {
    const story = storyId === 'pip-is-brave' ? STORY : SHORT_STORY;
    const { sim, events, steps } = play(seed, helper, story, stepsOf(1500));
    expect(sim.state.phase).toBe('complete');
    expect(steps).toBeLessThan(LIMIT_STEPS);
    const n = sim.state.words.length;
    expect(n).toBe(Math.min(TUNING.maxWords, story.vocabulary.length));
    expect(ofType(events, 'gateChosen').every((e) => e.correct)).toBe(true);
    expect(ofType(events, 'wordReturns')).toHaveLength(0);
    expect(ofType(events, 'waiting')).toHaveLength(0);
    expect(sim.state.flock).toBe(n + 1);
    expect(ofType(events, 'fireball')).toHaveLength(n + 1);
    expect(sim.state.words.every((w) => w.solved && w.attempts === 1)).toBe(true);
    expect(sim.commands).toHaveLength(n);
    expect(sim.state.coins).toBeGreaterThan(0);
  });

  it('a slow reader hovers at every gate and still finishes', () => {
    const { sim, events } = play(3, false, SHORT_STORY, stepsOf(9000));
    expect(sim.state.phase).toBe('complete');
    expect(ofType(events, 'waiting')).toHaveLength(SHORT_STORY.vocabulary.length);
    expect(ofType(events, 'gateChosen').every((e) => e.correct)).toBe(true);
  });

  it('returns null with nothing to choose', () => {
    const sim = createDragonFlight(STORY, { seed: 1, helper: false });
    expect(nextChoice(sim.state)).toBeNull(); // no round before the first tick
    sim.tick();
    const choice = nextChoice(sim.state)!;
    expect(choice.type).toBe('choose');
    expect(sim.state.round!.options[choice.gate]!.id).toBe(sim.state.round!.itemId);
    sim.dispatch(choice);
    expect(nextChoice(sim.state)).toBeNull(); // chosen
  });
});
