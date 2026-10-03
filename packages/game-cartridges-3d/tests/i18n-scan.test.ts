/**
 * Every t('...') literal in the games and in the kit's host exists in the merged catalogs, and the
 * host views assign no literal text: the strings live in the catalogs (English first).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { mergeCatalogs } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { literalTextAssignments, missingKeys, scanKeys } from '@reading-advantage/advantage-play-kit-3d/i18n/scan';
import type { Catalog } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { hostStrings } from '../src/index.js';

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' || name === 'dist' ? [] : walk(path);
    return path.endsWith('.ts') ? [path] : [];
  });

const ROOT = process.cwd();
const GAMES_SRC = join(ROOT, 'src');
const KIT_SRC = join(ROOT, '..', 'advantage-play-kit-3d', 'src');
const sources = [...walk(GAMES_SRC), ...walk(join(KIT_SRC, 'host')), ...walk(join(KIT_SRC, 'hud'))];

/** The catalog of every game's `strings.en.ts`, by game folder. */
async function loadGameCatalogs(): Promise<Map<string, Catalog>> {
  const catalogs = new Map<string, Catalog>();
  for (const file of walk(GAMES_SRC).filter((f) => /\/src\/[^/]+\/strings\.en\.ts$/.test(f))) {
    const mod = (await import(pathToFileURL(file).href)) as { default?: Catalog };
    if (!mod.default) throw new Error(`${relative(ROOT, file)} exports no default catalog`);
    catalogs.set(/\/src\/([^/]+)\//.exec(file)![1]!, mod.default);
  }
  return catalogs;
}

describe('source scan', () => {
  it("every t('...') literal exists in the merged catalogs", async () => {
    const games = await loadGameCatalogs();
    const catalog = mergeCatalogs(hostStrings as Catalog, ...games.values());
    /** A game file's `context.i18n` is already scoped to the game: its catalog roots are the bases. */
    const basesFor = (file: string): string[] => {
      const game = /\/game-cartridges-3d\/src\/([^/]+)\//.exec(file)?.[1];
      return game && games.has(game) ? ['', ...Object.keys(games.get(game)!)] : [''];
    };
    const problems: string[] = [];
    for (const file of sources) {
      if (/strings\.en\.ts$|\.test\.ts$|css\.ts$/.test(file)) continue;
      const scan = scanKeys(readFileSync(file, 'utf8'));
      for (const { key, line } of missingKeys(catalog, scan, basesFor(file))) problems.push(`${relative(ROOT, file)}:${line}: t('${key}') is not in the catalog`);
    }
    expect(games.size).toBe(25);
    expect(problems).toEqual([]);
  });

  it('view and host files assign no literal text to textContent or innerHTML', () => {
    const views = sources.filter((f) => /\/game-cartridges-3d\/src\/[^/]+\/view\//.test(f) || /\/advantage-play-kit-3d\/src\/host\//.test(f));
    const problems: string[] = [];
    for (const file of views) {
      if (/strings\.en\.ts$|css\.ts$/.test(file)) continue;
      for (const { line, text } of literalTextAssignments(readFileSync(file, 'utf8'))) problems.push(`${relative(ROOT, file)}:${line}: literal text "${text}" (use the catalog)`);
    }
    expect(problems).toEqual([]);
  });
});
