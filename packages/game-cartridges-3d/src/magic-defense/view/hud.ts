/**
 * The Magic Defense overlay on the kit HUD: the status bar (wave, courage, story, sound), the
 * missile label over the casting enemy, banners, popups, and the card that holds the meaning to find.
 * Every text comes from the game's catalog scope. Nothing here is timed.
 */
import type { ScopedI18n } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { AudioBus } from '@reading-advantage/advantage-play-kit-3d/audio';
import type { HostServices } from '@reading-advantage/advantage-play-kit-3d/factory';
import { esc, feedback, hasThai, type HudRoot, type PopKind } from '@reading-advantage/advantage-play-kit-3d/hud';
import type { BattleStage } from '../../shared/battle/stage3d.js';
import type { Round } from '../core/index.js';
import magic_defenseCss from './magic-defense.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('magic-defense', magic_defenseCss);

export class MagicHud {
  private readonly status: HTMLElement;
  private readonly tags = new Map<string, HTMLElement>();
  readonly t: ScopedI18n['t'];
  /** Called when the student taps the storm button. */
  onStorm: (() => void) | null = null;

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
    this.status.className = 'status md-status';
    this.status.innerHTML = `
      <div class="place"><small>${esc(t('place'))}</small><span data-place></span></div>
      <div class="meter md-castles">${esc(t('castles'))}<b data-castles></b></div>
      <button class="book md-storm" data-storm disabled><span data-mana></span> <span class="md-storm-name">${esc(t('stormButton'))}</span></button>
      ${host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
      ${host.toggleMute ? `<button class="book" data-mute aria-label="${esc(t('story'))}">🔊</button>` : ''}`;
    root.el.prepend(this.status);
    this.status.querySelector('[data-storm]')?.addEventListener('click', () => this.onStorm?.());
    this.status.querySelector('[data-story]')?.addEventListener('click', () => host.openStory?.());
    const mute = this.status.querySelector<HTMLButtonElement>('[data-mute]');
    mute?.addEventListener('click', () => (mute.textContent = host.toggleMute?.() ? '🔇' : '🔊'));
  }

  private readonly tap = (): void => this.audio.play('tap');

  label(key: 'intro' | 'castleHit' | 'blocked'): string {
    return this.t(key);
  }

  monsterName(kind: string): string {
    return this.i18n.t(`monsters.${kind}`);
  }

  setProgress(wave: number, count: number, done: number, size: number): void {
    this.status.querySelector('[data-place]')!.textContent = this.t('progress', { wave, count, done, size });
  }

  /** The hearts of each castle; a castle in ruins shows no heart. */
  setCastles(castles: readonly number[], max: number): void {
    // One group of hearts for each castle (a gap between the groups, no brackets: it fits a phone).
    this.status.querySelector('[data-castles]')!.innerHTML = castles.map((h) => `<i>${'❤'.repeat(h)}${'♡'.repeat(Math.max(0, max - h))}</i>`).join('');
  }

  /** The storm button shows the mana and wakes when the mana is full. */
  setMana(value: number, max: number): void {
    this.status.querySelector('[data-mana]')!.textContent = `${value}/${max}`;
    const b = this.status.querySelector<HTMLButtonElement>('[data-storm]')!;
    b.disabled = value < max;
    b.classList.toggle('ready', value >= max);
  }

  // ---------------------------------------------------------------- the missile over the caster

  /** Puts the meaning of the missile over the enemy that cast it. */
  setMissile(round: Round): void {
    this.clearMissile();
    const el = document.createElement('div');
    el.className = `md-tag ${hasThai(round.prompt) ? 'th' : ''}`;
    el.innerHTML = `<small>${esc(this.t('missile'))}</small><b class="${hasThai(round.prompt) ? 'th' : ''}">${esc(round.prompt)}</b>`;
    this.tags.set(round.enemyId, el);
    this.root.anchor(el, () => this.stage.screenOf(round.enemyId, 1.3), { spread: true });
  }

  clearMissile(): void {
    for (const el of this.tags.values()) this.root.unanchor(el);
    this.tags.clear();
  }

  // ---------------------------------------------------------------- the card

  /** The meaning to find, and one button per spell word. */
  showRound(round: Round, cast: (choice: number) => void): void {
    const t = this.t;
    this.setMissile(round);
    const thai = hasThai(round.prompt);
    const buttons = round.choices
      .map((c) => `<button class="opt md-spell" data-choice="${c.index}" ${c.blocked ? 'disabled' : ''}>${esc(c.term)}</button>`)
      .join('');
    const card = this.root.card;
    card.show(`<div class="ask">${esc(t('castThe'))}</div><div class="prompt ${thai ? 'th' : ''}">${esc(round.prompt)}</div><div class="options md-spells">${buttons}</div>`);
    card.el.onclick = (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-choice]');
      if (!b || b.disabled) return;
      card.el.onclick = null;
      b.classList.add('picked');
      this.tap();
      cast(Number(b.dataset.choice));
    };
  }

  hideCard(): void {
    this.root.card.hide();
  }

  /** Marks the chosen spell on the card and on the missile label, then holds a short beat. */
  async markCast(choice: number, correct: boolean): Promise<void> {
    const card = this.root.card;
    card.el.querySelector<HTMLElement>(`[data-choice="${choice}"]`)?.classList.add(correct ? 'right' : 'wrong');
    for (const el of this.tags.values()) el.classList.add(correct ? 'right' : 'failed');
    if (correct) await feedback(card, true, `<b>${esc(this.t('right'))}</b>`);
    else await feedback(card, false, esc(this.t('blocked')));
    await this.stage.kit.timeline.wait(correct ? 0.5 : 0.8);
  }

  // ---------------------------------------------------------------- messages

  banner(key: 'rest' | 'victory' | 'storm' | null, title: string, text: string, seconds = 2.2): Promise<void> {
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
    this.clearMissile();
    this.status.remove();
    this.root.card.hide();
  }
}
