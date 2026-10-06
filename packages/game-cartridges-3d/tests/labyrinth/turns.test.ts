/** The late-turn grace: a side turn pressed just after a crossing still takes that crossing. */
import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/labyrinth/core/index.js';
import { create, parkGoblins, tickN } from './helpers.js';

const at = (col: number, row: number) => ({ col, row });

/** Maze 1: (0,0) has a way down; (1,0) and (2,0) have none; (3,0) has. */
function runningRight() {
  const sim = create();
  parkGoblins(sim);
  sim.state.orbs = [];
  sim.dispatch({ type: 'turn', dir: 'right' });
  return sim;
}

describe('late turn grace', () => {
  it('steps back into the crossing just left when the press is within the grace', () => {
    const sim = runningRight();
    tickN(sim, 3); // 0.3 of the way from (0,0) to (1,0)
    expect(sim.state.hero.progress).toBeLessThan(TUNING.turnGrace);
    sim.dispatch({ type: 'turn', dir: 'down' });
    expect(sim.state.hero).toMatchObject({ cell: at(0, 0), next: at(0, 1), dir: 'down', progress: 0, queued: null });
  });

  it('queues the turn for the next crossing when the press is past the grace', () => {
    const sim = runningRight();
    tickN(sim, 7);
    expect(sim.state.hero.progress).toBeGreaterThan(TUNING.turnGrace);
    sim.dispatch({ type: 'turn', dir: 'down' });
    expect(sim.state.hero).toMatchObject({ cell: at(0, 0), next: at(1, 0), dir: 'right', queued: 'down' });
  });

  it('queues the turn when the cell just left has no such way', () => {
    const sim = runningRight();
    tickN(sim, 13); // 0.3 of the way from (1,0) to (2,0); (1,0) has no way down
    sim.dispatch({ type: 'turn', dir: 'down' });
    expect(sim.state.hero).toMatchObject({ cell: at(1, 0), next: at(2, 0), queued: 'down' });
  });

  it('keeps a press for the cell ahead when that cell allows the turn', () => {
    const sim = runningRight();
    tickN(sim, 23); // 0.3 past (2,0), heading to (3,0), which has a way down
    sim.dispatch({ type: 'turn', dir: 'up' }); // closed at (2,0) and at (3,0): queues
    expect(sim.state.hero.queued).toBe('up');
    sim.dispatch({ type: 'turn', dir: 'down' }); // closed at (2,0): queues for (3,0)
    expect(sim.state.hero).toMatchObject({ cell: at(2, 0), next: at(3, 0), dir: 'right', queued: 'down' });
  });
});
