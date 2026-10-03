/**
 * The battle overlay of Monster Encounters on the kit HUD: the status bar (place, courage, story,
 * sound), each monster's HP, banners, popups, and the challenge card. Every text comes from the
 * game's catalog scope. Nothing here is timed: the student answers at their own pace.
 */
import type { ScopedI18n } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { AudioBus } from '@reading-advantage/advantage-play-kit-3d/audio';
import type { HostServices } from '@reading-advantage/advantage-play-kit-3d/factory';
import { arrange, choose, esc, feedback, markChoice, pips, type HudRoot, type PopKind } from '@reading-advantage/advantage-play-kit-3d/hud';
import type { Challenge, EncounterInfo, EnemyState, Feedback, HeroId, Response } from '../core/index.js';
import type { BattleStage } from '../../shared/battle/stage3d.js';

export const HERO_LOOK: Record<HeroId, { color: string; emoji: string }> = {
  knight: { color: '#d9463b', emoji: '🛡️' },
  wizard: { color: '#6a3fd1', emoji: '🔥' },
  cleric: { color: '#2f7fd8', emoji: '✨' },
};

export class BattleHud {
  private readonly status: HTMLElement;
  private readonly hpEls = new Map<string, HTMLElement>();
  private enemies: EnemyState[] = [];
  private readonly t: ScopedI18n['t'];
  private readonly tap = (): void => this.audio.play('tap');

  constructor(
    private readonly root: HudRoot,
    private readonly stage: BattleStage,
    private readonly i18n: ScopedI18n,
    private readonly audio: AudioBus,
    private readonly host: HostServices,
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

  heroName(hero: HeroId): string {
    return this.i18n.t(`heroes.${hero}`);
  }

  setEncounter(info: EncounterInfo): void {
    this.status.querySelector('[data-place]')!.textContent = this.t('progress', { index: info.index + 1, count: info.count, name: info.name });
  }

  setCourage(value: number, max: number): void {
    this.status.querySelector('[data-courage]')!.textContent = '❤'.repeat(value) + '♡'.repeat(Math.max(0, max - value));
  }

  // ---------------------------------------------------------------- monster HP

  setEnemies(enemies: EnemyState[]): void {
    for (const el of this.hpEls.values()) this.root.unanchor(el);
    this.hpEls.clear();
    this.enemies = enemies.map((e) => ({ ...e }));
    for (const e of this.enemies) {
      const el = document.createElement('div');
      el.className = 'hp';
      this.hpEls.set(e.id, el);
      this.root.anchor(el, () => this.stage.screenOf(e.id, e.kind === 'giant-bat' ? 1.0 : 1.25));
      this.drawHp(e);
    }
  }

  updateEnemy(id: string, hp: number, defeated = false): void {
    const e = this.enemies.find((x) => x.id === id);
    if (!e) return;
    e.hp = hp;
    e.defeated = defeated || hp <= 0;
    this.drawHp(e);
  }

  private drawHp(e: EnemyState): void {
    const el = this.hpEls.get(e.id);
    if (!el) return;
    pips(el, e.hp, e.maxHp);
    el.style.display = e.defeated ? 'none' : '';
  }

  // ---------------------------------------------------------------- messages

  banner(key: 'rest' | 'victory' | null, title: string, text: string, seconds = 2.2): Promise<void> {
    return this.root.banner.show(key ? this.t(`${key}.title`) : title, key ? this.t(`${key}.text`) : text, seconds);
  }

  popup(actorId: string, text: string, kind: PopKind = '', lift = 1.4): void {
    this.root.popup(this.stage.screenOf(actorId, lift), text, kind);
  }

  label(key: 'miss' | 'courageLost' | 'courageGained'): string {
    return this.t(key);
  }

  // ---------------------------------------------------------------- the challenge card

  hideCard(): void {
    this.root.card.hide();
  }

  /** Shows a challenge for a hero and resolves with the student's response. */
  async ask(hero: HeroId, c: Challenge): Promise<Response> {
    const t = this.t;
    const look = HERO_LOOK[hero];
    const who = `<div class="who"><span class="pill" style="background:${look.color}">${look.emoji} ${esc(t('turn', { name: this.heroName(hero) }))}</span>${c.retry ? `<span>${esc(t('again'))}</span>` : ''}</div>`;
    const ask = `<div class="ask">${esc(t(`ask.${c.kind}`))}</div>`;
    const card = this.root.card;
    if (c.kind === 'sentence') {
      card.show(`${who}${ask}`);
      const tokenIds = await arrange(card, c.tokens, { empty: t('tray.empty'), clear: t('tray.clear'), check: t('tray.check') }, this.tap);
      return { kind: 'order', tokenIds };
    }
    const long = c.prompt.length > 28;
    const prompt = `<div class="prompt ${long ? 'small' : ''}">${esc(c.prompt).replace('___', '<u>&nbsp;?&nbsp;&nbsp;</u>')}</div>`;
    const hint = 'hint' in c && c.hint ? `<div class="hint2">${esc(c.hint)}</div>` : '';
    card.show(`${who}${prompt}${hint}${ask}`);
    return { kind: 'choice', optionId: await choose(card, c.options, this.tap) };
  }

  /**
   * Shows how the answer went. A right answer flashes green and moves on; a wrong one shows the
   * right answer and a kind explanation, and waits for "Continue" (or a look back at the story).
   */
  async answer(f: Feedback, response: Response | null, challenge: Challenge | null): Promise<void> {
    const t = this.t;
    const card = this.root.card;
    if (challenge && challenge.kind !== 'sentence' && response?.kind === 'choice') markChoice(card, response.optionId, f.correct, f.correctText);
    if (f.correct) {
      this.audio.play('correct');
      await feedback(card, true, `<b>${esc(t('right'))}</b>`);
      await this.stage.kit.timeline.wait(0.75);
      this.hideCard();
      return;
    }
    this.audio.play('wrong');
    const canLook = f.paragraph !== undefined && this.host.openStory;
    const actions = [...(canLook ? [{ id: 'look', label: t('lookInStory'), soft: true }] : []), { id: 'go', label: t('continue') }];
    const html = `${t('wrong', { answer: esc(f.correctText) })}${f.explanation ? `<br>${esc(f.explanation)}` : ''}`;
    for (;;) {
      const action = await feedback(card, false, html, actions);
      if (action === 'go') break;
      this.host.openStory?.(f.paragraph);
      // The story opens over the battle; the same feedback waits for "Continue" afterwards.
      card.el.lastElementChild?.remove();
    }
    this.hideCard();
  }

  dispose(): void {
    for (const el of this.hpEls.values()) this.root.unanchor(el);
    this.status.remove();
    this.hideCard();
  }
}
