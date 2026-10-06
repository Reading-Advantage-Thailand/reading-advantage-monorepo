/**
 * The HTML overlay over the 3D stage. HTML keeps text crisp in every script (Thai, Chinese) and
 * accessible. The root holds labels that follow 3D positions (updated on the stage's frame, so
 * they stop when the stage pauses), floating popups, a banner, and the challenge card.
 */
import type { Stage3D } from '../stage/stage.js';
import type { ScreenPoint } from './dom.js';
import { spreadBoxes, type SpreadBox } from '../sim/index.js';
import { Banner, Card } from './widgets.js';
import { installCss } from './css.js';
import hudCss from './hud.css.js';
import themeCss from './theme.css.js';

installCss('apk3d-theme', themeCss);
installCss('apk3d-hud', hudCss);

export type PopKind = '' | 'miss' | 'good';

/**
 * The panels at the top of the screen (the status bar, a sentence bar, a game's prompt, marked
 * `hud-top`): pinned and spread labels stay under them, so no word covers the sentence.
 */
const TOP_PANELS = '.status, .sentence-bar, .hud-top';

/** Where an anchored element goes this frame, and the range of y it may move in. */
interface Located {
  x: number;
  y: number;
  shown: boolean;
  minY: number;
  maxY: number;
}

export class HudRoot {
  readonly banner: Banner;
  readonly card: Card;
  private readonly anchors = new Map<HTMLElement, () => ScreenPoint>();
  /** Anchors kept inside the screen: when the point is off screen, the element waits at the edge. */
  private readonly pinned = new Set<HTMLElement>();
  /** Anchors kept inside the screen width only (a gate word at the side of a portrait view). */
  private readonly keptX = new Set<HTMLElement>();
  /** Anchors moved apart where they overlap (see sim/spread.ts), with the eased shift of each. */
  private readonly spread = new Map<HTMLElement, number>();
  /** The bottom of the top panels this frame (see TOP_PANELS). */
  private panels = 0;
  private readonly stopFrame: () => void;

  constructor(readonly el: HTMLElement, private readonly stage: Stage3D) {
    el.classList.add('apk3d-hud');
    this.banner = new Banner(el, stage.timeline);
    this.card = new Card(el);
    this.stopFrame = stage.onFrame(() => this.place());
  }

  /**
   * Keeps `el` at a moving screen point (a health bar over a monster, a word over an item). `pin`
   * keeps it on screen; `keepX` keeps it inside the screen width only; `spread` (the default for
   * a pinned label) moves it up or down where it would cover another spread label. A pinned,
   * kept, or spread element is centered on x and hangs above y.
   */
  anchor(el: HTMLElement, where: () => ScreenPoint, options: { pin?: boolean; keepX?: boolean; spread?: boolean } = {}): HTMLElement {
    if (!el.parentElement) this.el.append(el);
    el.classList.add('anchored');
    this.anchors.set(el, where);
    if (options.pin) this.pinned.add(el);
    else if (options.keepX) this.keptX.add(el);
    if (options.spread ?? options.pin) this.spread.set(el, 0);
    const at = this.locate(el, where);
    el.style.left = `${at.x}px`;
    el.style.top = `${at.y}px`;
    return el;
  }

  unanchor(el: HTMLElement, remove = true): void {
    this.anchors.delete(el);
    this.pinned.delete(el);
    this.keptX.delete(el);
    this.spread.delete(el);
    if (remove) el.remove();
  }

  /** A short floating text at a screen point ("-1", "+10 XP", "Miss!"). */
  popup(at: ScreenPoint, text: string, kind: PopKind = ''): void {
    if (!at.visible) return;
    const el = document.createElement('div');
    el.className = `pop ${kind}`;
    el.textContent = text;
    el.style.left = `${at.x}px`;
    el.style.top = `${at.y}px`;
    this.el.append(el);
    void this.stage.timeline.wait(1).then(() => el.remove());
  }

  dispose(): void {
    this.stopFrame();
    for (const el of this.anchors.keys()) el.remove();
    this.anchors.clear();
    this.el.classList.remove('apk3d-hud');
  }

  private place(): void {
    this.panels = this.panelBottom();
    const placed: (Located & { el: HTMLElement; box?: SpreadBox })[] = [];
    for (const [el, where] of this.anchors) placed.push({ el, ...this.locate(el, where) });
    // Read every size after the writes above, then move the spread labels apart.
    const spread = placed.filter((p) => p.shown && this.spread.has(p.el));
    for (const p of spread) {
      const w = p.el.offsetWidth;
      const h = p.el.offsetHeight;
      // A label under a top panel moves down below it.
      if (w > 0) p.box = { x: p.x, y: Math.max(p.y, Math.min(p.maxY, p.minY + h)), w, h, minY: p.minY + h, maxY: p.maxY };
    }
    const boxes = spread.filter((p) => p.box);
    const ys = boxes.length > 1 ? spreadBoxes(boxes.map((p) => p.box!)) : boxes.map((p) => p.y);
    boxes.forEach((p, i) => {
      // Ease the shift, so two labels that pass each other slide instead of jumping.
      const target = ys[i]! - p.y;
      const last = this.spread.get(p.el) ?? 0;
      const shift = Math.abs(target - last) < 0.5 ? target : last + (target - last) * 0.3;
      this.spread.set(p.el, shift);
      p.y += shift;
    });
    for (const p of placed) {
      p.el.style.left = `${p.x}px`;
      p.el.style.top = `${p.y}px`;
    }
  }

  /** Where `el` goes this frame (before the spread), with the range of y it may move in. */
  private locate(el: HTMLElement, where: () => ScreenPoint): Located {
    const p = where();
    const h = this.el.clientHeight;
    if (this.pinned.has(el)) {
      // Keep the element on screen; mark the side it waits on (the CSS draws an arrow).
      const w = this.el.clientWidth;
      // Clamp by the element's own size (it is centered on x and hangs above y), so a wide tag
      // at the edge stays whole.
      const mx = Math.min(w / 2, el.offsetWidth / 2 + 8);
      const top = Math.max(96, this.panels + 4) + el.offsetHeight;
      // Above the bottom controls (the joystick, a Blast button), which take about 150 px (less
      // on a short landscape screen, where the controls sit in the corners).
      const bottom = Math.max(top, h - Math.min(150, h * 0.25));
      const x = Math.min(w - mx, Math.max(mx, p.x));
      const y = Math.min(bottom, Math.max(top, p.visible ? p.y : bottom));
      const edge = !p.visible ? 'down' : p.x < mx ? 'left' : p.x > w - mx ? 'right' : p.y < top ? 'up' : p.y > bottom ? 'down' : '';
      el.dataset.edge = edge;
      el.style.visibility = '';
      return { x, y, shown: true, minY: top - el.offsetHeight, maxY: bottom };
    }
    el.style.visibility = p.visible ? '' : 'hidden';
    if (this.keptX.has(el)) {
      const w = this.el.clientWidth;
      const mx = Math.min(w / 2, el.offsetWidth / 2 + 8);
      el.dataset.edge = p.x < mx ? 'left' : p.x > w - mx ? 'right' : '';
      return { x: Math.min(w - mx, Math.max(mx, p.x)), y: p.y, shown: p.visible, minY: this.panels + 4, maxY: h };
    }
    return { x: p.x, y: p.y, shown: p.visible, minY: this.panels + 4, maxY: h };
  }

  /** The bottom of the lowest top panel in the upper half of the screen (0 without one). */
  private panelBottom(): number {
    const root = this.el.getBoundingClientRect();
    let bottom = 0;
    for (const el of this.el.querySelectorAll<HTMLElement>(TOP_PANELS)) {
      if (el.closest('.card')) continue;
      const r = el.getBoundingClientRect();
      if (r.height === 0 || r.top - root.top > root.height / 2) continue;
      bottom = Math.max(bottom, r.bottom - root.top);
    }
    return bottom;
  }
}
