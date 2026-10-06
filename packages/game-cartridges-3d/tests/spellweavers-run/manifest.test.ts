/** The manifest binds only models and 2D files that exist, and the catalog holds every key the briefing reads. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MODEL_PACKS, packVersion } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { briefing } from '../../src/spellweavers-run/briefing.js';
import { FILES_2D, MODELS_3D, manifest } from '../../src/spellweavers-run/manifest.js';
import strings from '../../src/spellweavers-run/strings.en.js';
import { RUN_MODELS } from '../../src/spellweavers-run/view/land.js';
import { STORY } from './helpers.js';

describe('manifest', () => {
  it('every 3D model is in a listed pack (the vault pack holds arch and gate), and the scene and the heroes are all bound', () => {
    const inPacks = new Set(manifest.packs.flatMap((p) => MODEL_PACKS[p] ?? []));
    const vault = JSON.parse(readFileSync(join(process.cwd(), 'assets', 'packs', 'sunken-vault', packVersion('sunken-vault'), 'pack.json'), 'utf8')) as { files: Record<string, unknown> };
    for (const name of Object.keys(vault.files)) inPacks.add(name);
    expect(MODELS_3D.filter((m) => !inPacks.has(m))).toEqual([]);
    expect(manifest.requiredModelBindings).toEqual([...MODELS_3D]);
    const wanted = [...RUN_MODELS, 'knight', 'wizard', 'cleric'];
    expect(wanted.filter((m) => !MODELS_3D.includes(m))).toEqual([]);
  });

  it('every 2D file is in the primary-chibi-2d pack', () => {
    const pack = JSON.parse(readFileSync(join(process.cwd(), 'assets/apk/primary-chibi-2d/v1/pack.json'), 'utf8')) as { files: Record<string, unknown> };
    expect(FILES_2D.filter((f) => !(f in pack.files))).toEqual([]);
  });

  it('needs sentences, plays the early levels, and runs in both renderers', () => {
    expect(manifest.needs).toEqual({ vocabulary: 0, sentences: 3, fills: 0, questions: 0 });
    expect(manifest.renderers).toEqual(['three', 'phaser']);
    expect(manifest.inputMode).toBe('practice');
  });

  it('the briefing reads real catalog keys', () => {
    const i18n = createI18n([strings]).scope('spellweaversRun');
    const b = briefing(i18n, STORY);
    expect(b.title).toBe("Spellweaver's Run");
    expect(b.instructions).toHaveLength(3);
    expect(b.instructions.every((i) => i.title.length > 0 && !i.title.includes('instructions.'))).toBe(true);
    expect(b.startPhase).toBe('playing');
  });
});
