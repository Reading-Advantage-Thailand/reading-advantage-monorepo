/**
 * No game shows XP (docs/apk3d-cartridge.md, section 6.1). The server rule decides the awarded XP,
 * and only the host end card shows it, with the number that the server returns. A game view or a
 * game catalog that has the text "XP", or that reads `xp` (for example `result.xp`), fails here.
 * The rules cores may count their own points, so the scan skips `core/`. port-game.mjs copies this
 * test into the monorepo games package, where the sync gate runs it before each sync commit.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const GAMES = join(process.cwd(), 'src/');

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'core' ? [] : walk(path);
    return path.endsWith('.ts') ? [path] : [];
  });

/** Every game folder and the shared code, without the rules cores. */
const sources = readdirSync(GAMES)
  .filter((name) => statSync(join(GAMES, name)).isDirectory())
  .flatMap((name) => walk(join(GAMES, name)));

/** The code without comments; the lines keep their numbers. */
const code = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, '')).replace(/(^|[^:])\/\/.*$/gm, '$1');

/** "XP" as text, or `xp` as a name; the quoted event type `'xp'` of a rules core is not display. */
const SHOWS_XP = /\bXP\b|\bxp\b(?!['"`])/;

describe('no game shows XP', () => {
  it('finds the game sources', () => {
    expect(sources.length).toBeGreaterThan(100);
  });

  it('no game view or catalog has the text "XP" or reads `xp`', () => {
    const found = sources.flatMap((file) =>
      code(readFileSync(file, 'utf8'))
        .split('\n')
        .flatMap((line, i) => (SHOWS_XP.test(line) ? [`${relative(GAMES, file)}:${i + 1}: ${line.trim()}`] : [])),
    );
    expect(found).toEqual([]);
  });

  it('the scan finds XP text and an xp read', () => {
    expect(SHOWS_XP.test(code("hud.float(`+${n} XP`, x, y);"))).toBe(true);
    expect(SHOWS_XP.test(code('label.text = String(result.xp);'))).toBe(true);
    expect(SHOWS_XP.test(code("case 'xp': // XP is not shown"))).toBe(false);
  });
});
