/** The RPG Battle manifest, briefing, and catalog. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { editionModelIndex, modelEditionOf, MODEL_PACKS, MODEL_PACK_VERSION, modelPackSchema, unboundModelKeys, type ModelPack } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { briefing } from '../../src/rpg-battle/briefing.js';
import { FILES_2D, MODELS_3D, manifest } from '../../src/rpg-battle/manifest.js';
import strings from '../../src/rpg-battle/strings.en.js';
import { HEROES } from '../../src/shared/battle/stage2d.js';
import { vaultModels } from '../../src/shared/battle/stage3d.js';
import { STORY } from './helpers.js';

const readPack = (id: string): ModelPack => modelPackSchema.parse(JSON.parse(readFileSync(join(process.cwd(), 'assets', 'packs', id, MODEL_PACK_VERSION, 'pack.json'), 'utf8')));

describe('manifest', () => {
  it('is a valid story-mode turn game for both renderers', () => {
    expect(manifest).toMatchObject({ id: 'rpg-battle', title: 'RPG Battle', inputMode: 'story', simulation: 'turn', renderers: ['three', 'phaser'] });
    expect(manifest.needs.vocabulary).toBe(4);
    expect(manifest.briefingKey).toBe('rpgBattle.briefing');
    expect(manifest.requiredAssetBindings).toEqual([...FILES_2D]);
    expect(manifest.requiredModelBindings).toEqual([...MODELS_3D]);
  });

  it('lists the packs of real models and binds every model the stage names', () => {
    const known = new Set<string>([...Object.keys(MODEL_PACKS), 'sunken-vault']);
    expect(manifest.packs.every((p) => known.has(p))).toBe(true);
    const wanted = [...vaultModels(), ...HEROES, 'skeleton', 'mimic', 'dragon-fire'];
    expect(wanted.filter((n) => !MODELS_3D.includes(n))).toEqual([]);
    const edition = modelEditionOf(Object.fromEntries(manifest.packs.map((id) => [id, readPack(id)])), manifest.requiredModelBindings);
    expect(unboundModelKeys(edition, manifest.requiredModelBindings)).toEqual([]);
    const index = editionModelIndex(edition);
    expect(manifest.requiredModelBindings.filter((k) => !index.path(k))).toEqual([]);
  });
});

describe('catalog and briefing', () => {
  const i18n = createI18n([strings]).scope('rpgBattle');

  it('the briefing comes from catalog keys', () => {
    const b = briefing(i18n, STORY);
    expect(b.title).toBe('RPG Battle');
    expect(b.instructions).toHaveLength(3);
    expect(b.instructions.every((i) => i.title.length > 0 && i.description.length > 0)).toBe(true);
    expect(b.startPhase).toBe('playing');
  });

  it('has a name for every monster, hero, and action', () => {
    for (const k of ['skeleton', 'mimic', 'dragon-fire']) expect(i18n.t(`monsters.${k}`)).not.toBe(`monsters.${k}`);
    for (const k of ['knight', 'wizard', 'cleric']) expect(i18n.t(`heroes.${k}`)).not.toBe(`heroes.${k}`);
    for (const k of ['slash', 'blaze', 'mend']) expect(i18n.t(`actions.${k}`)).not.toBe(`actions.${k}`);
  });
});
