/** A recorded Labyrinth run replays to the same snapshot from its seed. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createLabyrinth, type Dir, type LabyrinthEvent } from '../../src/labyrinth/core/index.js';
import { nextTurn } from '../../src/labyrinth/qc/bot.js';
import { STORY, stepsOf } from './helpers.js';

describe('replay', () => {
  it('same seed + same commands at the same steps -> same snapshot', () => {
    const seed = 1234;
    const rec = createRecorder(seed, createLabyrinth(STORY, { seed, helper: false }));
    const chaos = createRng(99);
    const events: LabyrinthEvent[] = [];
    for (let step = 0; step < stepsOf(120_000) && rec.state.phase === 'playing'; step++) {
      const roll = chaos.next();
      if (roll < 0.3) {
        const c = nextTurn(rec.state);
        if (c) events.push(...rec.dispatch(c));
      } else if (roll < 0.34) {
        events.push(...rec.dispatch({ type: 'turn', dir: chaos.pick<Dir>(['up', 'down', 'left', 'right']) }));
      } else if (roll < 0.35) {
        events.push(...rec.dispatch({ type: 'stop' }));
      }
      events.push(...rec.tick());
    }
    expect(rec.commands.length).toBeGreaterThan(10);
    expect(events.some((e) => e.type === 'orbTaken')).toBe(true);
    expect(events.some((e) => e.type === 'heroBumped')).toBe(true);
    const replayed = rec.replay((s) => createLabyrinth(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
    // A different seed gives a different shift or maze.
    const other = createLabyrinth(STORY, { seed: seed + 1, helper: false }).snapshot();
    expect(other.maze.id !== replayed.maze.id || other.shift.map((s) => s.id).join() !== replayed.shift.map((s) => s.id).join()).toBe(true);
  });

  it('snapshot() is a deep copy', () => {
    const sim = createLabyrinth(STORY, { seed: 1, helper: false });
    sim.tick();
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    expect(snap).not.toBe(sim.state);
    snap.orbs[0]!.cell.col = 99;
    expect(sim.state.orbs[0]!.cell.col).not.toBe(99);
  });
});
