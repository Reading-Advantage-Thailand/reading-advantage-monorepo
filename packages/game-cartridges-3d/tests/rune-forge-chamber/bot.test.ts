/** The QC bot plays a whole forge within a step limit, through the public commands. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createRuneForgeChamber, evidenceOf, type RuneForgeChamberEvent } from '../../src/rune-forge-chamber/core/index.js';
import { nextChoice } from '../../src/rune-forge-chamber/qc/bot.js';
import { LONG_STORY, STORY, ofType, stepsOf } from './helpers.js';

const LIMIT_STEPS = stepsOf(5 * 60_000);
/** The bot acts every 5 steps (6 times per second), as the QC driver does. */
const ACT_EVERY = 5;

describe('bot', () => {
  it.each(
    Array.from({ length: 24 }, (_, i) => i + 1).flatMap((seed) =>
      (['pip-is-brave', 'the-school-garden'] as const).map((story) => [seed, seed % 2 === 0, story] as const),
    ),
  )('seed %i helper %s plays %s to the end', { timeout: 30_000 }, (seed, helper, inputId) => {
    const story = inputId === 'pip-is-brave' ? STORY : LONG_STORY;
    const sim = createRecorder(seed, createRuneForgeChamber(story, { seed, helper }));
    const events: RuneForgeChamberEvent[] = [];
    let steps = 0;
    while (sim.state.phase === 'playing' && steps < LIMIT_STEPS) {
      if (steps % ACT_EVERY === 0) {
        const c = nextChoice(sim.state);
        if (c) events.push(...sim.dispatch(c));
      }
      events.push(...sim.tick());
      steps += 1;
    }
    expect(sim.state.phase).toBe('complete');
    expect(steps).toBeLessThan(LIMIT_STEPS);
    expect(sim.state.sentencesForged).toBe(sim.state.sentences);
    expect(ofType(events, 'forgeComplete')).toHaveLength(1);
    expect(sim.state.forge.every((b) => b.forged)).toBe(true);
    // The bot reads: it never strikes a wrong rune.
    expect(ofType(events, 'runeFizzled')).toHaveLength(0);
    expect(ofType(events, 'runeStruck')).toHaveLength(sim.state.forge.reduce((n, b) => n + b.words.length, 0));
    // One evidence item per story item (sentence) the forge used, all solved on the first try.
    const evidence = evidenceOf(sim.state, story, seed, 1000);
    expect(storyGameEvidenceSchema.safeParse(evidence).success).toBe(true);
    expect(evidence.items).toHaveLength(sim.state.sentences);
    expect(new Set(evidence.items.map((i) => i.itemId)).size).toBe(evidence.items.length);
    expect(evidence.items.every((i) => story.sentences.some((s) => s.id === i.itemId))).toBe(true);
    expect(evidence.items.every((i) => i.solved && i.correctFirstTry && i.attempts === 1)).toBe(true);
    expect(evidence.practice).toEqual([]);
  });

  it('returns null with nothing to do, and waits while a strike runs or the right rune is dim', () => {
    const sim = createRuneForgeChamber(STORY, { seed: 1, helper: false });
    const c = nextChoice(sim.state)!;
    expect(c).toMatchObject({ type: 'choose' });
    sim.dispatch(c);
    expect(nextChoice(sim.state)).toBeNull();
    const other = createRuneForgeChamber(STORY, { seed: 1, helper: false });
    for (const r of other.state.runes) r.dimMs = 500;
    expect(nextChoice(other.state)).toBeNull();
    expect(nextChoice(createRuneForgeChamber([], { seed: 1, helper: false }).state)).toBeNull();
  });
});
