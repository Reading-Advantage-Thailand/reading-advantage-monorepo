/** The manifest binds only models and 2D files that exist, and the catalog holds every key the briefing reads. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { editionModelIndex, modelEditionOf, MODEL_PACKS, MODEL_PACK_VERSION, modelPackSchema, unboundModelKeys, type ModelPack } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { briefing } from '../../src/abyssal-well/briefing.js';
import { CREATURES } from '../../src/abyssal-well/core/index.js';
import { CREATURE_CLIPS_2D, FILES_2D, MODELS_3D, manifest } from '../../src/abyssal-well/manifest.js';
import strings from '../../src/abyssal-well/strings.en.js';
import { WELL_MODELS } from '../../src/abyssal-well/view/well.js';
import { STORY } from './helpers.js';

const readPack = (id: string): ModelPack => modelPackSchema.parse(JSON.parse(readFileSync(join(process.cwd(), 'assets', 'packs', id, MODEL_PACK_VERSION, 'pack.json'), 'utf8')));

describe('manifest', () => {
  it('is a valid story-mode turn game for both renderers', () => {
    expect(manifest).toMatchObject({
      id: 'abyssal-well',
      inputMode: 'practice',
      simulation: 'turn',
      renderers: ['three', 'phaser'],
      levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
      needs: { sentences: 3 },
      briefingKey: 'abyssalWell.briefing',
    });
    expect(manifest.requiredAssetBindings).toEqual([...FILES_2D]);
    expect(manifest.requiredModelBindings).toEqual([...MODELS_3D]);
  });

  it('every 3D model is in a listed pack, and the scene, the creatures, and the heroes are all bound', () => {
    const known = new Set<string>([...Object.keys(MODEL_PACKS), 'sunken-vault']);
    expect(manifest.packs.every((p) => known.has(p))).toBe(true);
    const inPacks = new Set(manifest.packs.flatMap((p) => MODEL_PACKS[p] ?? []));
    expect(MODELS_3D.filter((m) => !inPacks.has(m))).toEqual([]);
    const wanted = [...WELL_MODELS, ...CREATURES, 'knight', 'wizard', 'cleric'];
    expect(wanted.filter((m) => !MODELS_3D.includes(m))).toEqual([]);
    const edition = modelEditionOf(Object.fromEntries(manifest.packs.map((id) => [id, readPack(id)])), manifest.requiredModelBindings);
    expect(unboundModelKeys(edition, manifest.requiredModelBindings)).toEqual([]);
    const index = editionModelIndex(edition);
    expect(manifest.requiredModelBindings.filter((k) => !index.path(k))).toEqual([]);
  });

  it('every 2D file is in the primary-chibi-2d pack; the well is drawn, not bound', () => {
    const pack = JSON.parse(readFileSync(join(process.cwd(), 'assets/apk/primary-chibi-2d/v1/pack.json'), 'utf8')) as { files: Record<string, unknown> };
    expect(FILES_2D.filter((f) => !(f in pack.files))).toEqual([]);
    expect(FILES_2D.some((f) => f.startsWith('background.'))).toBe(false);
    for (const creature of CREATURES) expect(CREATURE_CLIPS_2D[creature]?.length).toBeGreaterThan(0);
  });
});

describe('catalog and briefing', () => {
  const i18n = createI18n([strings]).scope('abyssalWell');

  it('the briefing reads real catalog keys', () => {
    const b = briefing(i18n, STORY);
    expect(b.title).toBe('Abyssal Well');
    expect(b.instructions).toHaveLength(3);
    expect(b.instructions.every((i) => i.title.length > 0 && i.description.length > 0 && !i.title.includes('instructions.'))).toBe(true);
    expect(b.startPhase).toBe('playing');
  });

  it('holds every hud key the views read', () => {
    const hud = i18n.scope('hud').t;
    for (const key of ['place', 'descent', 'courage', 'story', 'aim', 'struck', 'bounced', 'courageLost', 'rest.title', 'rest.text', 'done.title', 'done.text']) {
      expect(hud(key, { descent: 1, descents: 4 })).not.toBe(key);
    }
  });
});
