/** The manifest, the catalog, and the briefing of Paladin's Twin Soul. */
import { describe, expect, it } from 'vitest';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { briefing } from '../../src/paladins-twin-soul/briefing.js';
import { ENEMY_CLIPS_2D, FILES_2D, MODELS_3D, manifest } from '../../src/paladins-twin-soul/manifest.js';
import strings from '../../src/paladins-twin-soul/strings.en.js';
import { STORY } from './helpers.js';

describe('manifest', () => {
  it('is a story game with both renderers and a turn simulation', () => {
    expect(manifest.id).toBe('paladins-twin-soul');
    expect(manifest.inputMode).toBe('story');
    expect(manifest.simulation).toBe('turn');
    expect([...manifest.renderers].sort()).toEqual(['phaser', 'three']);
    expect(manifest.needs.vocabulary).toBeLessThanOrEqual(STORY.vocabulary.length);
    expect(manifest.requiredAssetBindings).toEqual([...FILES_2D]);
    expect(manifest.requiredModelBindings).toEqual([...MODELS_3D]);
    expect(Object.keys(ENEMY_CLIPS_2D)).toEqual(['skeleton', 'mimic', 'dragon-fire']);
  });

  it('the briefing reads only catalog keys', () => {
    const i18n = createI18n([strings]).scope('paladinsTwinSoul');
    const b = briefing(i18n, STORY);
    expect(b.title).toBe('Paladin’s Twin Soul');
    expect(b.instructions).toHaveLength(3);
    expect(b.startPhase).toBe('playing');
    expect(manifest.briefingKey).toBe('paladinsTwinSoul.briefing');
  });
});
