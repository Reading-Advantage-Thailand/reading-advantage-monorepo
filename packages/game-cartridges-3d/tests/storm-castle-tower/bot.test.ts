/** The QC bot plays a whole climb within a step limit, through the public commands. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createStormCastleTower, evidenceOf, type StormCastleTowerEvent } from '../../src/storm-castle-tower/core/index.js';
import { nextCommand } from '../../src/storm-castle-tower/qc/bot.js';
import { LONG_STORY, STORY, ofType, stepsOf } from './helpers.js';

const LIMIT_STEPS = stepsOf(5 * 60_000);
/** The bot acts every 5 steps (6 times per second), as the QC driver does. */
const ACT_EVERY = 5;

describe('bot', () => {
  it.each(
    Array.from({ length: 24 }, (_, i) => i + 1).flatMap((seed) => (['pip-is-brave', 'the-school-garden'] as const).map((story) => [seed, seed % 2 === 0, story] as const)),
  )('seed %i helper %s plays %s to the end', { timeout: 30_000 }, (seed, helper, inputId) => {
    const story = inputId === 'pip-is-brave' ? STORY : LONG_STORY;
    const sim = createRecorder(seed, createStormCastleTower(story, { seed, helper }));
    const events: StormCastleTowerEvent[] = [];
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
    expect(sim.state.towersCleared).toBe(sim.state.towers);
    expect(ofType(events, 'climbComplete')).toHaveLength(1);
    expect(sim.state.shift.every((r) => r.cleared)).toBe(true);
    // The bot reads: it never opens a wrong window.
    expect(ofType(events, 'windowShut')).toHaveLength(0);
    // One evidence item per story item (sentence) the climb used, all solved on the first try.
    const evidence = evidenceOf(sim.state, story, seed, 1000);
    expect(storyGameEvidenceSchema.safeParse(evidence).success).toBe(true);
    expect(evidence.items).toHaveLength(sim.state.towers);
    expect(new Set(evidence.items.map((i) => i.itemId)).size).toBe(evidence.items.length);
    expect(evidence.items.every((i) => i.itemKind === 'sentence' && i.solved && i.correctFirstTry && i.attempts === 1)).toBe(true);
    expect(evidence.practice).toEqual([]);
  });

  it('steers up at the start, waits while the team rests, and returns null when there is nothing to do', () => {
    const sim = createStormCastleTower(STORY, { seed: 1, helper: false });
    sim.tick();
    const c = sim.state.climber;
    const right = sim.state.windows.find((w) => w.correct)!;
    const command = nextCommand(sim.state);
    expect(command).toMatchObject({ type: 'steer' });
    // The first step goes toward the window: up, or sideways toward its column.
    expect(Math.abs((command as { x: number }).x) + Math.abs((command as { z: number }).z)).toBe(1);
    expect(right.col).toBeGreaterThanOrEqual(0);
    expect(c.row).toBe(0);
    sim.state.climber.restMs = 500;
    expect(nextCommand(sim.state)).toBeNull();
    expect(nextCommand(createStormCastleTower([], { seed: 1, helper: false }).state)).toBeNull();
  });

  it('steps aside from a hazard that falls in its column', () => {
    const sim = createStormCastleTower(STORY, { seed: 1, helper: false });
    sim.tick();
    sim.state.spawnMs = 1e12;
    sim.state.climber.col = 1;
    sim.state.climber.row = 0;
    sim.state.hazards.push({ id: 'h', type: 'rock', col: 1, y: 3 });
    const command = nextCommand(sim.state) as { x: number; z: number };
    expect(command.x).not.toBe(0);
  });
});
