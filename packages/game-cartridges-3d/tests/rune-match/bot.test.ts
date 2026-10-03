/** The QC bot plays every demo story to victory on the state alone. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRuneMatch, resultsOf } from '../../src/rune-match/core/index.js';
import { nextSwap } from '../../src/rune-match/qc/bot.js';
import { STORY_IDS, loadStory, ofType, playToEnd } from './helpers.js';

describe('bot', () => {
  it.each(STORY_IDS.flatMap((id) => [1, 2, 3].map((seed) => [id, seed, seed % 2 === 0] as const)))(
    '%s seed %i helper %s: victory, every word solved, no rejected swap',
    (id, seed, helper) => {
      const story = loadStory(id);
      const sim = createRuneMatch(story, { seed, helper });
      const events = playToEnd(sim);
      expect(sim.state.phase).toBe('victory');
      expect(sim.state.targetIndex).toBe(story.vocabulary.length);
      expect(sim.state.target).toBeNull();
      expect(sim.state.monster).toBeNull();
      expect(sim.state.targets.every((t) => t.solved)).toBe(true);
      expect(ofType(events, 'swapRejected')).toHaveLength(0);
      expect(ofType(events, 'monsterStrike')).toHaveLength(0);
      expect(ofType(events, 'victory')).toHaveLength(1);
      expect(events.at(-1)!.type).toBe('victory');
      expect(sim.state.coins).toBeGreaterThan(0);
      const { evidence, results, outcome } = resultsOf(sim.state, story, seed, 60_000);
      expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
      expect(evidence.items).toHaveLength(story.vocabulary.length);
      expect(evidence.items.every((i) => i.itemKind === 'word' && i.solved)).toBe(true);
      expect(results.correctAnswers).toBe(story.vocabulary.length);
      expect(results.score).toBe(sim.state.coins);
      expect(outcome).toBe('victory');
    },
  );

  it('returns null when the run is over', () => {
    const sim = createRuneMatch(loadStory('the-school-garden'), { seed: 1, helper: false });
    expect(nextSwap(sim.state)).not.toBeNull();
    playToEnd(sim);
    expect(nextSwap(sim.state)).toBeNull();
    expect(sim.dispatch({ type: 'swap', a: { row: 0, col: 0 }, b: { row: 0, col: 1 } })).toEqual([]);
  });
});
