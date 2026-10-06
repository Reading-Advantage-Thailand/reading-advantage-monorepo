/** The manifest binds only models and 2D files that exist, and the catalog holds every key the briefing reads. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MODEL_PACKS } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { briefing } from '../../src/alchemists-synthesis/briefing.js';
import { FILES_2D, MODELS_3D, manifest } from '../../src/alchemists-synthesis/manifest.js';
import strings from '../../src/alchemists-synthesis/strings.en.js';
import { INGREDIENT_KINDS } from '../../src/alchemists-synthesis/core/index.js';
import { LAB_MODELS } from '../../src/alchemists-synthesis/view/lab.js';
import { STORY } from './helpers.js';

describe('manifest', () => {
  it('every 3D model is in a listed pack, and the lab, the ingredients, and the heroes are all bound', () => {
    const inPacks = new Set(manifest.packs.flatMap((p) => MODEL_PACKS[p] ?? []));
    expect(MODELS_3D.filter((m) => !inPacks.has(m))).toEqual([]);
    expect(manifest.requiredModelBindings).toEqual([...MODELS_3D]);
    const wanted = [...LAB_MODELS, ...INGREDIENT_KINDS, 'knight', 'wizard', 'cleric'];
    expect(wanted.filter((m) => !MODELS_3D.includes(m))).toEqual([]);
    expect(MODELS_3D.filter((m) => !wanted.includes(m))).toEqual([]);
  });

  it('every 2D file is in the primary-chibi-2d pack; the lab floor is drawn, not bound', () => {
    const pack = JSON.parse(readFileSync(join(process.cwd(), 'assets/apk/primary-chibi-2d/v1/pack.json'), 'utf8')) as { files: Record<string, unknown> };
    expect(FILES_2D.filter((f) => !(f in pack.files))).toEqual([]);
    expect(FILES_2D.some((f) => f.startsWith('background.'))).toBe(false);
    for (const kind of INGREDIENT_KINDS) expect(FILES_2D).toContain(`prop.${kind}`);
  });

  it('needs four words and the story fixture is compatible', () => {
    expect(manifest.needs).toMatchObject({ vocabulary: 4 });
    expect(STORY.vocabulary.length).toBeGreaterThanOrEqual(manifest.needs.vocabulary);
    expect(manifest.renderers).toEqual(['three', 'phaser']);
  });

  it('the briefing reads real catalog keys', () => {
    const i18n = createI18n([strings]).scope('alchemistsSynthesis');
    const b = briefing(i18n, STORY);
    expect(b.title).toBe("Alchemist's Synthesis");
    expect(b.instructions).toHaveLength(3);
    expect(b.instructions.every((i) => i.title.length > 0 && !i.title.includes('instructions.'))).toBe(true);
    expect(b.startPhase).toBe('playing');
  });
});
