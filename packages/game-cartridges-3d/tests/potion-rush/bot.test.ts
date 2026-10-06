/** The QC bot plays a whole shift with correct drops within a time limit, on the state alone. */
import { describe, expect, it } from 'vitest';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createPotionRush, type PotionRushEvent } from '../../src/potion-rush/core/index.js';
import { nextDrop } from '../../src/potion-rush/qc/bot.js';
import { SHORT_STORY, STORY, ofType, stepsOf } from './helpers.js';

const LIMIT_STEPS = stepsOf(6 * 60_000);

describe('bot', () => {
  it.each(
    [1, 2, 3, 4, 5, 6, 7, 8].flatMap((seed) =>
      (['pip-is-brave', 'the-school-garden'] as const).map((story) => [seed, seed % 2 === 0, story] as const),
    ),
  )('seed %i helper %s plays %s to the end without a wrong word', (seed, helper, inputId) => {
    const story = inputId === 'pip-is-brave' ? STORY : SHORT_STORY;
    const sim = createRecorder(seed, createPotionRush(story, { seed, helper }));
    const events: PotionRushEvent[] = [];
    let steps = 0;
    while (sim.state.phase === 'playing' && steps < LIMIT_STEPS) {
      for (let c = nextDrop(sim.state); c; c = nextDrop(sim.state)) events.push(...sim.dispatch(c));
      events.push(...sim.tick());
      steps += 1;
    }
    expect(sim.state.phase).toBe('complete');
    expect(steps).toBeLessThan(LIMIT_STEPS);
    expect(sim.state.served).toBe(sim.state.total);
    expect(ofType(events, 'wordRejected')).toHaveLength(0);
    expect(ofType(events, 'customerSatDown')).toHaveLength(0);
    expect(sim.state.orders.every((o) => o.wrong === 0 && o.served)).toBe(true);
    expect(sim.state.coins).toBeGreaterThan(0);
    expect(sim.commands.filter((c) => c.command.type === 'serve')).toHaveLength(sim.state.total);
  });

  it('returns null with nothing to do', () => {
    const sim = createPotionRush(STORY, { seed: 1, helper: false });
    expect(nextDrop(sim.state)).toBeNull();
    sim.tick();
    expect(nextDrop(sim.state)).toBeNull(); // a customer, but the belt is empty
  });
});
