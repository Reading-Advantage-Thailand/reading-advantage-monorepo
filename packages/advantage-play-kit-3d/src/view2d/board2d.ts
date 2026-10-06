/**
 * A swap board for 2D views (match games such as Rune Match): a grid of tiles with a short text
 * (a meaning, Thai included) or an icon, in one color per kind. The student swaps two neighbors by
 * a drag from one tile toward the other, or by a tap on one tile and then a tap on a neighbor.
 * The board never decides a rule: it reports the swap, and the view animates what the core says
 * (a swap, a swap back, bursts, falls and new tiles), awaiting each animation.
 *
 * Tiles are keyed by id, so an animation moves the same tile object; `targets` lists the tile
 * centers in game pixels for the QC driver.
 */
import type * as Phaser from 'phaser';
import { FONT } from './hud2d.js';
import type { Rect } from './card2d.js';

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
  box: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  cell: BoardCell;
  row: number;
  col: number;
}

const GAP = 5;
const THAI = /[\u0E00-\u0E7F]/;

export class Board2D {
  private readonly tiles = new Map<string, Tile>();
  private readonly size: number;
  private readonly left: number;
  private readonly top: number;
  private selected: Tile | null = null;
  private dragFrom: { tile: Tile; x: number; y: number } | null = null;
  /** False while an animation runs: input waits. */
  enabled = true;

  constructor(
    private readonly scene: Phaser.Scene,
    area: Rect,
    readonly rows: number,
    readonly cols: number,
    private readonly onSwap: (a: Cell, b: Cell) => void,
    private readonly tap: () => void = () => undefined,
    private readonly depth = 18_000,
  ) {
    this.size = Math.floor(Math.min((area.width - GAP * (cols - 1)) / cols, (area.height - GAP * (rows - 1)) / rows));
    const w = cols * this.size + (cols - 1) * GAP;
    const h = rows * this.size + (rows - 1) * GAP;
    this.left = area.x + (area.width - w) / 2;
    this.top = area.y + (area.height - h) / 2;
    const frame = scene.add.graphics().setScrollFactor(0).setDepth(depth - 1);
    frame.fillStyle(0x121a2c, 0.85).fillRoundedRect(this.left - 8, this.top - 8, w + 16, h + 16, 16);
    scene.input.on('pointermove', this.move, this);
    scene.input.on('pointerup', this.release, this);
  }

  /** The screen center of a cell. */
  center(cell: Cell): { x: number; y: number } {
    return { x: this.left + cell.col * (this.size + GAP) + this.size / 2, y: this.top + cell.row * (this.size + GAP) + this.size / 2 };
  }

  /** Every tile's center (game pixels) with its cell and id. */
  get targets(): { id: string; row: number; col: number; text: string; x: number; y: number }[] {
    return [...this.tiles.values()].map((t) => ({ id: t.cell.id, row: t.row, col: t.col, text: t.cell.text, ...this.center(t) }));
  }

  /** Shows a whole board at once (the first board, or after a shuffle). */
  set(board: readonly (readonly BoardCell[])[]): void {
    for (const t of this.tiles.values()) t.box.destroy();
    this.tiles.clear();
    this.selected = null;
    board.forEach((row, r) => row.forEach((cell, c) => this.add(cell, r, c)));
  }

  /** Updates the look of tiles in place (a new glow, a new color). */
  restyle(board: readonly (readonly BoardCell[])[]): void {
    board.forEach((row) =>
      row.forEach((cell) => {
        const t = this.tiles.get(cell.id);
        if (!t) return;
        t.cell = cell;
        this.paint(t, false);
      }),
    );
  }

  /** Swaps two tiles (and swaps them back when `back`): the answer to a swap. */
  async swap(a: Cell, b: Cell, back = false): Promise<void> {
    const ta = this.at(a);
    const tb = this.at(b);
    if (!ta || !tb) return;
    await Promise.all([this.slide(ta, b, 160), this.slide(tb, a, 160)]);
    if (!back) return;
    await Promise.all([this.slide(ta, a, 160), this.slide(tb, b, 160)]);
  }

  /** The tiles of `cells` pop and go. */
  async burst(cells: readonly Cell[], color = 0xffffff): Promise<void> {
    const gone = cells.map((c) => this.at(c)).filter((t): t is Tile => !!t);
    await Promise.all(
      gone.map(
        (t) =>
          new Promise<void>((resolve) => {
            this.tiles.delete(t.cell.id);
            const { x, y } = this.center(t);
            for (let k = 0; k < 6; k++) {
              const a = (k / 6) * Math.PI * 2;
              const dot = this.scene.add.circle(x, y, 4, color).setScrollFactor(0).setDepth(this.depth + 5);
              this.scene.tweens.add({ targets: dot, x: x + Math.cos(a) * 26, y: y + Math.sin(a) * 26, alpha: 0, duration: 380, onComplete: () => dot.destroy() });
            }
            this.scene.tweens.add({ targets: t.box, scale: 1.25, alpha: 0, duration: 260, ease: 'Back.In', onComplete: () => (t.box.destroy(), resolve()) });
          }),
      ),
    );
  }

  /** Tiles fall to new cells, and new tiles drop in from above the board. */
  async fall(moves: readonly { from: Cell; to: Cell }[], added: readonly { cell: Cell; rune: BoardCell }[]): Promise<void> {
    const moving = moves.map((m) => ({ tile: this.at(m.from), to: m.to })).filter((m): m is { tile: Tile; to: Cell } => !!m.tile);
    const jobs = moving.map(({ tile, to }) => this.slide(tile, to, 90 + 70 * Math.abs(to.row - tile.row), 'Bounce.Out'));
    for (const { cell, rune } of added) {
      const t = this.add(rune, cell.row, cell.col);
      const end = this.center(cell);
      const drop = Math.max(1, added.filter((a) => a.cell.col === cell.col).length);
      t.box.setY(end.y - drop * (this.size + GAP)).setAlpha(0);
      jobs.push(
        new Promise<void>((resolve) => {
          this.scene.tweens.add({ targets: t.box, y: end.y, alpha: 1, duration: 120 + 70 * drop, ease: 'Bounce.Out', onComplete: () => resolve() });
        }),
      );
    }
    await Promise.all(jobs);
  }

  destroy(): void {
    this.scene.input.off('pointermove', this.move, this);
    this.scene.input.off('pointerup', this.release, this);
    for (const t of this.tiles.values()) t.box.destroy();
    this.tiles.clear();
  }

  // ---------------------------------------------------------------- tiles

  private at(cell: Cell): Tile | undefined {
    for (const t of this.tiles.values()) if (t.row === cell.row && t.col === cell.col) return t;
    return undefined;
  }

  private add(cell: BoardCell, row: number, col: number): Tile {
    const { x, y } = this.center({ row, col });
    const bg = this.scene.add.graphics();
    // A word never breaks inside: it shrinks to fit the tile (Thai has no spaces; a long English
    // word broke as "lanter / n"). A phrase wraps at its spaces only.
    const fit = this.size - 8;
    const thai = THAI.test(cell.text);
    const phrase = !thai && cell.text.includes(' ');
    const label = this.scene.add
      .text(0, 0, cell.text, {
        fontFamily: FONT,
        fontSize: `${thai ? 15 : 18}px`,
        fontStyle: '700',
        color: '#ffffff',
        align: 'center',
        ...(phrase ? { wordWrap: { width: fit } } : {}),
      })
      .setResolution(2)
      .setOrigin(0.5)
      .setStroke('#00000055', 3);
    let px = thai ? 15 : 18;
    while (label.width > fit && px > 8) label.setFontSize(`${--px}px`);
    const box = this.scene.add.container(x, y, [bg, label]).setSize(this.size, this.size).setScrollFactor(0).setDepth(this.depth);
    const t: Tile = { box, bg, label, cell, row, col };
    this.paint(t, false);
    box.setInteractive({ useHandCursor: true });
    box.on('pointerdown', (p: Phaser.Input.Pointer) => this.press(t, p));
    this.tiles.set(cell.id, t);
    return t;
  }

  private paint(t: Tile, selected: boolean): void {
    const s = this.size;
    const g = t.bg;
    g.clear();
    if (t.cell.glow) g.fillStyle(0xfff4a8, 0.55).fillRoundedRect(-s / 2 - 4, -s / 2 - 4, s + 8, s + 8, 14);
    g.fillStyle(0x000000, 0.3).fillRoundedRect(-s / 2, -s / 2 + 3, s, s, 12);
    g.fillStyle(t.cell.color, 1).fillRoundedRect(-s / 2, -s / 2, s, s, 12);
    g.fillStyle(0xffffff, 0.18).fillRoundedRect(-s / 2 + 4, -s / 2 + 3, s - 8, s * 0.35, 9);
    g.lineStyle(selected ? 4 : 2, selected ? 0xffd84a : 0xffffff, selected ? 1 : 0.5).strokeRoundedRect(-s / 2, -s / 2, s, s, 12);
    t.label.setText(t.cell.text);
  }

  private slide(t: Tile, to: Cell, ms: number, ease = 'Sine.InOut'): Promise<void> {
    t.row = to.row;
    t.col = to.col;
    const { x, y } = this.center(to);
    return new Promise((resolve) => this.scene.tweens.add({ targets: t.box, x, y, duration: ms, ease, onComplete: () => resolve() }));
  }

  // ---------------------------------------------------------------- input: drag or tap-then-tap

  private press(t: Tile, p: Phaser.Input.Pointer): void {
    if (!this.enabled) return;
    this.dragFrom = { tile: t, x: p.x, y: p.y };
  }

  private move(p: Phaser.Input.Pointer): void {
    const from = this.dragFrom;
    if (!from || !this.enabled) return;
    const dx = p.x - from.x;
    const dy = p.y - from.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < this.size * 0.4) return;
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
    // A tap: select, or swap with the selected neighbor, or unselect.
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
    this.paint(t, true);
    t.box.setScale(1.06);
  }

  private unselect(): void {
    if (!this.selected) return;
    this.paint(this.selected, false);
    this.selected.box.setScale(1);
    this.selected = null;
  }
}
