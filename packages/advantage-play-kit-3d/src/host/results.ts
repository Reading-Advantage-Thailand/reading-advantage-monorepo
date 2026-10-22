/**
 * The results of a run, from the game's `GameResults` and evidence (never from game internals):
 * stars from first-try accuracy, the awarded XP, the student's answers, and the items to practice.
 */
import { firstTryAccuracy, starsOf, type GameResults, type StoryGameEvidence, type Translate } from '../contracts/index.js';
import { esc } from '../hud/index.js';

export interface Run {
  game: string;
  /** The input id ("saved", or a story id). */
  input: string;
  result: GameResults;
  evidence: StoryGameEvidence;
}

/**
 * Shows the results card of a run.
 * @param el The screen element.
 * @param run The run: its game, input, result, and evidence.
 * @param t The host catalog.
 * @param awarded The XP that the server awarded, when the app saves the run. The card shows the
 *   saving text until it settles, then that number, or the not-saved text when the save fails or
 *   gives no number. Absent (the app saves nothing): the card shows no XP.
 *   The card never shows `run.result.xp`, the game's own number (it differed from the server).
 */
export function renderResults(el: HTMLElement, run: Run, t: Translate, awarded?: Promise<number | undefined>): void {
  const stars = starsOf(run.evidence);
  const pct = Math.round(firstTryAccuracy(run.evidence.items) * 100);
  const answers = run.evidence.items.map((i) => `<span class="chip ${i.correctFirstTry ? 'ok' : ''}">${esc(i.label)}</span>`).join('');
  const practice = run.evidence.practice.map((p) => `<span class="chip">${esc(p)}</span>`).join('');
  el.innerHTML = `
    <div class="panel">
      <h2>${esc(t('host.results.title'))}</h2>
      <div class="stars" aria-label="${stars} / 3">${[1, 2, 3].map((n) => `<span class="${n <= stars ? 'lit' : ''}">★</span>`).join('')}</div>
      <div class="xp"><span data-xp>${awarded ? esc(t('host.results.xpSaving')) : ''}</span><small>${esc(t('host.results.xpNote', { pct }))}</small></div>
      ${answers ? `<h3>${esc(t('host.results.storyWords'))}</h3><div class="chips">${answers}</div>` : ''}
      ${practice ? `<h3>${esc(t('host.results.practice'))}</h3><div class="chips">${practice}</div>` : ''}
      <div class="actions">
        <button class="btn soft" data-again>${esc(t('host.results.again'))}</button>
        <button class="btn gold" data-done>${esc(t('host.results.done'))}</button>
      </div>
    </div>`;
  // The node of this card: a later card ("again") is not changed by a late answer.
  const xpEl = el.querySelector('[data-xp]');
  const showXp = (xp: number | undefined) => {
    if (xpEl) xpEl.textContent = t(typeof xp === 'number' ? 'host.results.xp' : 'host.results.xpNotSaved', { xp: xp ?? 0 });
  };
  awarded?.then(showXp, () => showXp(undefined));
}
