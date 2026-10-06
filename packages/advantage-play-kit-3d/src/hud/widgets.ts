/**
 * HUD widgets for reading games: a banner, the challenge card, answer choices, a word-order tray,
 * answer feedback, and pip meters. Widgets hold no UI text of their own: every label comes from
 * the caller (from the game's string catalog), so they are ready for localization.
 */
import type { Timeline } from '../stage/timeline.js';
import { esc, hasThai } from './dom.js';

/** A message across the top of the screen ("The Bone Hall", "Victory!"). */
export class Banner {
  private readonly el: HTMLElement;

  constructor(parent: HTMLElement, private readonly timeline: Timeline) {
    this.el = document.createElement('div');
    this.el.className = 'banner';
    this.el.setAttribute('role', 'status');
    this.el.innerHTML = '<h3></h3><p></p>';
    parent.append(this.el);
  }

  /** Shows the banner for `seconds`, then fades it out; resolves after the fade. */
  async show(title: string, text: string, seconds = 2.2): Promise<void> {
    this.el.querySelector('h3')!.textContent = title;
    this.el.querySelector('p')!.textContent = text;
    this.el.classList.add('on');
    await this.timeline.wait(seconds);
    this.el.classList.remove('on');
    await this.timeline.wait(0.35);
  }
}

/** The challenge card: the lower part of a portrait screen, the right side of a landscape one. */
export class Card {
  readonly el: HTMLElement;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'card';
    parent.append(this.el);
  }

  /** Shows the card with `html` (markup the caller has escaped). */
  show(html: string): void {
    this.el.onclick = null;
    this.el.innerHTML = html;
    this.el.scrollTop = 0;
    this.el.classList.add('on');
  }

  hide(): void {
    this.el.onclick = null;
    this.el.classList.remove('on');
  }

  get visible(): boolean {
    return this.el.classList.contains('on');
  }

  /** Appends markup and scrolls it into view. */
  append(html: string, className: string): HTMLElement {
    const box = document.createElement('div');
    box.className = className;
    box.innerHTML = html;
    this.el.append(box);
    box.scrollIntoView({ block: 'nearest' });
    return box;
  }
}

export interface ChoiceOption {
  id: string;
  text: string;
}

/**
 * Adds answer buttons to the card and resolves with the picked option id. Thai options get the
 * larger Thai size; long options get one column.
 */
export function choose(card: Card, options: readonly ChoiceOption[], tap: () => void = () => undefined): Promise<string> {
  const thai = options.some((o) => hasThai(o.text));
  const one = options.some((o) => o.text.length > 18);
  const grid = document.createElement('div');
  grid.className = `options ${one ? 'one' : ''}`;
  grid.innerHTML = options.map((o) => `<button class="opt ${thai ? 'th' : ''}" data-opt="${esc(o.id)}">${esc(o.text)}</button>`).join('');
  card.el.append(grid);
  return new Promise((resolve) => {
    card.el.onclick = (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-opt]');
      if (!b) return;
      card.el.onclick = null;
      b.classList.add('picked');
      tap();
      resolve(b.dataset.opt!);
    };
  });
}

/** Marks the picked option right or wrong; on a wrong pick it also marks the right answer. */
export function markChoice(card: Card, pickedId: string, correct: boolean, correctText: string): void {
  card.el.querySelector<HTMLElement>(`[data-opt="${CSS.escape(pickedId)}"]`)?.classList.add(correct ? 'right' : 'wrong');
  if (!correct)
    card.el.querySelectorAll<HTMLElement>('[data-opt]').forEach((b) => {
      if (b.textContent === correctText) b.classList.add('right');
    });
}

export interface ArrangeLabels {
  /** Shown in the empty tray ("Tap the words in order"). */
  empty: string;
  clear: string;
  check: string;
}

/**
 * A word-order tray: the student taps tokens into the tray (a tap in the tray sends one back) and
 * checks when every token is used. Resolves with the token ids in the student's order.
 */
export function arrange(card: Card, tokens: readonly ChoiceOption[], labels: ArrangeLabels, tap: () => void = () => undefined): Promise<string[]> {
  const box = document.createElement('div');
  box.innerHTML = `<div class="tray" data-empty="${esc(labels.empty)}"></div><div class="tokens">${tokens
    .map((t) => `<button class="tok" data-tok="${esc(t.id)}">${esc(t.text)}</button>`)
    .join('')}</div><div class="actions"><button class="btn soft" data-clear>${esc(labels.clear)}</button><button class="btn green" data-check disabled>${esc(labels.check)}</button></div>`;
  card.el.append(...box.childNodes);
  const tray = card.el.querySelector<HTMLElement>('.tray')!;
  const check = card.el.querySelector<HTMLButtonElement>('[data-check]')!;
  const chosen: string[] = [];
  const redraw = (): void => {
    tray.innerHTML = chosen.map((id) => `<button class="tok" data-back="${esc(id)}">${esc(tokens.find((t) => t.id === id)!.text)}</button>`).join('');
    card.el.querySelectorAll<HTMLElement>('.tokens .tok').forEach((b) => b.classList.toggle('used', chosen.includes(b.dataset.tok!)));
    check.disabled = chosen.length !== tokens.length;
  };
  redraw();
  return new Promise((resolve) => {
    card.el.onclick = (e) => {
      const t = e.target as HTMLElement;
      const add = t.closest<HTMLElement>('[data-tok]');
      const back = t.closest<HTMLElement>('[data-back]');
      if (add && !chosen.includes(add.dataset.tok!)) chosen.push(add.dataset.tok!);
      else if (back) chosen.splice(chosen.indexOf(back.dataset.back!), 1);
      else if (t.closest('[data-clear]')) chosen.length = 0;
      else if (t.closest('[data-check]') && chosen.length === tokens.length) {
        card.el.onclick = null;
        tap();
        resolve([...chosen]);
        return;
      } else return;
      tap();
      redraw();
    };
  });
}

export interface FeedbackAction {
  id: string;
  label: string;
  /** A secondary (soft) button. */
  soft?: boolean;
}

/**
 * Adds a feedback box to the card. With actions, it resolves with the tapped action id; with
 * none, it resolves at once.
 */
export function feedback(card: Card, good: boolean, html: string, actions: readonly FeedbackAction[] = []): Promise<string | null> {
  const buttons = actions.length
    ? `<div class="actions">${actions.map((a) => `<button class="btn ${a.soft ? 'soft' : ''}" data-action="${esc(a.id)}">${esc(a.label)}</button>`).join('')}</div>`
    : '';
  card.append(`${html}${buttons}`, `feedback ${good ? 'good' : 'bad'}`);
  if (!actions.length) return Promise.resolve(null);
  return new Promise((resolve) => {
    card.el.onclick = (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (b) resolve(b.dataset.action!);
    };
  });
}

/**
 * A sentence as blanks that fill in word by word (arena games): the found words show, the
 * others are blanks; `next` marks the next blank (Helper mode).
 */
export function sentenceBar(el: HTMLElement, words: readonly string[], found: number, markNext: boolean): void {
  el.innerHTML = words
    .map((w, i) => (i < found ? `<span class="found">${esc(w)}</span>` : `<span class="blank ${markNext && i === found ? 'next' : ''}">${'_'.repeat(Math.min(6, Math.max(3, w.length)))}</span>`))
    .join(' ');
}

/** Fills `el` with `max` pips, `value` of them lit (health, courage). */
export function pips(el: HTMLElement, value: number, max: number): void {
  el.innerHTML = Array.from({ length: max }, (_, i) => `<i class="${i < value ? '' : 'off'}"></i>`).join('');
}
