/** The Monster Encounters `Simulation` (task 11): the quest through commands, and a replay. */
import { describe, expect, it } from 'vitest';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createMonsterEncounters } from '../../src/monster-encounters/core/index.js';
import { loadStory, makeStory, solve, fail, types } from './helpers.js';

const opts = { seed: 1, helper: false };

describe('createMonsterEncounters', () => {
  it('starts on the start command, answers on the answer command, and never ticks', () => {
    const sim = createMonsterEncounters(makeStory(), opts);
    expect(sim.state.phase).toBe('ready');
    expect(sim.tick()).toEqual([]);
    expect(types(sim.dispatch({ type: 'start' }))).toEqual(['encounterStart', 'turn']);
    expect(sim.state.phase).toBe('challenge');
    const events = sim.dispatch({ type: 'answer', response: solve(makeStory(), sim.state.challenge!) });
    expect(types(events)).toEqual(['answer', 'heroAttack', 'enemyHit', 'xp', 'turn']);
    expect(sim.tick()).toEqual([]);
    expect(sim.results().correctAnswers).toBe(1);
  });

  it('snapshots a copy of the state', () => {
    const sim = createMonsterEncounters(makeStory(), opts);
    sim.dispatch({ type: 'start' });
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    expect(snap.challenge).not.toBe(sim.state.challenge);
    snap.courage = 0;
    expect(sim.state.courage).toBe(5);
  });

  it('replays a recorded run from the seed to the same snapshot and results', () => {
    const story = loadStory('pip-is-brave');
    const rec = createRecorder(42, createMonsterEncounters(story, { seed: 42, helper: false }));
    rec.dispatch({ type: 'start' });
    for (let i = 0; rec.state.phase === 'challenge' && i < 120; i++) {
      rec.tick();
      const c = rec.state.challenge!;
      rec.dispatch({ type: 'answer', response: i % 4 === 3 ? fail(story, c) : solve(story, c) });
    }
    expect(rec.state.phase).toBe('victory');
    const replayed = rec.replay((seed) => createMonsterEncounters(story, { seed, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
  });
});
