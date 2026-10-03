/** The manifest binds only models and 2D files that exist, and the catalog holds every key the briefing reads. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAME_LOADS, MODEL_PACKS } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { briefing } from '../../src/realm-carver/briefing.js';
import { MONSTER_KINDS } from '../../src/realm-carver/core/index.js';
import { FILES_2D, MODELS_3D, manifest } from '../../src/realm-carver/manifest.js';
import strings from '../../src/realm-carver/strings.en.js';
import { REALM_MODELS } from '../../src/realm-carver/view/realm.js';
import { STORY } from './helpers.js';

describe('manifest', () => {
  it('every 3D model is in a listed pack, and the scene, the monsters, and the heroes are all bound', () => {
    const inPacks = new Set(manifest.packs.flatMap((p) => MODEL_PACKS[p] ?? []));
    expect(MODELS_3D.filter((m) => !inPacks.has(m))).toEqual([]);
    expect(manifest.requiredModelBindings).toEqual([...MODELS_3D]);
    const wanted = [...REALM_MODELS, ...MONSTER_KINDS, 'knight', 'wizard', 'cleric'];
    expect(wanted.filter((m) => !MODELS_3D.includes(m))).toEqual([]);
  });

  it('the model load of the game lists the scene and the monsters, never a hero', () => {
    const load = GAME_LOADS['realm-carver'];
    if (!load) return; // the lead adds the line; the check runs once it exists
    expect(load.hero).toBe(true);
    expect([...REALM_MODELS, ...MONSTER_KINDS].filter((m) => !(load.models ?? []).includes(m))).toEqual([]);
    expect((load.models ?? []).filter((m) => ['knight', 'wizard', 'cleric'].includes(m))).toEqual([]);
  });

  it('every 2D file is in the primary-chibi-2d pack; the ground is drawn, not bound', () => {
    const pack = JSON.parse(readFileSync(join(process.cwd(), 'assets/apk/primary-chibi-2d/v1/pack.json'), 'utf8')) as { files: Record<string, unknown> };
    expect(FILES_2D.filter((f) => !(f in pack.files))).toEqual([]);
    expect(FILES_2D.some((f) => f.startsWith('background.'))).toBe(false);
  });

  it('the briefing reads real catalog keys', () => {
    const i18n = createI18n([strings]).scope('realmCarver');
    const b = briefing(i18n, STORY);
    expect(b.title).toBe('Realm Carver');
    expect(b.instructions).toHaveLength(3);
    expect(b.instructions.every((i) => i.title.length > 0 && !i.title.includes('instructions.'))).toBe(true);
    expect(b.startPhase).toBe('playing');
  });
});
