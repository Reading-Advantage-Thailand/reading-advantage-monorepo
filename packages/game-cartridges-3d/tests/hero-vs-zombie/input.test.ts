/** The core accepts the APK `VocabularyInput` (ids from the index) as well as the whole story. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createHeroVsZombie, evidenceOf, wordsOf } from '../../src/hero-vs-zombie/core/index.js';
import { ofType, playNight } from './helpers.js';

describe('VocabularyInput', () => {
  it('gets ids from the index and skips empty terms or meanings', () => {
    expect(
      wordsOf([
        { term: 'cat', translation: 'แมว' },
        { term: ' ', translation: 'x' },
        { term: 'dog', translation: '' },
        { term: 'bird ', translation: ' นก' },
      ]),
    ).toEqual([
      { id: 'w-1', term: 'cat', translation: 'แมว', position: 0 },
      { id: 'w-4', term: 'bird', translation: 'นก', position: 3 },
    ]);
  });

  it('plays a whole night from four APK items and reports evidence on them', () => {
    const sim = createHeroVsZombie(
      [
        { term: 'cat', translation: 'แมว' },
        { term: 'dog', translation: 'หมา' },
        { term: 'bird', translation: 'นก' },
        { term: 'fish', translation: 'ปลา' },
      ],
      { seed: 1, helper: false },
    );
    expect(sim.state.total).toBe(4);
    expect(sim.state.words.map((w) => w.id).sort()).toEqual(['w-1', 'w-2', 'w-3', 'w-4']);
    const events = playNight(sim);
    expect(sim.state.phase).toBe('complete');
    expect(ofType(events, 'roundStarted').map((e) => e.itemId).sort()).toEqual(['w-1', 'w-2', 'w-3', 'w-4']);
    const evidence = evidenceOf(sim.state, { id: 'apk', level: 'A1' }, 1, sim.state.timeMs);
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence.items.map((i) => i.itemId).sort()).toEqual(['w-1', 'w-2', 'w-3', 'w-4']);
    expect(evidence.items.every((i) => i.solved && i.correctFirstTry)).toBe(true);
  });

  it('a night with no words is complete before it starts', () => {
    const sim = createHeroVsZombie([], { seed: 1, helper: false });
    expect(sim.state.phase).toBe('complete');
    expect(sim.tick()).toEqual([]);
    expect(sim.dispatch({ type: 'blast' })).toEqual([]);
  });
});
