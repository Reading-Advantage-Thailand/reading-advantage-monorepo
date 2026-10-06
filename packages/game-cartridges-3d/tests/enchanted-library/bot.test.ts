/** The QC bot plays a whole visit within a step limit, through the public commands. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createEnchantedLibrary, evidenceOf, type LibraryEvent } from '../../src/enchanted-library/core/index.js';
import { nextCommand } from '../../src/enchanted-library/qc/bot.js';
import { SMALL_STORY, STORY, ofType, stepsOf } from './helpers.js';

const LIMIT_STEPS = stepsOf(5 * 60_000);
/** The bot acts every 5 steps (6 times per second), as the QC driver does. */
const ACT_EVERY = 5;

describe('bot', () => {
  it.each(
    [1, 2, 3, 4, 5, 6, 7, 8].flatMap((seed) =>
      (['pip-is-brave', 'the-school-garden'] as const).map((story) => [seed, seed % 2 === 0, story] as const),
    ),
  )('seed %i helper %s plays %s to the end', { timeout: 30_000 }, (seed, helper, inputId) => {
    const story = inputId === 'pip-is-brave' ? STORY : SMALL_STORY;
    const sim = createRecorder(seed, createEnchantedLibrary(story, { seed, helper }));
    const events: LibraryEvent[] = [];
    let steps = 0;
    while (sim.state.phase === 'playing' && steps < LIMIT_STEPS) {
      if (steps % ACT_EVERY === 0) {
        const c = nextCommand(sim.state);
        if (c) events.push(...sim.dispatch(c));
      }
      events.push(...sim.tick());
      steps += 1;
    }
    expect(sim.state.phase).toBe('complete');
    expect(steps).toBeLessThan(LIMIT_STEPS);
    expect(sim.state.roundsCleared).toBe(sim.state.roundCount);
    expect(ofType(events, 'visitComplete')).toHaveLength(1);
    expect(sim.state.rounds.every((r) => r.cleared)).toBe(true);
    // The bot reads: it never touches a wrong book.
    expect(ofType(events, 'bookWrong')).toHaveLength(0);
    // One evidence item per story item (word) the visit used, all solved on the first try.
    const evidence = evidenceOf(sim.state, story, seed, 1000);
    expect(storyGameEvidenceSchema.safeParse(evidence).success).toBe(true);
    expect(evidence.items).toHaveLength(sim.state.roundCount);
    expect(new Set(evidence.items.map((i) => i.itemId)).size).toBe(evidence.items.length);
    expect(evidence.items.every((i) => i.itemKind === 'word' && i.solved && i.correctFirstTry && i.attempts === 1)).toBe(true);
    expect(evidence.practice).toEqual([]);
  });

  it('raises the shield when a spirit is close, and returns null with nothing to do', () => {
    const sim = createEnchantedLibrary(STORY, { seed: 1, helper: false });
    expect(nextCommand(sim.state)).toMatchObject({ type: 'steer' });
    sim.state.spirits.push({ id: 's', x: sim.state.hero.x + 1, z: sim.state.hero.z, vx: 0, vz: 0, calmMs: 0 });
    expect(nextCommand(sim.state)).toEqual({ type: 'shield' });
    sim.state.hero.controlMs = 500;
    expect(nextCommand(sim.state)).toBeNull();
    expect(nextCommand(createEnchantedLibrary([], { seed: 1, helper: false }).state)).toBeNull();
  });
});
