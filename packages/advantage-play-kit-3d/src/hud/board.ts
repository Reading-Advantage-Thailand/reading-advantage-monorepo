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

export class Board {
  readonly el: HTMLElement;
  private readonly tiles = new Map<string, Tile>();
  private selected: Tile | null = null;
  private dragFrom: { tile: Tile; x: number; y: number } | null = null;
  /** False while an animation runs: input waits. */
  enabled = true;

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
    this.place(t, { row, col });
    this.paint(t);
    el.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      this.el.setPointerCapture?.(e.pointerId);
      this.dragFrom = { tile: t, x: e.clientX, y: e.clientY };
    });
    this.el.append(el);
    this.tiles.set(cell.id, t);
    return t;
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
    t.el.classList.toggle('th', hasThai(text));
    t.el.classList.toggle('long', text.length > 6);
    t.el.innerHTML = `<span>${esc(text)}</span>`;
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
