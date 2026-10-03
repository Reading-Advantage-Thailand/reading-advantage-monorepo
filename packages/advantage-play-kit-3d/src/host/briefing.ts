/**
 * The start screen of a game, drawn from the game's `GameBriefing` (the APK briefing contract,
 * like the advantage-games start screen): the goal, the steps, the controls, a tip, and a preview
 * of the story items the game will use.
 */
import type { Cartridge3DManifest, GameBriefing, StoryInput, Translate } from '../contracts/index.js';
import { esc } from '../hud/index.js';

const CONTROL_ICON: Record<string, string> = { touch: '👆', pointer: '🖱️', keyboard: '⌨️' };

/** Up to 8 story items for the preview: the kind the game uses most (sentences or words). */
function preview(story: StoryInput, manifest: Cartridge3DManifest): string[] {
  const sentenceGame = manifest.inputMode === 'sentence' || manifest.needs.sentences > manifest.needs.vocabulary;
  const words = story.vocabulary.map((w) => w.term);
  const sentences = story.sentences.map((s) => s.text);
  return (sentenceGame ? [...sentences, ...words] : [...words, ...sentences]).slice(0, sentenceGame ? 5 : 8);
}

export function renderBriefing(el: HTMLElement, b: GameBriefing, story: StoryInput, manifest: Cartridge3DManifest, icon: string, t: Translate): void {
  const label = (key: keyof NonNullable<GameBriefing['labels']>, fallback: string): string => b.labels?.[key] ?? t(fallback);
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const controls = b.controls.filter((c) => (touch ? c.mode !== 'pointer' : c.mode !== 'touch'));
  el.innerHTML = `
    <div class="panel briefing">
      <div class="eyebrow">${esc(label('eyebrow', 'host.briefing.eyebrow'))}</div>
      <h2><span class="icon">${icon}</span> ${esc(b.title)}</h2>
      ${b.subtitle ? `<div class="subtitle">${esc(b.subtitle)}</div>` : ''}
      <div class="goal"><b>${esc(label('objectiveHeading', 'host.briefing.objective'))}</b> ${esc(b.objective)}</div>
      <ol class="steps">${b.instructions.map((s) => `<li><b>${esc(s.title)}</b><span>${esc(s.description)}</span></li>`).join('')}</ol>
      <div class="controls">${(controls.length ? controls : b.controls)
        .map((c) => `<span class="control">${CONTROL_ICON[c.mode] ?? ''} <b>${esc(c.label)}</b> ${esc(c.action)}</span>`)
        .join('')}</div>
      <h3>${esc(b.learningPreview.heading)}</h3>
      <div class="chips">${preview(story, manifest).map((p) => `<span class="chip">${esc(p)}</span>`).join('')}</div>
      ${b.tip ? `<div class="tip">💡 ${esc(b.tip)}</div>` : ''}
      <div class="actions">
        <button class="btn soft" data-back>${esc(t('host.back'))}</button>
        <button class="btn gold" data-start>${esc(label('startAction', 'host.briefing.start'))}</button>
      </div>
    </div>`;
}
