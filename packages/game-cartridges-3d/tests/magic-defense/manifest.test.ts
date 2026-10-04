/** The Magic Defense manifest, briefing, and catalog. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAME_LOADS, gameBudgetErrors, editionModelIndex, modelEditionOf, MODEL_PACKS, MODEL_PACK_VERSION, modelPackSchema, unboundModelKeys, type ModelPack } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { briefing } from '../../src/magic-defense/briefing.js';
import { FILES_2D, MODELS_3D, manifest } from '../../src/magic-defense/manifest.js';
import strings from '../../src/magic-defense/strings.en.js';
import { MONSTER_KINDS } from '../../src/magic-defense/core/index.js';
import { HEROES } from '../../src/shared/battle/stage2d.js';
import { vaultModels } from '../../src/shared/battle/stage3d.js';
import { STORY } from './helpers.js';

const readPack = (id: string): ModelPack => modelPackSchema.parse(JSON.parse(readFileSync(join(process.cwd(), 'assets', 'packs', id, MODEL_PACK_VERSION, 'pack.json'), 'utf8')));

describe('manifest', () => {
  it('is a valid story-mode turn game for both renderers', () => {
    expect(manifest).toMatchObject({ id: 'magic-defense', inputMode: 'practice', simulation: 'turn', renderers: ['three', 'phaser'] });
    expect(manifest.needs.vocabulary).toBe(4);
    expect(manifest.briefingKey).toBe('magicDefense.briefing');
    expect(manifest.requiredAssetBindings).toEqual([...FILES_2D]);
    expect(manifest.requiredModelBindings).toEqual([...MODELS_3D]);
  });

  it('lists the packs of real models and binds every model the stage names', () => {
    const known = new Set<string>([...Object.keys(MODEL_PACKS), 'sunken-vault']);
    expect(manifest.packs.every((p) => known.has(p))).toBe(true);
    const wanted = [...vaultModels(), ...HEROES, ...MONSTER_KINDS];
    expect(wanted.filter((n) => !MODELS_3D.includes(n))).toEqual([]);
    const edition = modelEditionOf(Object.fromEntries(manifest.packs.map((id) => [id, readPack(id)])), manifest.requiredModelBindings);
    expect(unboundModelKeys(edition, manifest.requiredModelBindings)).toEqual([]);
    const index = editionModelIndex(edition);
    expect(manifest.requiredModelBindings.filter((k) => !index.path(k))).toEqual([]);
  });

  it('the proposed model load (models only, no hero in the list) fits the 6 MB game budget', () => {
    const load = { models: MODELS_3D.filter((m) => !(HEROES as readonly string[]).includes(m)), hero: true };
    const packs = Object.fromEntries(manifest.packs.map((id) => [id, readPack(id)]));
    expect(gameBudgetErrors('magic-defense', load, packs)).toEqual([]);
    const registered = GAME_LOADS['magic-defense'];
    if (registered) expect(registered.hero).toBe(true);
  });

  it('the 2D files cover the party and both monsters', () => {
    for (const kind of MONSTER_KINDS) expect(FILES_2D.some((f) => f.startsWith(`${kind}.`))).toBe(true);
    for (const hero of HEROES) expect(FILES_2D).toContain(`${hero}.attack`);
  });
});

describe('catalog and briefing', () => {
  const i18n = createI18n([strings]).scope('magicDefense');

  it('the briefing comes from catalog keys', () => {
    const b = briefing(i18n, STORY);
    expect(b.title).toBe('Magic Defense');
    expect(b.instructions).toHaveLength(3);
    expect(b.instructions.every((i) => i.title.length > 0 && i.description.length > 0)).toBe(true);
    expect(b.startPhase).toBe('playing');
  });

  it('has a name for every monster and hero', () => {
    for (const k of MONSTER_KINDS) expect(i18n.t(`monsters.${k}`)).not.toBe(`monsters.${k}`);
    for (const k of ['knight', 'wizard', 'cleric']) expect(i18n.t(`heroes.${k}`)).not.toBe(`heroes.${k}`);
  });
});
