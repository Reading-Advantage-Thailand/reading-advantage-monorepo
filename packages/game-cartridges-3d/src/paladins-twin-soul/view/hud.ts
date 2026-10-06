/**
 * The Paladin's Twin Soul overlay on the kit HUD: the status bar (place, courage, twin souls,
 * story, sound), each monster's HP pips, banners, popups, and the card that holds the meaning and
 * the shades. Every text comes from the game's catalog scope. Nothing here is timed.
 */
import type { ScopedI18n } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { AudioBus } from '@reading-advantage/advantage-play-kit-3d/audio';
import type { HostServices } from '@reading-advantage/advantage-play-kit-3d/factory';
import { choose, esc, pips, type HudRoot, type PopKind } from '@reading-advantage/advantage-play-kit-3d/hud';
import type { BattleStage } from '../../shared/battle/stage3d.js';
import type { MonsterShown, WaveShown } from './driver.js';
import paladins_twin_soulCss from './paladins-twin-soul.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('paladins-twin-soul', paladins_twin_soulCss);

export class TwinSoulHud {
  private readonly status: HTMLElement;
  private hp: HTMLElement | null = null;
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
      <div class="meter">${esc(t('courage'))}<b data-courage></b><span class="twins" data-twins></span></div>
      ${host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
      ${host.toggleMute ? `<button class="book" data-mute aria-label="${esc(t('story'))}">🔊</button>` : ''}`;
    root.el.prepend(this.status);
    this.status.querySelector('[data-story]')?.addEventListener('click', () => host.openStory?.());
    const mute = this.status.querySelector<HTMLButtonElement>('[data-mute]');
    mute?.addEventListener('click', () => (mute.textContent = host.toggleMute?.() ? '🔇' : '🔊'));
  }

  setPlace(index: number, count: number, name: string): void {
    this.status.querySelector('[data-place]')!.textContent = this.t('progress', { index, count, name });
  }

  setCourage(value: number, max: number): void {
    this.status.querySelector('[data-courage]')!.textContent = '❤'.repeat(value) + '♡'.repeat(Math.max(0, max - value));
  }

  setTwins(freed: number, count: number): void {
    this.status.querySelector('[data-twins]')!.textContent = `✦ ${this.t('twinCount', { freed, count })}`;
  }

  label(key: 'intro' | 'captured' | 'courageLost' | 'shadeFell' | 'freed' | 'freedFirst'): string {
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

  // ---------------------------------------------------------------- the card

  /** Shows the meaning and the shades; resolves with the tapped shade's id. */
  ask(wave: WaveShown): Promise<string> {
    const card = this.root.card;
    const retry = wave.retry ? `<i>${esc(this.t('again'))}</i>` : '';
    card.show(`<div class="twin-find"><small>${esc(this.t('find'))}</small><b>${esc(wave.translation)}</b>${retry}</div>`);
    return choose(card, wave.shades.map((s) => ({ id: s.id, text: s.term })), () => this.audio.play('tap')).then((id) => id);
  }

  /** Marks a shade of the card (`wrong` for a fallen shade, `right` for the captor), then waits. */
  async mark(id: string, kind: 'wrong' | 'right', seconds: number): Promise<void> {
    const el = this.root.card.el.querySelector<HTMLElement>(`[data-opt="${CSS.escape(id)}"]`);
    el?.classList.add(kind, ...(kind === 'wrong' ? ['fallen'] : []));
    await this.stage.kit.timeline.wait(seconds);
  }

  hideCard(): void {
    this.root.card.hide();
  }

  dispose(): void {
    if (this.hp) this.root.unanchor(this.hp);
    this.status.remove();
    this.root.card.hide();
  }
}
