/** The QC bot plays a whole shift within a step limit, on the state alone, steering ten times per second. */
import { describe, expect, it } from 'vitest';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createLabyrinth, type LabyrinthEvent } from '../../src/labyrinth/core/index.js';
import { nextTurn } from '../../src/labyrinth/qc/bot.js';
import { STORY, create, loadStory, ofType, stepsOf } from './helpers.js';

const LIMIT_STEPS = stepsOf(8 * 60_000);
/** The bot steers every 3 steps (10 times per second), as the QC driver does. */
const TURN_EVERY = 3;

const STORIES = ['pip-is-brave', 'the-school-garden', 'squeaky-the-small-mouse', 'the-new-student', 'pip-sees-colors'] as const;

describe('bot', () => {
  it.each([1, 2, 3, 4, 5, 6].flatMap((seed) => STORIES.map((story) => [seed, seed % 2 === 0, story] as const)))(
    'seed %i helper %s plays %s to the end',
    { timeout: 30_000 },
    (seed, helper, storyId) => {
      const story = loadStory(storyId);
      const sim = createRecorder(seed, createLabyrinth(story, { seed, helper }));
      const events: LabyrinthEvent[] = [];
      let steps = 0;
      while (sim.state.phase === 'playing' && steps < LIMIT_STEPS) {
        if (steps % TURN_EVERY === 0) {
          const c = nextTurn(sim.state);
          if (c) events.push(...sim.dispatch(c));
        }
        events.push(...sim.tick());
        steps += 1;
      }
      expect(sim.state.phase).toBe('complete');
      expect(steps).toBeLessThan(LIMIT_STEPS);
      expect(sim.state.sentencesBuilt).toBe(sim.state.sentences);
      expect(ofType(events, 'shiftComplete')).toHaveLength(1);
      expect(ofType(events, 'gateOpened')).toHaveLength(1);
      expect(sim.state.shift.every((s) => s.built)).toBe(true);
      // The direct way never forces a wrong orb; a bump detour may cost one now and then.
      expect(ofType(events, 'orbWrong').length).toBeLessThanOrEqual(sim.state.sentences);
      expect(ofType(events, 'orbTaken')).toHaveLength(sim.state.shift.reduce((n, s) => n + s.words.length, 0));
    },
  );

  it('names the way to the right orb, then to the gate, and null with nothing to do', () => {
    const sim = create(1);
    const c = nextTurn(sim.state)!;
    expect(c.type).toBe('turn');
    if (c.type !== 'turn') throw new Error('expected a turn');
    expect(['down', 'right']).toContain(c.dir);
    sim.state.gateOpen = true;
    sim.state.orbs = [];
    sim.state.hero.cell = { ...sim.state.maze.gate };
    expect(nextTurn(sim.state)).toBeNull();
    sim.state.phase = 'complete';
    expect(nextTurn(sim.state)).toBeNull();
    expect(nextTurn(createLabyrinth([], { seed: 1, helper: false }).state)).toBeNull();
    expect(STORY.sentences.length).toBeGreaterThan(0);
  });
});
