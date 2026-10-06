/** The QC bot plays every demo story to victory on the state alone. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createTwinSoul, resultsOf } from '../../src/paladins-twin-soul/core/index.js';
import { nextStrike } from '../../src/paladins-twin-soul/qc/bot.js';
import { STORY_IDS, loadStory, ofType, playToEnd } from './helpers.js';

describe('bot', () => {
  it.each(STORY_IDS.flatMap((id) => [1, 2, 3].map((seed) => [id, seed, seed % 2 === 0] as const)))(
    '%s seed %i helper %s: victory, one evidence item per word, no setback',
    (id, seed, helper) => {
      const story = loadStory(id);
      const sim = createTwinSoul(story, { seed, helper });
      const events = playToEnd(sim);
      expect(sim.state.phase).toBe('victory');
      expect(sim.state.targets.every((t) => t.solved && t.correctFirstTry)).toBe(true);
      expect(ofType(events, 'strikeRejected')).toHaveLength(0);
      expect(ofType(events, 'monsterStrike')).toHaveLength(0);
      expect(ofType(events, 'victory')).toHaveLength(1);
      const { evidence, results, outcome } = resultsOf(sim.state, story, seed, 60_000);
      expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
      expect(evidence.items).toHaveLength(story.vocabulary.length);
      expect(new Set(evidence.items.map((i) => i.itemId))).toEqual(new Set(story.vocabulary.map((v) => v.id)));
      expect(evidence.items.every((i) => i.itemKind === 'word' && i.solved && i.attempts === 1)).toBe(true);
      expect(results.correctAnswers).toBe(story.vocabulary.length);
      expect(results.score).toBe(sim.state.score);
      expect(outcome).toBe('victory');
    },
  );

  it('returns null when the run is over', () => {
    const sim = createTwinSoul(loadStory('the-school-garden'), { seed: 1, helper: false });
    expect(nextStrike(sim.state)).not.toBeNull();
    playToEnd(sim);
    expect(nextStrike(sim.state)).toBeNull();
    expect(sim.dispatch({ type: 'strike', shade: 'w1s1' })).toEqual([]);
  });
});
