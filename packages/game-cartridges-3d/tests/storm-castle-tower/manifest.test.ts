/** The manifest binds only models and 2D files that exist, and the catalog holds every key the briefing reads. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MODEL_PACKS } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { briefing } from '../../src/storm-castle-tower/briefing.js';
import { FILES_2D, MODELS_3D, manifest } from '../../src/storm-castle-tower/manifest.js';
import strings from '../../src/storm-castle-tower/strings.en.js';
import { TOWER_MODELS } from '../../src/storm-castle-tower/view/tower.js';
import { STORY } from './helpers.js';

describe('manifest', () => {
  it('every 3D model is in a listed pack (or the vault), and the scene and the heroes are all bound', () => {
    const inPacks = new Set(manifest.packs.flatMap((p) => MODEL_PACKS[p] ?? []));
    const vault = manifest.packs.includes('sunken-vault');
    const outside = MODELS_3D.filter((m) => !inPacks.has(m));
    // The vault pieces come from the vault pack, which MODEL_PACKS does not list.
    expect(vault).toBe(true);
    expect(outside.every((m) => !(m in MODEL_PACKS))).toBe(true);
    expect(manifest.requiredModelBindings).toEqual([...MODELS_3D]);
    const wanted = [...TOWER_MODELS, 'knight', 'wizard', 'cleric'];
    expect(wanted.filter((m) => !MODELS_3D.includes(m))).toEqual([]);
    expect(MODELS_3D.filter((m) => !wanted.includes(m))).toEqual([]);
  });

  it('every 3D file exists in demo/public/models', () => {
    for (const name of MODELS_3D) expect(() => readFileSync(join(process.cwd(), 'demo/public/models', `${name}.glb`)), name).not.toThrow();
  });

  it('is a story cartridge that needs sentences, for A0 to A1, in both renderers', () => {
    expect(manifest).toMatchObject({
      id: 'storm-castle-tower',
      inputMode: 'story',
      simulation: 'realtime',
      levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
      needs: { sentences: 3 },
      briefingKey: 'stormCastleTower.briefing',
    });
    expect(manifest.renderers).toEqual(['three', 'phaser']);
  });

  it('every 2D file is in the primary-chibi-2d pack; the tower is drawn, not bound', () => {
    const pack = JSON.parse(readFileSync(join(process.cwd(), 'assets/apk/primary-chibi-2d/v1/pack.json'), 'utf8')) as { files: Record<string, unknown> };
    expect(FILES_2D.filter((f) => !(f in pack.files))).toEqual([]);
    expect(FILES_2D.some((f) => f.startsWith('background.'))).toBe(false);
  });

  it('the briefing reads real catalog keys', () => {
    const i18n = createI18n([strings]).scope('stormCastleTower');
    const b = briefing(i18n, STORY);
    expect(b.title).toBe('Storm Castle Tower');
    expect(b.instructions).toHaveLength(3);
    expect(b.instructions.every((i) => i.title.length > 0 && !i.title.includes('instructions.'))).toBe(true);
    expect(b.startPhase).toBe('playing');
  });
});
