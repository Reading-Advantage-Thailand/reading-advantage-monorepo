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

export function renderResults(el: HTMLElement, run: Run, t: Translate): void {
  const stars = starsOf(run.evidence);
  const pct = Math.round(firstTryAccuracy(run.evidence.items) * 100);
  const answers = run.evidence.items.map((i) => `<span class="chip ${i.correctFirstTry ? 'ok' : ''}">${esc(i.label)}</span>`).join('');
  const practice = run.evidence.practice.map((p) => `<span class="chip">${esc(p)}</span>`).join('');
  el.innerHTML = `
    <div class="panel">
      <h2>${esc(t('host.results.title'))}</h2>
      <div class="stars" aria-label="${stars} / 3">${[1, 2, 3].map((n) => `<span class="${n <= stars ? 'lit' : ''}">★</span>`).join('')}</div>
      <div class="xp">${esc(t('host.results.xp', { xp: run.result.xp }))}<small>${esc(t('host.results.xpNote', { pct }))}</small></div>
      ${answers ? `<h3>${esc(t('host.results.storyWords'))}</h3><div class="chips">${answers}</div>` : ''}
      ${practice ? `<h3>${esc(t('host.results.practice'))}</h3><div class="chips">${practice}</div>` : ''}
      <div class="actions">
        <button class="btn soft" data-again>${esc(t('host.results.again'))}</button>
        <button class="btn gold" data-done>${esc(t('host.results.done'))}</button>
      </div>
    </div>`;
}
