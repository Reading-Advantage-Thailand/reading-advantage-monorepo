/**
 * The Castle Defense overlay on the kit HUD: the status bar (wave, castle hearts, story, sound),
 * the hit pips over the attackers, banners, popups, and the card that holds the meaning, the
 * sentence built so far, and the words (or the posts for the tower). Every text comes from the
 * game's catalog scope. Nothing here is timed.
 */
import type { ScopedI18n } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { AudioBus } from '@reading-advantage/advantage-play-kit-3d/audio';
import type { HostServices } from '@reading-advantage/advantage-play-kit-3d/factory';
import { esc, feedback, hasThai, type HudRoot, type PopKind } from '@reading-advantage/advantage-play-kit-3d/hud';
import type { BattleStage } from '../../shared/battle/stage3d.js';
import type { Post } from '../core/index.js';
import type { StepShown } from './driver.js';
import castle_defenseCss from './castle-defense.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('castle-defense', castle_defenseCss);

export class CastleHud {
  private readonly status: HTMLElement;
  private readonly pips = new Map<string, HTMLElement>();
  readonly t: ScopedI18n['t'];

  constructor(
    private readonly root: HudRoot,
    private readonly stage: BattleStage,
    private readonly i18n: ScopedI18n,
    private readonly audio: AudioBus,
    host: HostServices,
  ) {
    this.t = i18n.scope('hud').t;
    const t = this.t;
    this.status = document.createElement('div');
    this.status.className = 'status';
    this.status.innerHTML = `
      <div class="place"><small>${esc(t('place'))}</small><span data-place></span></div>
      <div class="meter">${esc(t('hearts'))}<b data-hearts></b></div>
      ${host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
      ${host.toggleMute ? `<button class="book" data-mute aria-label="${esc(t('story'))}">🔊</button>` : ''}`;
    root.el.prepend(this.status);
    this.status.querySelector('[data-story]')?.addEventListener('click', () => host.openStory?.());
    const mute = this.status.querySelector<HTMLButtonElement>('[data-mute]');
    mute?.addEventListener('click', () => (mute.textContent = host.toggleMute?.() ? '🔇' : '🔊'));
  }

  private readonly tap = (): void => this.audio.play('tap');

  label(key: 'intro' | 'castleHit' | 'blocked' | 'towerBuilt'): string {
    return this.t(key);
  }

  setProgress(wave: number, count: number, done: number, size: number): void {
    this.status.querySelector('[data-place]')!.textContent = this.t('progress', { wave, count, done, size });
  }

  setHearts(hearts: number, max: number): void {
    this.status.querySelector('[data-hearts]')!.textContent = `${'❤'.repeat(hearts)}${'♡'.repeat(Math.max(0, max - hearts))}`;
  }

  // ---------------------------------------------------------------- hit pips over the attackers

  private pipsText(hits: number, max: number): string {
    return `${'●'.repeat(Math.max(0, hits))}${'○'.repeat(Math.max(0, max - hits))}`;
  }

  /** Puts the hit pips over each attacker of the wave. */
  setAttackers(list: readonly { id: string; hits: number; maxHits: number }[]): void {
    this.clearPips();
    for (const a of list) {
      const el = document.createElement('div');
      el.className = 'cd-pips';
      el.textContent = this.pipsText(a.hits, a.maxHits);
      this.pips.set(a.id, el);
      this.root.anchor(el, () => this.stage.screenOf(a.id, 1.5));
    }
  }

  setHits(id: string, hits: number, max: number): void {
    const el = this.pips.get(id);
    if (!el) return;
    el.textContent = this.pipsText(hits, max);
    el.classList.toggle('gone', hits <= 0);
  }

  clearPips(): void {
    for (const el of this.pips.values()) this.root.unanchor(el);
    this.pips.clear();
  }

  // ---------------------------------------------------------------- the card

  /** The meaning, the sentence so far, and one button per word. */
  showStep(shown: StepShown, pick: (choice: number) => void): void {
    const t = this.t;
    const line = [...shown.built, ...Array.from({ length: shown.total - shown.built.length }, () => t('blank'))].join(' ');
    const meaning = shown.translation ? `<div class="prompt ${hasThai(shown.translation) ? 'th' : ''}">${esc(shown.translation)}</div>` : '';
    const buttons = shown.step.choices
      .map((c) => `<button class="opt cd-word" data-choice="${c.index}" ${c.blocked ? 'disabled' : ''}>${esc(c.word)}</button>`)
      .join('');
    const card = this.root.card;
    card.show(`<div class="ask">${esc(t('buildThe'))}</div>${meaning}<div class="cd-sentence">${esc(line)}</div><div class="options cd-words">${buttons}</div>`);
    card.el.onclick = (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-choice]');
      if (!b || b.disabled) return;
      card.el.onclick = null;
      b.classList.add('picked');
      this.tap();
      pick(Number(b.dataset.choice));
    };
  }

  /** The posts of the wall: one button per hero, with the level of its tower. */
  showPosts(posts: readonly Post[], build: (post: number) => void): void {
    const t = this.t;
    const buttons = posts
      .map((p) => `<button class="opt cd-post" data-post="${p.post}">${esc(t('post', { hero: this.i18n.t(`heroes.${p.hero}`) }))}<small>${esc(p.level > 0 ? t('level', { level: p.level }) : t('empty'))}</small></button>`)
      .join('');
    const card = this.root.card;
    card.show(`<div class="ask">${esc(t('placeThe'))}</div><div class="options cd-posts">${buttons}</div>`);
    card.el.onclick = (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-post]');
      if (!b) return;
      card.el.onclick = null;
      b.classList.add('picked');
      this.tap();
      build(Number(b.dataset.post));
    };
  }

  hideCard(): void {
    this.root.card.hide();
  }

  /** Marks the chosen word on the card, then holds a short beat. */
  async markPick(choice: number, correct: boolean): Promise<void> {
    const card = this.root.card;
    card.el.querySelector<HTMLElement>(`[data-choice="${choice}"]`)?.classList.add(correct ? 'right' : 'wrong');
    if (correct) await feedback(card, true, `<b>${esc(this.t('right'))}</b>`);
    else await feedback(card, false, esc(this.t('blocked')));
    await this.stage.kit.timeline.wait(correct ? 0.4 : 0.8);
  }

  // ---------------------------------------------------------------- messages

  banner(key: 'rest' | 'victory' | null, title: string, text: string, seconds = 2.2): Promise<void> {
    return this.root.banner.show(key ? this.t(`${key}.title`) : title, key ? this.t(`${key}.text`) : text, seconds);
  }

  popup(actorId: string, text: string, kind: PopKind = '', lift = 1.4): void {
    this.root.popup(this.stage.screenOf(actorId, lift), text, kind);
  }

  /** A popup over the middle of the card. */
  popupOver(text: string, kind: PopKind = 'good'): void {
    const r = this.root.card.el.getBoundingClientRect();
    const o = this.root.el.getBoundingClientRect();
    this.root.popup({ x: r.left - o.left + r.width / 2, y: r.top - o.top + r.height / 2, visible: true }, text, kind);
  }

  dispose(): void {
    this.clearPips();
    this.status.remove();
    this.root.card.hide();
  }
}
