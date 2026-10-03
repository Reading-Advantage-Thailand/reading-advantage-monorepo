/** The QC bot plays every demo story to victory through the public commands. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createArchersRevenge, resultsOf } from '../../src/archers-revenge/core/index.js';
import { nextCommand } from '../../src/archers-revenge/qc/bot.js';
import { STORY_IDS, loadStory, ofType, playToEnd } from './helpers.js';

describe('bot', () => {
  it.each(STORY_IDS.flatMap((id) => [1, 2, 3].map((seed) => [id, seed, seed % 2 === 0] as const)))(
    '%s seed %i helper %s: victory, one evidence item per word, no rejected command',
    (id, seed, helper) => {
      const story = loadStory(id);
      const sim = createArchersRevenge(story, { seed, helper });
      const events = playToEnd(sim);
      expect(sim.state.phase).toBe('victory');
      expect(sim.state.targets.every((t) => t.solved && t.correctFirstTry && t.attempts === 1)).toBe(true);
      expect(ofType(events, 'rejected')).toHaveLength(0);
      expect(ofType(events, 'enemyStrike')).toHaveLength(0);
      expect(ofType(events, 'victory')).toHaveLength(1);
      expect(ofType(events, 'waveCleared')).toHaveLength(sim.state.waveCount);
      expect(sim.state.coins).toBeGreaterThan(0);
      const { evidence, results, outcome } = resultsOf(sim.state, story, seed, 60_000);
      expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
      expect(evidence.items).toHaveLength(story.vocabulary.length);
      expect(new Set(evidence.items.map((i) => i.itemId))).toEqual(new Set(story.vocabulary.map((v) => v.id)));
      expect(evidence.items.every((i) => i.itemKind === 'word' && i.solved)).toBe(true);
      expect(results.correctAnswers).toBe(story.vocabulary.length);
      expect(results.score).toBe(sim.state.coins);
      expect(outcome).toBe('victory');
    },
  );

  it('starts the run first, shoots the right lane, and returns null when the run is over', () => {
    const sim = createArchersRevenge(loadStory('pip-is-brave'), { seed: 1, helper: false });
    expect(nextCommand(sim.state)).toEqual({ type: 'start' });
    sim.dispatch({ type: 'start' });
    const c = nextCommand(sim.state);
    expect(c).toMatchObject({ type: 'fire' });
    const round = sim.state.round!;
    expect(round.lanes.find((l) => l.lane === (c as { lane: number }).lane)!.wordId).toBe(round.wordId);
    playToEnd(sim);
    expect(nextCommand(sim.state)).toBeNull();
  });
});
