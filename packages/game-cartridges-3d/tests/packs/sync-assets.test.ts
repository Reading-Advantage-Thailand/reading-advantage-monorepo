/**
 * The app asset copy (`scripts/sync-assets.mjs`, run by the Primary Advantage predev and prebuild).
 * It replaces each 3D pack folder on its own and keeps the other folders under `public/packs/`,
 * because the app commits the avatar pack of its RPG pages at `public/packs/avatar/`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = join(process.cwd(), 'scripts', 'sync-assets.mjs');
const PACKS = join(process.cwd(), 'assets', 'packs');
let dir = '';
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('sync-assets', () => {
  it('replaces each 3D pack folder and keeps the app avatar pack', () => {
    dir = mkdtempSync(join(tmpdir(), 'sync-assets-'));
    mkdirSync(join(dir, 'packs', 'avatar', '1.0.0'), { recursive: true });
    writeFileSync(join(dir, 'packs', 'avatar', '1.0.0', 'pack.json'), '{"keep":true}');
    mkdirSync(join(dir, 'packs', 'heroes', '0.9.0'), { recursive: true });
    execFileSync('node', [SCRIPT, dir], { stdio: 'ignore' });
    expect(readFileSync(join(dir, 'packs', 'avatar', '1.0.0', 'pack.json'), 'utf8')).toBe('{"keep":true}');
    for (const pack of readdirSync(PACKS)) expect(readdirSync(join(dir, 'packs', pack))).toEqual(readdirSync(join(PACKS, pack)));
    expect(existsSync(join(dir, 'packs', 'heroes', '0.9.0'))).toBe(false);
    expect(existsSync(join(dir, 'assets', 'apk', 'primary-chibi-2d', 'v1', 'pack.json'))).toBe(true);
  });
});
