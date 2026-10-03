// @vitest-environment jsdom
/** The story game host: the briefing screen, its buttons, and teardown (the game itself needs WebGL or Phaser). */
import { describe, expect, it, vi } from 'vitest';
import { startStoryGame } from '../host/story-game.js';
import type { Cartridge } from '../factory/index.js';
import type { StoryInput } from '../contracts/index.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const story = JSON.parse(readFileSync(join(process.cwd(), 'tests', 'fixtures', 'stories', 'pips-happy-night', 'story.json'), 'utf8')) as StoryInput;

const cartridge = {
  manifest: {
    id: 'demo-game',
    briefingKey: 'demo.briefing',
    inputMode: 'story',
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

function setup() {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }) });
  const container = document.createElement('div');
  document.body.append(container);
  const onExit = vi.fn();
  const session = startStoryGame({ container, cartridge, story, assetBase: '/', catalogs: [hostCatalog], onComplete: vi.fn(), onExit });
  return { container, onExit, session };
}

describe('startStoryGame', () => {
  it('shows the briefing with the game goal and a story preview', async () => {
    const { container, session } = setup();
    expect(container.classList.contains('apk3d-story-host')).toBe(true);
    expect(container.querySelector('.briefing h2')?.textContent).toContain('Demo game');
    expect(container.querySelector('.goal')?.textContent).toContain('Play the demo.');
    expect(container.querySelectorAll('.briefing .chips .chip').length).toBeGreaterThan(0);
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
