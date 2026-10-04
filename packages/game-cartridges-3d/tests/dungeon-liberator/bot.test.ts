/** The QC bot plays a whole shift within a step limit, on the state alone, steering a few times per second. */
import { describe, expect, it } from 'vitest';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createDungeonLiberator, type DungeonLiberatorEvent } from '../../src/dungeon-liberator/core/index.js';
import { nextSteer } from '../../src/dungeon-liberator/qc/bot.js';
import { LONG_STORY, STORY, ofType, stepsOf } from './helpers.js';

const LIMIT_STEPS = stepsOf(8 * 60_000);
/** The bot steers every 5 steps (6 times per second), as the QC driver does. */
const STEER_EVERY = 5;

describe('bot', () => {
  it.each(
    [1, 2, 3, 4, 5, 6, 7, 8].flatMap((seed) =>
      (['pip-is-brave', 'the-school-garden'] as const).map((story) => [seed, seed % 2 === 0, story] as const),
    ),
  )('seed %i helper %s plays %s to the end', { timeout: 30_000 }, (seed, helper, inputId) => {
    const story = inputId === 'pip-is-brave' ? STORY : LONG_STORY;
    const sim = createRecorder(seed, createDungeonLiberator(story, { seed, helper }));
    const events: DungeonLiberatorEvent[] = [];
    let steps = 0;
    while (sim.state.phase === 'playing' && steps < LIMIT_STEPS) {
      if (steps % STEER_EVERY === 0) {
        const c = nextSteer(sim.state);
        if (c) events.push(...sim.dispatch(c));
      }
      events.push(...sim.tick());
      steps += 1;
    }
    expect(sim.state.phase).toBe('complete');
    expect(steps).toBeLessThan(LIMIT_STEPS);
    expect(sim.state.roomsCleared).toBe(sim.state.rooms);
    expect(ofType(events, 'shiftComplete')).toHaveLength(1);
    expect(sim.state.shift.every((r) => r.cleared)).toBe(true);
    // The bot reads: few refusals (a brush past another villager in a crowded 7-word room).
    expect(ofType(events, 'villagerRefused').length).toBeLessThanOrEqual(sim.state.rooms * 2);
  });

  it('returns null with nothing to do, and stops while the next villager is not touchable', () => {
    const sim = createDungeonLiberator(STORY, { seed: 1, helper: false });
    const c = nextSteer(sim.state)!;
    expect(c.type).toBe('steer');
    expect(Math.hypot(c.x, c.z)).toBeCloseTo(1);
    sim.state.villagers.find((v) => v.index === 0)!.refusedMs = 500;
    expect(nextSteer(sim.state)).toEqual({ type: 'steer', x: 0, z: 0 });
    sim.state.knight.bumpedMs = 100;
    expect(nextSteer(sim.state)).toBeNull();
    expect(nextSteer(createDungeonLiberator([], { seed: 1, helper: false }).state)).toBeNull();
  });
});
