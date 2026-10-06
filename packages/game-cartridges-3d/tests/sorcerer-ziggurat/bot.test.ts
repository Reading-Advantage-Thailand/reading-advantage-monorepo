/** The QC bot plays a whole climb through the public commands. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createSorcererZiggurat, evidenceOf, type ZigguratEvent } from '../../src/sorcerer-ziggurat/core/index.js';
import { nextStep } from '../../src/sorcerer-ziggurat/qc/bot.js';
import { LONG_STORY, STORY, ofType } from './helpers.js';

const SEEDS = Array.from({ length: 24 }, (_, i) => i + 1);

describe('bot', () => {
  it.each(SEEDS.flatMap((seed) => [[seed, 'pip-is-brave'], [seed, 'the-school-garden']] as const))('seed %i plays %s to the end', (seed, inputId) => {
    const story = inputId === 'pip-is-brave' ? STORY : LONG_STORY;
    const sim = createRecorder(seed, createSorcererZiggurat(story, { seed, helper: seed % 2 === 0 }));
    const events: ZigguratEvent[] = [];
    let n = 0;
    while (sim.state.phase === 'climbing' && n++ < 500) {
      const c = nextStep(sim.state);
      if (c) events.push(...sim.dispatch(c));
    }
    expect(sim.state.phase).toBe('complete');
    expect(sim.state.ritualsCleared).toBe(sim.state.rituals);
    expect(ofType(events, 'climbComplete')).toHaveLength(1);
    // The bot reads: it never steps onto a wrong cube.
    expect(ofType(events, 'cubeCrumbled')).toHaveLength(0);
    const evidence = evidenceOf(sim.state, story, seed, 1000);
    expect(storyGameEvidenceSchema.safeParse(evidence).success).toBe(true);
    expect(evidence.items).toHaveLength(sim.state.rituals);
    expect(new Set(evidence.items.map((i) => i.itemId)).size).toBe(evidence.items.length);
    expect(evidence.items.every((i) => i.itemKind === 'sentence' && i.solved && i.correctFirstTry && i.attempts === 1)).toBe(true);
    expect(evidence.practice).toEqual([]);
  });

  it('returns null when the climb is over', () => {
    const sim = createSorcererZiggurat([], { seed: 1, helper: false });
    expect(nextStep(sim.state)).toBeNull();
    const live = createSorcererZiggurat(STORY, { seed: 1, helper: false });
    expect(nextStep(live.state)).toMatchObject({ type: 'step' });
  });
});
