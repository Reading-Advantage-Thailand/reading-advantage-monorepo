/** The manifest binds only models and 2D files that exist, and the catalog holds every key the briefing reads. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MODEL_PACKS } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { briefing } from '../../src/shadow-gate-dungeon/briefing.js';
import { FILES_2D, MODELS_3D, manifest } from '../../src/shadow-gate-dungeon/manifest.js';
import strings from '../../src/shadow-gate-dungeon/strings.en.js';
import { DUNGEON_MODELS } from '../../src/shadow-gate-dungeon/view/dungeon.js';
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
    const wanted = [...DUNGEON_MODELS, 'knight', 'wizard', 'cleric'];
    expect(wanted.filter((m) => !MODELS_3D.includes(m))).toEqual([]);
  });

  it('the manifest is a story cartridge for A0 to A1 with both renderers', () => {
    expect(manifest).toMatchObject({
      id: 'shadow-gate-dungeon',
      inputMode: 'practice',
      simulation: 'realtime',
      levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
      needs: { sentences: 3 },
      briefingKey: 'shadowGateDungeon.briefing',
    });
    expect(manifest.renderers).toEqual(['three', 'phaser']);
  });

  it('every 2D file is in the primary-chibi-2d pack', () => {
    const pack = JSON.parse(readFileSync(join(process.cwd(), 'assets/apk/primary-chibi-2d/v1/pack.json'), 'utf8')) as { files: Record<string, unknown> };
    expect(FILES_2D.filter((f) => !(f in pack.files))).toEqual([]);
  });

  it('the briefing reads real catalog keys', () => {
    const i18n = createI18n([strings]).scope('shadowGateDungeon');
    const b = briefing(i18n, STORY);
    expect(b.title).toBe('Shadow Gate Dungeon');
    expect(b.instructions).toHaveLength(3);
    expect(b.instructions.every((i) => i.title.length > 0 && !i.title.includes('instructions.'))).toBe(true);
    expect(b.startPhase).toBe('playing');
  });
});
