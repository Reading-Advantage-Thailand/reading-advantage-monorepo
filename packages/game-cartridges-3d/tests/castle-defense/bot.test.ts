/** The QC bot plays every demo story to victory through the public commands. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createCastleDefense, resultsOf } from '../../src/castle-defense/core/index.js';
import { nextCommand } from '../../src/castle-defense/qc/bot.js';
import { STORY_IDS, loadStory, ofType, playToEnd } from './helpers.js';

describe('bot', () => {
  it.each(STORY_IDS.flatMap((id) => [1, 2, 3, 4].map((seed) => [id, seed, seed % 2 === 0] as const)))(
    '%s seed %i helper %s: victory, one evidence item per sentence, no rejected command',
    (id, seed, helper) => {
      const story = loadStory(id);
      const sim = createCastleDefense(story, { seed, helper });
      const events = playToEnd(sim);
      expect(sim.state.phase).toBe('victory');
      expect(sim.state.shift.every((s) => s.cleared && s.wrongs === 0)).toBe(true);
      expect(ofType(events, 'rejected')).toHaveLength(0);
      expect(ofType(events, 'attackerStrike')).toHaveLength(0);
      expect(ofType(events, 'victory')).toHaveLength(1);
      expect(ofType(events, 'waveCleared')).toHaveLength(sim.state.waveCount);
      expect(ofType(events, 'towerBuilt')).toHaveLength(sim.state.waveCount);
      expect(sim.state.coins).toBeGreaterThan(0);
      const { evidence, results, outcome } = resultsOf(sim.state, story, seed, 60_000);
      expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
      expect(evidence.items).toHaveLength(sim.state.waveCount);
      expect(evidence.items.every((i) => i.itemKind === 'sentence' && i.solved && i.correctFirstTry && i.attempts === 1)).toBe(true);
      expect(new Set(evidence.items.map((i) => i.itemId)).size).toBe(evidence.items.length);
      expect(evidence.items.every((i) => story.sentences.some((s) => s.id === i.itemId && s.text === i.label))).toBe(true);
      expect(results.score).toBe(sim.state.coins);
      expect(outcome).toBe('victory');
    },
  );

  it('uses every sentence of a story that has six or fewer', () => {
    const sim = createCastleDefense(loadStory('the-school-garden'), { seed: 1, helper: false });
    playToEnd(sim);
    expect(resultsOf(sim.state, loadStory('the-school-garden'), 1, 1).evidence.items).toHaveLength(6);
  });

  it('starts the run first, picks the right word, builds a tower, and returns null when the run is over', () => {
    const sim = createCastleDefense(loadStory('pip-is-brave'), { seed: 1, helper: false });
    expect(nextCommand(sim.state)).toEqual({ type: 'start' });
    sim.dispatch({ type: 'start' });
    const c = nextCommand(sim.state);
    expect(c).toMatchObject({ type: 'pick' });
    expect(sim.state.step!.choices.find((x) => x.index === (c as { choice: number }).choice)!.right).toBe(true);
    while (sim.state.stage === 'collect') sim.dispatch(nextCommand(sim.state)!);
    expect(nextCommand(sim.state)).toEqual({ type: 'build', post: 0 });
    playToEnd(sim);
    expect(nextCommand(sim.state)).toBeNull();
  });
});
