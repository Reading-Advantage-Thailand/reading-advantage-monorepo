/**
 * The Archer's Revenge overlay on the kit HUD: the status bar (wave, courage, story, sound), the
 * word shield over each enemy, banners, popups, and the card that holds the meaning to find.
 * Every text comes from the game's catalog scope. Nothing here is timed.
 */
import type { ScopedI18n } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { AudioBus } from '@reading-advantage/advantage-play-kit-3d/audio';
import type { HostServices } from '@reading-advantage/advantage-play-kit-3d/factory';
import { esc, feedback, hasThai, type HudRoot, type PopKind } from '@reading-advantage/advantage-play-kit-3d/hud';
import type { BattleStage } from '../../shared/battle/stage3d.js';
import type { Round } from '../core/index.js';
import archers_revengeCss from './archers-revenge.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('archers-revenge', archers_revengeCss);

export class ArchersHud {
  private readonly status: HTMLElement;
  private readonly tags = new Map<string, HTMLElement>();
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
      <div class="meter">${esc(t('courage'))}<b data-courage></b></div>
      ${host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
      ${host.toggleMute ? `<button class="book" data-mute aria-label="${esc(t('story'))}">🔊</button>` : ''}`;
    root.el.prepend(this.status);
    this.status.querySelector('[data-story]')?.addEventListener('click', () => host.openStory?.());
    const mute = this.status.querySelector<HTMLButtonElement>('[data-mute]');
    mute?.addEventListener('click', () => (mute.textContent = host.toggleMute?.() ? '🔇' : '🔊'));
  }

  private readonly tap = (): void => this.audio.play('tap');

  label(key: 'intro' | 'courageLost' | 'blocked'): string {
    return this.t(key);
  }

  monsterName(kind: string): string {
    return this.i18n.t(`monsters.${kind}`);
  }

  setProgress(wave: number, count: number, done: number, size: number): void {
    this.status.querySelector('[data-place]')!.textContent = this.t('progress', { wave, count, done, size });
  }

  setCourage(value: number, max: number): void {
    this.status.querySelector('[data-courage]')!.textContent = '❤'.repeat(value) + '♡'.repeat(Math.max(0, max - value));
  }

  // ---------------------------------------------------------------- the shields over the enemies

  /** Puts a word shield over an enemy of the stage. */
  private tagOf(enemyId: string): HTMLElement {
    let el = this.tags.get(enemyId);
    if (!el) {
      el = document.createElement('div');
      el.className = 'ar-tag';
      this.tags.set(enemyId, el);
      this.root.anchor(el, () => this.stage.screenOf(enemyId, 1.3), { spread: true });
    }
    return el;
  }

  /** Shows the word of each lane on its enemy; a shot lane shows a darker shield. */
  setShields(round: Round): void {
    for (const lane of round.lanes) {
      const el = this.tagOf(lane.enemyId);
      el.className = `ar-tag ${lane.blocked ? 'blocked' : ''}`;
      el.innerHTML = `<b>${esc(lane.term)}</b>`;
    }
  }

  clearShields(): void {
    for (const el of this.tags.values()) this.root.unanchor(el);
    this.tags.clear();
  }

  // ---------------------------------------------------------------- the card

  /** The meaning to find, and one button per lane (the same word as on the enemy). */
  showRound(round: Round, fire: (lane: number) => void): void {
    const t = this.t;
    this.setShields(round);
    const thai = hasThai(round.prompt);
    const buttons = round.lanes
      .map((l) => `<button class="opt ar-lane" data-lane="${l.lane}" ${l.blocked ? 'disabled' : ''}>${esc(l.term)}</button>`)
      .join('');
    const card = this.root.card;
    card.show(`<div class="ask">${esc(t('shootThe'))}</div><div class="prompt ${thai ? 'th' : ''}">${esc(round.prompt)}</div><div class="options ar-lanes">${buttons}</div>`);
    card.el.onclick = (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-lane]');
      if (!b || b.disabled) return;
      card.el.onclick = null;
      b.classList.add('picked');
      this.tap();
      fire(Number(b.dataset.lane));
    };
  }

  hideCard(): void {
    this.root.card.hide();
  }

  /** Marks the shot lane on the card and on its enemy, then holds a short beat. */
  async markShot(lane: number, enemyId: string, correct: boolean): Promise<void> {
    const card = this.root.card;
    card.el.querySelector<HTMLElement>(`[data-lane="${lane}"]`)?.classList.add(correct ? 'right' : 'wrong');
    this.tags.get(enemyId)?.classList.add(correct ? 'right' : 'blocked');
    if (correct) await feedback(card, true, `<b>${esc(this.t('right'))}</b>`);
    else await feedback(card, false, esc(this.t('blocked')));
    await this.stage.kit.timeline.wait(correct ? 0.5 : 0.8);
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
    this.clearShields();
    this.status.remove();
    this.root.card.hide();
  }
}
