/** The QC bot plays a whole visit within a step limit, on the state alone, a few commands per second. */
import { describe, expect, it } from 'vitest';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createHauntedLibrary, evidenceOf, type LibraryEvent } from '../../src/haunted-library/core/index.js';
import { nextCommand } from '../../src/haunted-library/qc/bot.js';
import { LONG_STORY, STORY, ofType, stepsOf } from './helpers.js';

const LIMIT_STEPS = stepsOf(8 * 60_000);
/** The bot acts every 5 steps (6 times per second), as the QC driver does. */
const ACT_EVERY = 5;

describe('bot', () => {
  it.each(
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].flatMap((seed) =>
      (['pip-is-brave', 'the-school-garden'] as const).map((story) => [seed, seed % 2 === 0, story] as const),
    ),
  )('seed %i helper %s plays %s to the end', { timeout: 30_000 }, (seed, helper, inputId) => {
    const story = inputId === 'pip-is-brave' ? STORY : LONG_STORY;
    const sim = createRecorder(seed, createHauntedLibrary(story, { seed, helper }));
    const events: LibraryEvent[] = [];
    let steps = 0;
    while (sim.state.phase === 'playing' && steps < LIMIT_STEPS) {
      if (steps % ACT_EVERY === 0) {
        const c = nextCommand(sim.state);
        if (c) events.push(...sim.dispatch(c));
      }
      events.push(...sim.tick());
      steps += 1;
    }
    expect(sim.state.phase).toBe('complete');
    expect(steps).toBeLessThan(LIMIT_STEPS);
    expect(sim.state.roomsCleared).toBe(sim.state.rooms);
    expect(ofType(events, 'visitComplete')).toHaveLength(1);
    expect(sim.state.shift.every((r) => r.cleared)).toBe(true);
    // The bot reads: it never opens a door out of order.
    expect(ofType(events, 'doorWrong')).toHaveLength(0);
    const evidence = evidenceOf(sim.state, story, seed, 1000);
    expect(evidence.items).toHaveLength(sim.state.rooms);
    expect(evidence.items.every((i) => i.solved && i.attempts === 1)).toBe(true);
  });

  it('returns null with nothing to do, and waits while the hero cannot act', () => {
    const sim = createHauntedLibrary(STORY, { seed: 1, helper: false });
    expect(nextCommand(sim.state)).not.toBeNull();
    sim.state.hero.controlMs = 100;
    expect(nextCommand(sim.state)).toBeNull();
    sim.state.hero.controlMs = 0;
    sim.state.hero.travelMs = 100;
    expect(nextCommand(sim.state)).toBeNull();
    expect(nextCommand(createHauntedLibrary([], { seed: 1, helper: false }).state)).toBeNull();
  });
});
