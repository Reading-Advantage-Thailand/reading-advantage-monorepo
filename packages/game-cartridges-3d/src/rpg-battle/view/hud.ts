/**
 * The RPG Battle overlay on the kit HUD: the status bar (place, courage, story, sound), each
 * monster's HP pips, banners, popups, and the card that holds the hand and the question. Every
 * text comes from the game's catalog scope. Nothing here is timed.
 */
import type { ScopedI18n } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { AudioBus } from '@reading-advantage/advantage-play-kit-3d/audio';
import type { HostServices } from '@reading-advantage/advantage-play-kit-3d/factory';
import { esc, feedback, hasThai, markChoice, pips, type HudRoot, type PopKind } from '@reading-advantage/advantage-play-kit-3d/hud';
import type { BattleStage } from '../../shared/battle/stage3d.js';
import type { ActionKind, Card, HeroId, Question } from '../core/index.js';
import { HERO_OF } from '../core/index.js';
import type { MonsterShown } from './driver.js';
import rpg_battleCss from './rpg-battle.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('rpg-battle', rpg_battleCss);

export const ACTION_LOOK: Record<ActionKind, { color: string; emoji: string }> = {
  slash: { color: '#d9463b', emoji: '⚔️' },
  blaze: { color: '#6a3fd1', emoji: '🔥' },
  mend: { color: '#2f7fd8', emoji: '✨' },
};

export class RpgHud {
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
      <div class="meter">${esc(t('courage'))}<b data-courage></b></div>
      ${host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
      ${host.toggleMute ? `<button class="book" data-mute aria-label="${esc(t('story'))}">🔊</button>` : ''}`;
    root.el.prepend(this.status);
    this.status.querySelector('[data-story]')?.addEventListener('click', () => host.openStory?.());
    const mute = this.status.querySelector<HTMLButtonElement>('[data-mute]');
    mute?.addEventListener('click', () => (mute.textContent = host.toggleMute?.() ? '🔇' : '🔊'));
  }

  private readonly tap = (): void => this.audio.play('tap');

  label(key: 'intro' | 'courageLost' | 'courageGained', params: Record<string, string | number> = {}): string {
    return this.t(key, params);
  }

  monsterName(kind: string): string {
    return this.i18n.t(`monsters.${kind}`);
  }

  setPlace(index: number, count: number, name: string): void {
    this.status.querySelector('[data-place]')!.textContent = this.t('progress', { index, count, name });
  }

  setCourage(value: number, max: number): void {
    this.status.querySelector('[data-courage]')!.textContent = '❤'.repeat(value) + '♡'.repeat(Math.max(0, max - value));
  }

  // ---------------------------------------------------------------- the card

  showHand(cards: readonly Card[], pick: (cardId: string) => void): void {
    const t = this.t;
    const html = cards
      .map((c) => {
        const look = ACTION_LOOK[c.action];
        return `<button class="rpg-card ${c.power} ${c.retry ? 'retry' : ''}" data-card="${esc(c.id)}"><span class="ico">${look.emoji}</span><b>${esc(c.term)}</b><small>${esc(this.i18n.t(`actions.${c.action}`))} · ${esc(t(c.power === 'power' ? 'power' : 'basic'))}</small></button>`;
      })
      .join('');
    const card = this.root.card;
    card.show(`<div class="ask">${esc(t('pickCard'))}</div><div class="rpg-hand">${html}</div>`);
    card.el.onclick = (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-card]');
      if (!b) return;
      card.el.onclick = null;
      this.tap();
      pick(b.dataset.card!);
    };
  }

  showQuestion(q: Question, c: Card, answer: (optionId: string) => void, back: () => void): void {
    const t = this.t;
    const look = ACTION_LOOK[c.action];
    const hero = this.i18n.t(`heroes.${HERO_OF[c.action]}`);
    const who = `<div class="who"><span class="pill" style="background:${look.color}">${look.emoji} ${esc(this.i18n.t(`actions.${c.action}`))} · ${esc(hero)}</span><span>${esc(t(c.power === 'power' ? 'power' : 'basic'))}</span>${c.retry ? `<span>${esc(t('again'))}</span>` : ''}</div>`;
    const thai = q.options.some((o) => hasThai(o.text));
    const one = q.options.some((o) => o.text.length > 18);
    const options = q.options.map((o) => `<button class="opt ${thai ? 'th' : ''}" data-opt="${esc(o.id)}">${esc(o.text)}</button>`).join('');
    const card = this.root.card;
    card.show(`${who}<div class="prompt">${esc(q.term)}</div><div class="ask">${esc(t('whichMeaning'))}</div><div class="options ${one ? 'one' : ''}">${options}</div><div class="actions rpg-back"><button class="btn soft" data-back>${esc(t('back'))}</button></div>`);
    card.el.onclick = (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-back]')) {
        card.el.onclick = null;
        this.tap();
        back();
        return;
      }
      const b = target.closest<HTMLElement>('[data-opt]');
      if (!b) return;
      card.el.onclick = null;
      b.classList.add('picked');
      this.tap();
      answer(b.dataset.opt!);
    };
  }

  hideCard(): void {
    this.root.card.hide();
  }

  /** A right answer flashes green and moves on; a wrong one shows the right answer and waits for "Continue". */
  async feedback(q: Question, optionId: string, correct: boolean, correctText: string): Promise<void> {
    const t = this.t;
    const card = this.root.card;
    card.el.querySelector('.rpg-back')?.remove();
    markChoice(card, optionId, correct, correctText);
    if (correct) {
      await feedback(card, true, `<b>${esc(t('right'))}</b>`);
      await this.stage.kit.timeline.wait(0.75);
      return;
    }
    await feedback(card, false, t('wrong', { answer: esc(correctText) }), [{ id: 'go', label: t('continue') }]);
  }

  // ---------------------------------------------------------------- monster HP and messages

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

  /** A popup over the middle of the card. */
  popupOver(text: string, kind: PopKind = 'good'): void {
    const r = this.root.card.el.getBoundingClientRect();
    const o = this.root.el.getBoundingClientRect();
    this.root.popup({ x: r.left - o.left + r.width / 2, y: r.top - o.top + r.height / 2, visible: true }, text, kind);
  }

  dispose(): void {
    if (this.hp) this.root.unanchor(this.hp);
    this.status.remove();
    this.root.card.hide();
  }
}

export type { HeroId };
