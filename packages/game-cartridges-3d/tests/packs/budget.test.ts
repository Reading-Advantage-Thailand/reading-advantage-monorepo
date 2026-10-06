/** The generated model packs (demo/public/packs): schema, files on disk, and the game budgets. */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MODEL_LICENSE, modelPackSchema, type ModelPack } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { GAME_LOADS, MODEL_PACKS, packVersion, gameBudgetErrors, packBudgetErrors } from '@reading-advantage/advantage-play-kit-3d/contracts';

const ROOT = join(process.cwd(), 'assets', 'packs');
const ids = existsSync(ROOT) ? readdirSync(ROOT).sort() : [];
const packs: Record<string, ModelPack> = {};
for (const id of ids) packs[id] = modelPackSchema.parse(JSON.parse(readFileSync(join(ROOT, id, packVersion(id), 'pack.json'), 'utf8')));

describe('generated model packs', () => {
  it('exist for every declared pack and the vault', () => {
    expect(ids).toEqual([...Object.keys(MODEL_PACKS), 'sunken-vault'].sort());
  });

  it.each(ids)('%s: files exist with the recorded size and no hash field', (id) => {
    const pack = packs[id]!;
    expect(pack.root).toBe(`packs/${id}/${packVersion(id)}`);
    for (const file of Object.values(pack.files)) {
      const path = join(ROOT, id, packVersion(id), file.path);
      expect(statSync(path).size, file.path).toBe(file.byteSize);
      expect(file.provenance.license).toBe(MODEL_LICENSE);
      expect(JSON.stringify(file)).not.toMatch(/sha256|hash/i);
      for (const preset of file.presets) expect(existsSync(join(ROOT, id, packVersion(id), file.id, `${preset}.webp`))).toBe(true);
    }
  });

  it('keeps every model in one pack', () => {
    const seen = new Map<string, string>();
    for (const pack of Object.values(packs))
      for (const file of Object.values(pack.files)) {
        expect(seen.get(file.id), `${file.id} in ${pack.id}`).toBeUndefined();
        seen.set(file.id, pack.id);
      }
  });

  it('keeps every file inside the model budget', () => {
    expect(Object.values(packs).flatMap((p) => packBudgetErrors(p))).toEqual([]);
  });

  it.each(Object.entries(GAME_LOADS))('%s: loads inside the game budget', (game, load) => {
    expect(gameBudgetErrors(game, load, packs)).toEqual([]);
  });
});
