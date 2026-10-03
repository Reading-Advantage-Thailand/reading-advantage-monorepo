/** The QC bot finishes a ride with right gates at a human pace, on the state alone. */
import { describe, expect, it } from 'vitest';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { TUNING, createDragonRider, type DragonRiderEvent } from '../../src/dragon-rider/core/index.js';
import { nextChoice } from '../../src/dragon-rider/qc/bot.js';
import { SHORT_STORY, STORY, ofType, stepsOf } from './helpers.js';

const LIMIT_STEPS = stepsOf(10 * 60_000);

function play(seed: number, story: typeof STORY, paceSteps: number) {
  const sim = createRecorder(seed, createDragonRider(story, { seed }));
  const events: DragonRiderEvent[] = [];
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
    Array.from({ length: 24 }, (_, i) => i + 1).flatMap((seed) => (['pip-is-brave', 'the-school-garden'] as const).map((story) => [seed, story] as const)),
  )('seed %i plays %s to the end', (seed, storyId) => {
    const story = storyId === 'pip-is-brave' ? STORY : SHORT_STORY;
    const { sim, events, steps } = play(seed, story, stepsOf(1500));
    expect(sim.state.phase).toBe('complete');
    expect(steps).toBeLessThan(LIMIT_STEPS);
    const n = Math.min(TUNING.maxWords, story.vocabulary.length);
    expect(sim.state.words).toHaveLength(n);
    expect(ofType(events, 'gateChosen').every((e) => e.correct)).toBe(true);
    expect(ofType(events, 'wordReturns')).toHaveLength(0);
    expect(sim.state.flock).toBe(n + 1);
    expect(sim.state.words.every((w) => w.solved && w.attempts === 1)).toBe(true);
    expect(sim.commands).toHaveLength(n);
    expect(ofType(events, 'rideComplete')).toHaveLength(1);
  });

  it('a slow reader holds at every gate and still finishes', () => {
    const { sim, events } = play(3, SHORT_STORY, stepsOf(9000));
    expect(sim.state.phase).toBe('complete');
    expect(ofType(events, 'waiting')).toHaveLength(SHORT_STORY.vocabulary.length);
  });

  it('returns null with nothing to choose', () => {
    const sim = createDragonRider(STORY, { seed: 1 });
    expect(nextChoice(sim.state)).toBeNull();
    sim.tick();
    const choice = nextChoice(sim.state)!;
    expect(sim.state.round!.options[choice.gate]!.id).toBe(sim.state.round!.itemId);
    sim.dispatch(choice);
    expect(nextChoice(sim.state)).toBeNull();
  });
});
