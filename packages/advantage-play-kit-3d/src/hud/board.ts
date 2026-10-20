/**
 * A swap board in the HTML HUD (the 3D views' twin of `view2d/board2d.ts`, with the same API): a
 * grid of tiles with a short text (a meaning, Thai included) in one color per kind. The student
 * swaps two neighbors by a drag from one tile toward the other, or by a tap on one tile and then a
 * tap on a neighbor. The board never decides a rule: it reports the swap, and the view animates
 * what the core says (a swap, a swap back, bursts, falls and new tiles), awaiting each animation.
 */
import { esc, hasThai } from './dom.js';

export interface BoardCell {
  id: string;
  text: string;
  color: number;
  /** A soft glow (Helper mode: the tiles of the target). */
  glow?: boolean;
}

export interface Cell {
  row: number;
  col: number;
}

interface Tile {
  el: HTMLElement;
  cell: BoardCell;
  row: number;
  col: number;
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;
const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** The width of `text` in em in the tile font (a canvas measure; the CSS fits the font to the tile). */
const widths = new Map<string, number>();
let measure: CanvasRenderingContext2D | null | undefined;
function emWidth(text: string, family: string): number {
  const key = `${family}|${text}`;
  const known = widths.get(key);
  if (known !== undefined) return known;
  measure ??= document.createElement('canvas').getContext('2d');
  if (!measure) return text.length * 0.6;
  measure.font = `700 100px ${family}`;
  const em = measure.measureText(text).width / 100;
  widths.set(key, em);
  return em;
}

/** The tile font families of hud.css, for a tile that has no computed style yet. */
const FAMILIES = { latin: "'Fredoka', 'Mitr', system-ui, sans-serif", thai: "'Mitr', 'Noto Sans Thai', system-ui, sans-serif" };
/** The tile padding and border in CSS pixels (hud.css: 2 + 2 on each side, and a margin). */
const INSET = 12;
/** The line height of the tile font (hud.css). */
const LINE = 1.1;

export class Board {
  readonly el: HTMLElement;
  private readonly tiles = new Map<string, Tile>();
  private selected: Tile | null = null;
  private dragFrom: { tile: Tile; x: number; y: number } | null = null;
  /** False while an animation runs: input waits. */
  enabled = true;
  private readonly resized: ResizeObserver | null;
  /** The tile font family, Latin and Thai (the Thai tiles use their own font list). */
  private readonly families = new Map<boolean, string>();
  /** The tile width in CSS pixels (`--tile`); the label lines depend on it. */
  private tileSize = 60;
  /** Fits every label again (a resize, or a font that loaded after the first measure). */
  private readonly refit = (): void => {
    widths.clear();
    for (const t of this.tiles.values()) this.paint(t);
  };

  constructor(
    parent: HTMLElement,
    readonly rows: number,
    readonly cols: number,
    private readonly onSwap: (a: Cell, b: Cell) => void,
    private readonly tap: () => void = () => undefined,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'board';
    this.el.style.aspectRatio = `${cols} / ${rows}`;
    parent.append(this.el);
    this.el.addEventListener('pointermove', (e) => this.move(e));
    this.el.addEventListener('pointerup', () => this.release());
    this.el.addEventListener('pointercancel', () => (this.dragFrom = null));
    // The tile size in CSS pixels, for the font fit in the CSS (`--tile`, and `--em` per tile).
    this.resized = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.resize());
    this.resized?.observe(this.el);
    // Measured before the theme fonts loaded, the widths are the fallback font's: measure again.
    // A font loads when a tile first uses it, which can be after `ready`, so each load counts.
    document.fonts?.addEventListener?.('loadingdone', this.refit);
    void document.fonts?.ready.then(this.refit);
  }

  /** Every tile's center (CSS pixels) with its cell and id. */
  get targets(): { id: string; row: number; col: number; text: string; x: number; y: number }[] {
    return [...this.tiles.values()].map((t) => {
      const r = t.el.getBoundingClientRect();
      return { id: t.cell.id, row: t.row, col: t.col, text: t.cell.text, x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
  }

  /** Shows a whole board at once. */
  set(board: readonly (readonly BoardCell[])[]): void {
    for (const t of this.tiles.values()) t.el.remove();
    this.tiles.clear();
    this.selected = null;
    board.forEach((row, r) => row.forEach((cell, c) => this.add(cell, r, c)));
  }

  /** Updates the look of tiles in place (a new glow). */
  restyle(board: readonly (readonly BoardCell[])[]): void {
    board.forEach((row) =>
      row.forEach((cell) => {
        const t = this.tiles.get(cell.id);
        if (!t) return;
        t.cell = cell;
        this.paint(t);
      }),
    );
  }

  async swap(a: Cell, b: Cell, back = false): Promise<void> {
    const ta = this.at(a);
    const tb = this.at(b);
    if (!ta || !tb) return;
    this.place(ta, b);
    this.place(tb, a);
    await pause(180);
    if (!back) return;
    this.place(ta, a);
    this.place(tb, b);
    await pause(180);
  }

  async burst(cells: readonly Cell[]): Promise<void> {
    const gone = cells.map((c) => this.at(c)).filter((t): t is Tile => !!t);
    for (const t of gone) {
      this.tiles.delete(t.cell.id);
      t.el.classList.add('pop');
    }
    await pause(300);
    for (const t of gone) t.el.remove();
  }

  async fall(moves: readonly { from: Cell; to: Cell }[], added: readonly { cell: Cell; rune: BoardCell }[]): Promise<void> {
    const moving = moves.map((m) => ({ tile: this.at(m.from), to: m.to })).filter((m): m is { tile: Tile; to: Cell } => !!m.tile);
    let longest = 0;
    for (const { tile, to } of moving) {
      const rows = Math.abs(to.row - tile.row);
      longest = Math.max(longest, rows);
      tile.el.style.transitionDuration = `${90 + 70 * rows}ms`;
      this.place(tile, to);
    }
    const fresh = added.map(({ cell, rune }) => {
      const drop = Math.max(1, added.filter((x) => x.cell.col === cell.col).length);
      longest = Math.max(longest, drop);
      const t = this.add(rune, cell.row - drop, cell.col);
      t.el.style.opacity = '0';
      return { t, cell, drop };
    });
    // Next frame: the new tiles drop into their cells.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    for (const { t, cell, drop } of fresh) {
      t.el.style.transitionDuration = `${120 + 70 * drop}ms`;
      t.el.style.opacity = '1';
      this.place(t, cell);
    }
    await pause(140 + 70 * longest);
    for (const t of this.tiles.values()) t.el.style.transitionDuration = '';
  }

  destroy(): void {
    this.resized?.disconnect();
    document.fonts?.removeEventListener?.('loadingdone', this.refit);
    this.el.remove();
    this.tiles.clear();
  }

  // ---------------------------------------------------------------- tiles

  private at(cell: Cell): Tile | undefined {
    for (const t of this.tiles.values()) if (t.row === cell.row && t.col === cell.col) return t;
    return undefined;
  }

  private add(cell: BoardCell, row: number, col: number): Tile {
    const el = document.createElement('button');
    el.className = 'rune';
    el.style.width = `calc(${100 / this.cols}% - 6px)`;
    el.style.height = `calc(${100 / this.rows}% - 6px)`;
    const t: Tile = { el, cell, row, col };
    el.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      this.el.setPointerCapture?.(e.pointerId);
      this.dragFrom = { tile: t, x: e.clientX, y: e.clientY };
    });
    // In the page first: a detached tile has no computed font, and the fit measures in that font.
    this.el.append(el);
    this.place(t, { row, col });
    this.paint(t);
    this.tiles.set(cell.id, t);
    return t;
  }

  private resize(): void {
    const size = this.el.clientWidth / this.cols - 6;
    if (size <= 0 || Math.abs(size - this.tileSize) < 0.5) return;
    this.tileSize = size;
    this.el.style.setProperty('--tile', `${size}px`);
    this.refit();
  }

  private place(t: Tile, cell: Cell): void {
    t.row = cell.row;
    t.col = cell.col;
    t.el.style.left = `calc(${(cell.col * 100) / this.cols}% + 3px)`;
    t.el.style.top = `calc(${(cell.row * 100) / this.rows}% + 3px)`;
  }

  private paint(t: Tile): void {
    const text = t.cell.text;
    t.el.style.background = hex(t.cell.color);
    t.el.classList.toggle('glow', !!t.cell.glow);
    const th = hasThai(text);
    t.el.classList.toggle('th', th);
    const style = t.el.isConnected ? getComputedStyle(t.el) : null;
    let family = this.families.get(th);
    if (!family && style?.fontFamily) this.families.set(th, (family = style.fontFamily));
    family ||= th ? FAMILIES.thai : FAMILIES.latin;
    const lines = this.linesOf(text, family, parseFloat(style?.fontSize ?? '') || 18);
    t.el.innerHTML = `<span>${lines.map(esc).join('<br>')}</span>`;
    t.el.style.setProperty('--em', Math.max(...lines.map((l) => emWidth(l, family))).toFixed(3));
    t.el.style.setProperty('--lines', String(lines.length));
  }

  /**
   * The lines of a label. A word never breaks: it shrinks to fit the tile (CSS). A phrase takes two
   * lines at the space that gives the largest font, but only when one line would have to shrink.
   */
  private linesOf(text: string, family: string, base: number): string[] {
    const words = text.split(' ').filter(Boolean);
    if (words.length < 2) return [text];
    const room = this.tileSize - INSET;
    const fontOf = (lines: string[]): number => Math.min(base, room / Math.max(...lines.map((l) => emWidth(l, family))), room / (LINE * lines.length));
    let best = [words.join(' ')];
    for (let i = 1; i < words.length; i++) {
      const two = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
      if (fontOf(two) > fontOf(best) + 0.25) best = two;
    }
    return best;
  }

  // ---------------------------------------------------------------- input: drag or tap-then-tap

  private move(e: PointerEvent): void {
    const from = this.dragFrom;
    if (!from || !this.enabled) return;
    const size = from.tile.el.getBoundingClientRect().width;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < size * 0.4) return;
    this.dragFrom = null;
    const to = Math.abs(dx) > Math.abs(dy) ? { row: from.tile.row, col: from.tile.col + Math.sign(dx) } : { row: from.tile.row + Math.sign(dy), col: from.tile.col };
    this.unselect();
    if (to.row < 0 || to.row >= this.rows || to.col < 0 || to.col >= this.cols) return;
    this.tap();
    this.onSwap({ row: from.tile.row, col: from.tile.col }, to);
  }

  private release(): void {
    const from = this.dragFrom;
    this.dragFrom = null;
    if (!from || !this.enabled) return;
    const t = from.tile;
    const s = this.selected;
    this.tap();
    if (!s) return this.select(t);
    if (s === t) return this.unselect();
    const near = Math.abs(s.row - t.row) + Math.abs(s.col - t.col) === 1;
    this.unselect();
    if (!near) return this.select(t);
    this.onSwap({ row: s.row, col: s.col }, { row: t.row, col: t.col });
  }

  private select(t: Tile): void {
    this.selected = t;
    t.el.classList.add('selected');
  }

  private unselect(): void {
    this.selected?.el.classList.remove('selected');
    this.selected = null;
  }
}
