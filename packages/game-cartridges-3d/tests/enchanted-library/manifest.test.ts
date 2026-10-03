/** The manifest binds only models and 2D files that exist, and the catalog holds every key the briefing reads. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MODEL_PACKS } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { briefing } from '../../src/enchanted-library/briefing.js';
import { FILES_2D, MODELS_3D, manifest } from '../../src/enchanted-library/manifest.js';
import strings from '../../src/enchanted-library/strings.en.js';
import { HALL_MODELS } from '../../src/enchanted-library/view/hall.js';
import { STORY } from './helpers.js';

describe('manifest', () => {
  it('every 3D model is in a listed pack, and the scene, the spirits, and the heroes are all bound', () => {
    const inPacks = new Set(manifest.packs.flatMap((p) => MODEL_PACKS[p] ?? []));
    expect(MODELS_3D.filter((m) => !inPacks.has(m))).toEqual([]);
    expect(manifest.requiredModelBindings).toEqual([...MODELS_3D]);
    const wanted = [...HALL_MODELS, 'knight', 'wizard', 'cleric'];
    expect(wanted.filter((m) => !MODELS_3D.includes(m))).toEqual([]);
  });

  it('every 2D file is in the primary-chibi-2d pack; the hall is drawn, not bound', () => {
    const pack = JSON.parse(readFileSync(join(process.cwd(), 'assets/apk/primary-chibi-2d/v1/pack.json'), 'utf8')) as { files: Record<string, unknown> };
    expect(FILES_2D.filter((f) => !(f in pack.files))).toEqual([]);
    expect(FILES_2D.some((f) => f.startsWith('background.'))).toBe(false);
  });

  it('is a story cartridge that needs vocabulary, for A0 to A1, in both renderers', () => {
    expect(manifest).toMatchObject({
      id: 'enchanted-library',
      inputMode: 'story',
      simulation: 'realtime',
      levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
      needs: { vocabulary: 4 },
      briefingKey: 'enchantedLibrary.briefing',
    });
    expect(manifest.renderers).toEqual(['three', 'phaser']);
  });

  it('the briefing reads real catalog keys', () => {
    const i18n = createI18n([strings]).scope('enchantedLibrary');
    const b = briefing(i18n, STORY);
    expect(b.title).toBe('Enchanted Library');
    expect(b.instructions).toHaveLength(3);
    expect(b.instructions.every((i) => i.title.length > 0 && !i.title.includes('instructions.'))).toBe(true);
    expect(b.startPhase).toBe('playing');
  });
});
