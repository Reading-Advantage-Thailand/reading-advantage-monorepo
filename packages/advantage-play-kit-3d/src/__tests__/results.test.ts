// @vitest-environment jsdom
/** The results card shows the XP that the server awarded, never the game's own `result.xp`. */
import { describe, expect, it } from 'vitest';
import { renderResults, type Run } from '../host/results.js';
import type { GameResults, StoryGameEvidence, Translate } from '../contracts/index.js';

const t: Translate = (key, params) => (key === 'host.results.xp' ? `+${params?.xp} XP` : key === 'host.results.xpSaving' ? 'Saving your XP…' : key === 'host.results.xpNotSaved' ? 'XP not saved.' : key);
const run: Run = {
  game: 'demo-game',
  input: 'saved',
  result: { xp: 99 } as GameResults,
  evidence: { items: [{ label: 'dog', correctFirstTry: true }], practice: [] } as unknown as StoryGameEvidence,
};
const xpText = (el: HTMLElement) => el.querySelector('[data-xp]')?.textContent;

describe('renderResults XP', () => {
  it('shows the saving text, then the awarded XP (game xp 99, awarded 10)', async () => {
    const el = document.createElement('div');
    let answer!: (xp: number | undefined) => void;
    const awarded = new Promise<number | undefined>((resolve) => (answer = resolve));
    renderResults(el, run, t, awarded);
    expect(xpText(el)).toBe('Saving your XP…');
    answer(10);
    await awarded;
    expect(xpText(el)).toBe('+10 XP');
    expect(el.textContent).not.toContain('99');
  });

  it('shows no XP when the app does not save the run', () => {
    const el = document.createElement('div');
    renderResults(el, run, t);
    expect(xpText(el)).toBe('');
    expect(el.textContent).not.toContain('99');
  });

  it('shows the not-saved text when the save fails or gives no number', async () => {
    for (const awarded of [Promise.reject(new Error('offline')), Promise.resolve(undefined)]) {
      const el = document.createElement('div');
      renderResults(el, run, t, awarded);
      await awarded.catch(() => undefined);
      await Promise.resolve();
      expect(xpText(el)).toBe('XP not saved.');
      expect(el.textContent).not.toContain('99');
    }
  });

  it('leaves a later card alone when an old save answers late', async () => {
    const el = document.createElement('div');
    let answer!: (xp: number | undefined) => void;
    const first = new Promise<number | undefined>((resolve) => (answer = resolve));
    renderResults(el, run, t, first);
    renderResults(el, run, t, Promise.resolve(4));
    await Promise.resolve();
    answer(10);
    await first;
    expect(xpText(el)).toBe('+4 XP');
  });
});
