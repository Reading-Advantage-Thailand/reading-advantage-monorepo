// @vitest-environment jsdom
/** The story game host: the briefing screen, its buttons, and teardown (the game itself needs WebGL or Phaser). */
import { describe, expect, it, vi } from 'vitest';
import { inputIdOf, sessionOptionsOf, startStoryGame } from '../host/story-game.js';
import { previewItems } from '../host/briefing.js';
import type { Cartridge } from '../factory/index.js';
import { toPracticeInput, type StoryInput } from '../contracts/index.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const story = JSON.parse(readFileSync(join(process.cwd(), 'tests', 'fixtures', 'stories', 'pips-happy-night', 'story.json'), 'utf8')) as StoryInput;
const input = toPracticeInput(story);

const cartridge = {
  manifest: {
    id: 'demo-game',
    briefingKey: 'demo.briefing',
    inputMode: 'practice',
    needs: { vocabulary: 0, sentences: 0, fills: 0, questions: 0 },
    device: {},
    renderers: ['three'],
    packs: ['heroes'],
    requiredModelBindings: [],
    requiredAssetBindings: [],
  },
  strings: { demo: { briefing: { title: 'Demo' } } },
  briefing: () => ({
    title: 'Demo game',
    objective: 'Play the demo.',
    instructions: [{ title: 'Step one', description: 'Do the thing.' }],
    controls: [{ mode: 'touch', label: 'Tap', action: 'to play' }],
    learningPreview: { heading: 'Words' },
  }),
} as unknown as Cartridge;

const hostCatalog = { host: { back: 'Back', briefing: { eyebrow: 'Get ready', objective: 'Goal', start: 'Start' } } };

const apkInput = [{ term: 'apple', translation: 'แอปเปิล' }, { term: 'river', translation: 'แม่น้ำ' }];

function setup(options: Partial<Parameters<typeof startStoryGame>[0]> = {}) {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }) });
  const container = document.createElement('div');
  document.body.append(container);
  const onExit = vi.fn();
  const session = startStoryGame({ container, cartridge, input, assetBase: '/', catalogs: [hostCatalog], onComplete: vi.fn(), onExit, ...options });
  return { container, onExit, session };
}

describe('previewItems and inputIdOf', () => {
  const manifest = cartridge.manifest;

  it('previews the terms of an APK input, and names the input by the manifest mode', () => {
    expect(previewItems(apkInput, manifest)).toEqual(['apple', 'river']);
    expect(inputIdOf(apkInput, { inputMode: 'vocabulary' })).toBe('vocabulary');
  });

  it('previews a practice input by its own id and items', () => {
    expect(previewItems(input, manifest).length).toBeGreaterThan(0);
    expect(inputIdOf(input, manifest)).toBe(input.id);
  });
});

describe('sessionOptionsOf', () => {
  const avatar = { catalogVersion: '1.0.0', classId: 'knight', tints: { skin: 'fair', hair: 'brown', eyes: 'blue', cloth: 'sky' }, pieces: [] } as unknown as NonNullable<Parameters<typeof sessionOptionsOf>[0]['avatar']>;

  it('carries the avatar to the game, with the defaults for the rest', () => {
    expect(sessionOptionsOf({ avatar })).toEqual({ helper: false, hero: 'knight', looks: {}, avatar });
  });

  it('leaves the avatar out when the student has none, so the game keeps the hero', () => {
    expect(sessionOptionsOf({ hero: 'wizard', helper: true, looks: { wizard: 'dusk' }, avatar: null })).toEqual({ helper: true, hero: 'wizard', looks: { wizard: 'dusk' } });
    expect(sessionOptionsOf({})).not.toHaveProperty('avatar');
  });
});

describe('startStoryGame', () => {
  it('shows the briefing with the game goal and a preview of the input items', async () => {
    const { container, session } = setup();
    expect(container.classList.contains('apk3d-story-host')).toBe(true);
    expect(container.querySelector('.briefing h2')?.textContent).toContain('Demo game');
    expect(container.querySelector('.goal')?.textContent).toContain('Play the demo.');
    expect(container.querySelectorAll('.briefing .chips .chip').length).toBeGreaterThan(0);
    await session.destroy();
  });

  it('briefs a class challenge run on its APK input and reports the briefing phase', async () => {
    const onPhase = vi.fn();
    const { container, session } = setup({ input: apkInput, seed: 7, replay: false, onPhase });
    const chips = [...container.querySelectorAll('.briefing .chips .chip')].map((c) => c.textContent);
    expect(chips).toEqual(['apple', 'river']);
    expect(onPhase).toHaveBeenCalledWith('briefing');
    await session.destroy();
  });

  it('calls onExit from Back and clears the page on destroy', async () => {
    const { container, onExit, session } = setup();
    (container.querySelector('[data-back]') as HTMLElement).click();
    expect(onExit).toHaveBeenCalledTimes(1);
    await session.destroy();
    expect(container.innerHTML).toBe('');
    expect(container.classList.contains('apk3d-story-host')).toBe(false);
  });
});
