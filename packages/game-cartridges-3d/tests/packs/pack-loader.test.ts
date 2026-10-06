/** ModelLoader.loadPacks: the manifests of the generated packs resolve model and preset paths. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { modelEditionOf, modelPackRoot } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { ModelLoader } from '@reading-advantage/advantage-play-kit-3d/stage';

const SITE = join(process.cwd(), 'assets');

function stubFetch(missing: readonly string[] = []): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async (url: string) => {
    const rel = url.replace(/^site\//, '');
    if (missing.some((m) => rel.includes(m))) return new Response('no', { status: 404, statusText: 'Not Found' });
    return new Response(readFileSync(join(SITE, rel), 'utf8'), { status: 200 });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('ModelLoader packs', () => {
  it('falls back to the legacy path before any pack loads', () => {
    const loader = new ModelLoader('site/');
    expect(loader.modelPath('wall')).toBe('models/wall.glb');
    expect(loader.presetPath('knight', 'royal')).toBe('models/knight/royal.webp');
  });

  it('resolves models and presets from the loaded manifests, fetching each pack once', async () => {
    const fetchFn = stubFetch();
    const loader = new ModelLoader('site/');
    await loader.loadPacks(['sunken-vault', 'heroes']);
    await loader.loadPacks(['heroes']);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(loader.modelPath('wall')).toBe(`${modelPackRoot('sunken-vault')}/wall.glb`);
    expect(loader.modelPath('knight')).toBe(`${modelPackRoot('heroes')}/knight.glb`);
    expect(loader.presetPath('knight', 'champion')).toBe(`${modelPackRoot('heroes')}/knight/champion.webp`);
    expect(loader.modelPath('not-a-model')).toBe('models/not-a-model.glb');
  });

  it('binds an edition: only its keys resolve, and the newest edition wins', async () => {
    stubFetch();
    const loader = new ModelLoader('site/');
    const packs = await loader.fetchPacks(['sunken-vault', 'heroes']);
    loader.bind(modelEditionOf(packs, ['wall', 'knight']));
    expect(loader.modelPath('wall')).toBe(`${modelPackRoot('sunken-vault')}/wall.glb`);
    expect(loader.modelPath('floor')).toBe('models/floor.glb');
    expect(loader.presetPath('knight', 'champion')).toBe(`${modelPackRoot('heroes')}/knight/champion.webp`);
    loader.bind(modelEditionOf(packs, ['floor']));
    expect(loader.modelPath('floor')).toBe(`${modelPackRoot('sunken-vault')}/floor.glb`);
    expect(loader.modelPath('wall')).toBe(`${modelPackRoot('sunken-vault')}/wall.glb`);
  });

  it('rejects when a pack manifest is missing, and retries on the next call', async () => {
    stubFetch(['heroes']);
    const loader = new ModelLoader('site/');
    await expect(loader.loadPacks(['heroes'])).rejects.toThrow(/model pack "heroes": 404/);
    stubFetch();
    await expect(loader.loadPacks(['heroes'])).resolves.toBeUndefined();
  });
});
