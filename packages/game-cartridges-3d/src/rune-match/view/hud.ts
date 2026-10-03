/**
 * The Rune Match overlay on the kit HUD: the status bar (place, courage, shield, story, sound),
 * each monster's HP pips, banners, popups, and the card that holds the word and the board. Every
 * text comes from the game's catalog scope. Nothing here is timed.
 */
import type { ScopedI18n } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { AudioBus } from '@reading-advantage/advantage-play-kit-3d/audio';
import type { HostServices } from '@reading-advantage/advantage-play-kit-3d/factory';
import { Board, esc, pips, type HudRoot, type PopKind } from '@reading-advantage/advantage-play-kit-3d/hud';
import type { BattleStage } from '../../shared/battle/stage3d.js';
import type { MonsterShown } from './driver.js';
import rune_matchCss from './rune-match.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('rune-match', rune_matchCss);

export class RuneHud {
  private readonly status: HTMLElement;
  private hp: HTMLElement | null = null;
  private findEl!: HTMLElement;
  readonly t: ScopedI18n['t'];

  constructor(
    private readonly root: HudRoot,
    private readonly stage: BattleStage,
    private readonly i18n: ScopedI18n,
    audio: AudioBus,
    host: HostServices,
  ) {
    this.t = i18n.scope('hud').t;
    const t = this.t;
    this.status = document.createElement('div');
    this.status.className = 'status';
    this.status.innerHTML = `
      <div class="place"><small>${esc(t('place'))}</small><span data-place></span></div>
      <div class="meter">${esc(t('courage'))}<b data-courage></b><span class="shield" data-shield></span></div>
      ${host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
      ${host.toggleMute ? `<button class="book" data-mute aria-label="${esc(t('story'))}">🔊</button>` : ''}`;
    root.el.prepend(this.status);
    this.status.querySelector('[data-story]')?.addEventListener('click', () => host.openStory?.());
    const mute = this.status.querySelector<HTMLButtonElement>('[data-mute]');
    mute?.addEventListener('click', () => (mute.textContent = host.toggleMute?.() ? '🔇' : '🔊'));
    void audio;
  }

  /** Builds the card (the word, then the board) and returns the board. */
  mountBoard(rows: number, cols: number, onSwap: ConstructorParameters<typeof Board>[3], tap: () => void): Board {
    const card = this.root.card;
    card.show(`<div class="rune-find"><small>${esc(this.t('find'))}</small><b data-find></b></div>`);
    this.findEl = card.el.querySelector<HTMLElement>('[data-find]')!;
    const board = new Board(card.el, rows, cols, onSwap, tap);
    board.el.style.setProperty('--rows', String(rows));
    board.el.style.setProperty('--cols', String(cols));
    return board;
  }

  showTarget(term: string): void {
    this.findEl.textContent = term;
  }

  setPlace(index: number, count: number, name: string): void {
    this.status.querySelector('[data-place]')!.textContent = this.t('progress', { index, count, name });
  }

  setCourage(value: number, max: number): void {
    this.status.querySelector('[data-courage]')!.textContent = '❤'.repeat(value) + '♡'.repeat(Math.max(0, max - value));
  }

  setShield(on: boolean): void {
    this.status.querySelector('[data-shield]')!.textContent = on ? this.t('shield') : '';
  }

  label(key: 'intro' | 'blocked' | 'courageLost' | 'courageGained'): string {
    return this.t(key);
  }

  monsterName(kind: string): string {
    return this.i18n.t(`monsters.${kind}`);
  }

  setMonster(m: MonsterShown | null): void {
    if (this.hp) this.root.unanchor(this.hp);
    this.hp = null;
    if (!m) return;
    const el = document.createElement('div');
    el.className = 'hp';
    this.hp = el;
    this.root.anchor(el, () => this.stage.screenOf(m.id, 1.25));
    pips(el, m.hp, m.maxHp);
  }

  updateMonster(m: MonsterShown): void {
    if (!this.hp) return;
    pips(this.hp, m.hp, m.maxHp);
    this.hp.style.display = m.defeated ? 'none' : '';
  }

  banner(key: 'rest' | 'victory' | null, title: string, text: string, seconds = 2.2): Promise<void> {
    return this.root.banner.show(key ? this.t(`${key}.title`) : title, key ? this.t(`${key}.text`) : text, seconds);
  }

  popup(actorId: string, text: string, kind: PopKind = '', lift = 1.4): void {
    this.root.popup(this.stage.screenOf(actorId, lift), text, kind);
  }

  /** A popup over the middle of the board. */
  popupOver(el: HTMLElement, text: string, kind: PopKind = 'good'): void {
    const r = el.getBoundingClientRect();
    const o = this.root.el.getBoundingClientRect();
    this.root.popup({ x: r.left - o.left + r.width / 2, y: r.top - o.top + r.height / 2, visible: true }, text, kind);
  }

  dispose(): void {
    if (this.hp) this.root.unanchor(this.hp);
    this.status.remove();
    this.root.card.hide();
  }
}
