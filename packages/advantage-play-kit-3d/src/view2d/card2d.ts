/**
 * The challenge card of a 2D view, the Phaser twin of the HTML card widgets (`hud/widgets.ts`):
 * a paper card in a screen rectangle that stacks a turn pill, text, and one interaction at a
 * time: pick one option (`choose`), tap words into order (`arrange`), or read feedback with
 * action buttons (`feedback`). Nothing is timed; each interaction resolves when the student acts.
 *
 * The card grows downward from the top of its rectangle (or, anchored at the bottom, upward from
 * its bottom, as a phone's bottom sheet) and moves up when its content is taller.
 * `targets` lists the center of every tappable element (game pixels) for the QC driver.
 */
import type * as Phaser from 'phaser';
import { COLORS, FONT, text } from './hud2d.js';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CardOption {
  id: string;
  text: string;
}

export interface CardAction {
  id: string;
  label: string;
  /** A secondary (soft) button. */
  soft?: boolean;
}

export interface ArrangeLabels {
  empty: string;
  clear: string;
  check: string;
}

/** A tappable element of the card: its kind, its id, and its center in game pixels. */
export interface CardTarget {
  kind: 'option' | 'token' | 'tray' | 'clear' | 'check' | 'action';
  id: string;
  x: number;
  y: number;
}

const PAD = 14;
const GAP = 8;
const INK = '#2b1d3a';

type Chip = Phaser.GameObjects.Container;

export class Card2D {
  private box: Phaser.GameObjects.Container | null = null;
  private bg: Phaser.GameObjects.Graphics | null = null;
  private y = PAD;
  private readonly options = new Map<string, { chip: Chip; label: Phaser.GameObjects.Text }>();
  /** Tappable elements in card coordinates. */
  private local: CardTarget[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    /** The screen rectangle of the card (read at each `begin`, so a view can change it). */
    private readonly area: () => Rect,
    private readonly tap: () => void = () => undefined,
    private readonly anchor: 'top' | 'bottom' = 'top',
    private readonly depth = 18_000,
  ) {}

  private get width(): number {
    return this.area().width;
  }

  /** Every tappable element now on the card, with its center in game pixels. */
  get targets(): CardTarget[] {
    const box = this.box;
    return box ? this.local.map((t) => ({ ...t, x: t.x + box.x, y: t.y + box.y })) : [];
  }

  /** Starts a new card (the old one goes). */
  begin(): void {
    this.hide();
    const a = this.area();
    this.bg = this.scene.add.graphics();
    this.box = this.scene.add.container(a.x, a.y, [this.bg]).setScrollFactor(0).setDepth(this.depth);
    this.y = PAD;
    this.local = [];
    this.options.clear();
  }

  hide(): void {
    this.box?.destroy();
    this.box = null;
    this.bg = null;
    this.local = [];
    this.options.clear();
  }

  /**
   * A colored pill ("Knight's turn") and an optional note beside it ("Try this one again").
   * `icon` is a texture key drawn as a round 26 px image at the start (the student's face); a
   * key that is not loaded yet is left out.
   */
  pill(value: string, color: number, note = '', icon?: string): void {
    const label = text(this.scene, 0, 0, value, 16).setOrigin(0, 0.5);
    const lead = icon && this.scene.textures.exists(icon) ? 26 : 0;
    const w = label.width + 22 + lead;
    const g = this.scene.add.graphics().fillStyle(color, 1).fillRoundedRect(0, -15, w, 30, 15);
    const parts: Phaser.GameObjects.GameObject[] = [g, label.setX(11 + lead)];
    if (lead) parts.push(this.scene.add.image(17, 0, icon!).setDisplaySize(26, 26));
    const pill = this.scene.add.container(PAD, this.y + 15, parts);
    this.add(pill);
    if (note) this.add(text(this.scene, PAD + w + 10, this.y + 15, note, 14, '#b4541a').setOrigin(0, 0.5));
    this.y += 30 + GAP;
  }

  /** A wrapped line of text. */
  line(value: string, size: number, color = INK, options: { bold?: boolean; center?: boolean } = {}): void {
    const t = this.scene.add
      .text(options.center ? this.width / 2 : PAD, this.y, value, {
        fontFamily: FONT,
        fontSize: `${size}px`,
        fontStyle: options.bold === false ? '500' : '700',
        color,
        align: options.center ? 'center' : 'left',
        wordWrap: { width: this.width - 2 * PAD, useAdvancedWrap: true },
      })
      .setResolution(2)
      .setOrigin(options.center ? 0.5 : 0, 0);
    this.add(t);
    this.y += t.height + GAP;
  }

  /** Text with `<b>…</b>` parts in bold and `\n` line breaks, wrapped word by word. */
  rich(markup: string, size: number, color = INK): void {
    const lineH = size + 8;
    let x = PAD;
    for (const [n, row] of markup.split('\n').entries()) {
      if (n > 0) {
        x = PAD;
        this.y += lineH;
      }
      const parts = row.split(/(<b>.*?<\/b>)/u).filter(Boolean);
      for (const part of parts) {
        const bold = part.startsWith('<b>');
        for (const word of part.replace(/<\/?b>/gu, '').split(/\s+/u).filter(Boolean)) {
          const t = text(this.scene, 0, 0, word, size, bold ? '#1f7a3a' : color, bold).setOrigin(0, 0);
          if (x + t.width > this.width - PAD && x > PAD) {
            x = PAD;
            this.y += lineH;
          }
          t.setPosition(x, this.y);
          x += t.width + 6;
          this.add(t);
        }
      }
    }
    this.y += lineH + GAP / 2;
  }

  /**
   * One button per option; resolves with the tapped option's id. Short options sit in two
   * columns (as the 3D card), long ones get the full width.
   */
  choose(options: readonly CardOption[]): Promise<string> {
    const columns = options.length >= 3 && options.every((o) => o.text.length <= 14) ? 2 : 1;
    const w = (this.width - 2 * PAD - GAP * (columns - 1)) / columns;
    return new Promise((resolve) => {
      let done = false;
      let rowH = 0;
      for (const [i, o] of options.entries()) {
        const chip = this.chip(o.text, 20, 0xf1ebff, COLORS.purple, w);
        const col = i % columns;
        chip.setPosition(PAD + col * (w + GAP) + w / 2, this.y + chip.height / 2);
        rowH = Math.max(rowH, chip.height);
        if (col === columns - 1 || i === options.length - 1) {
          this.y += rowH + GAP;
          rowH = 0;
        }
        this.add(chip);
        this.options.set(o.id, { chip, label: chip.list[1] as Phaser.GameObjects.Text });
        this.target('option', o.id, chip);
        chip.on('pointerup', () => {
          if (done) return;
          done = true;
          this.tap();
          for (const { chip: c } of this.options.values()) c.disableInteractive();
          resolve(o.id);
        });
      }
      this.fit();
    });
  }

  /** Colors the picked option (green when right, red when wrong) and the right option green. */
  markChoice(pickedId: string, correct: boolean, correctText: string): void {
    for (const [id, { chip, label }] of this.options) {
      const right = label.text === correctText;
      const color = id === pickedId ? (correct ? COLORS.green : COLORS.red) : right ? COLORS.green : null;
      if (color === null) {
        chip.setAlpha(0.55);
        continue;
      }
      this.paint(chip, color, color);
      label.setColor('#ffffff');
    }
  }

  /** Tap the tokens into the tray in order; resolves with the token ids when all are placed and checked. */
  arrange(tokens: readonly CardOption[], labels: ArrangeLabels): Promise<string[]> {
    const chosen: string[] = [];
    const top = this.y;
    let parts: Phaser.GameObjects.GameObject[] = [];
    return new Promise((resolve) => {
      const redraw = (): void => {
        parts.forEach((p) => p.destroy());
        parts = [];
        this.local = this.local.filter((t) => t.kind !== 'token' && t.kind !== 'tray' && t.kind !== 'clear' && t.kind !== 'check');
        this.y = top;
        // The tray: the words in the order the student tapped them.
        const trayTop = this.y;
        const trayBg = this.scene.add.graphics();
        this.add(trayBg);
        parts.push(trayBg);
        this.y += 8;
        if (!chosen.length) {
          const hint = text(this.scene, this.width / 2, this.y + 16, labels.empty, 15, '#8a7fa6', false).setOrigin(0.5);
          this.add(hint);
          parts.push(hint);
          this.y += 40;
        } else {
          const placed = this.flow(chosen.map((id) => tokens.find((t) => t.id === id)!), 0xffffff, (t) => {
            chosen.splice(chosen.indexOf(t.id), 1);
            this.tap();
            redraw();
          }, 'tray');
          parts.push(...placed);
        }
        trayBg.fillStyle(0xf3eee0, 1).fillRoundedRect(PAD - 4, trayTop, this.width - 2 * PAD + 8, this.y - trayTop + 2, 12);
        trayBg.lineStyle(2, 0xd8cfb8, 1).strokeRoundedRect(PAD - 4, trayTop, this.width - 2 * PAD + 8, this.y - trayTop + 2, 12);
        this.y += GAP + 4;
        // The words still to place.
        const left = tokens.filter((t) => !chosen.includes(t.id));
        parts.push(...this.flow(left, 0xffffff, (t) => {
          chosen.push(t.id);
          this.tap();
          redraw();
        }, 'token'));
        this.y += 4;
        // Clear and Check.
        const half = (this.width - 2 * PAD - GAP) / 2;
        const clear = this.chip(labels.clear, 18, 0xe9e4f5, COLORS.purple, half);
        const ready = chosen.length === tokens.length;
        const check = this.chip(labels.check, 18, ready ? COLORS.green : 0xb9d9c2, 0xffffff, half);
        clear.setPosition(PAD + half / 2, this.y + clear.height / 2);
        check.setPosition(PAD + half + GAP + half / 2, this.y + check.height / 2);
        this.add(clear);
        this.add(check);
        parts.push(clear, check);
        this.target('clear', 'clear', clear);
        this.target('check', 'check', check);
        this.y += clear.height + PAD;
        clear.on('pointerup', () => {
          chosen.length = 0;
          this.tap();
          redraw();
        });
        check.on('pointerup', () => {
          if (chosen.length !== tokens.length) return;
          this.tap();
          resolve([...chosen]);
        });
        this.fit();
      };
      redraw();
    });
  }

  /**
   * A feedback box under the content: green for right, red for wrong. With actions it resolves
   * with the tapped action's id; with none it resolves at once.
   */
  feedback(good: boolean, markup: string, actions: readonly CardAction[] = []): Promise<string | null> {
    const top = this.y;
    const back = this.scene.add.graphics();
    this.add(back);
    this.y += 10;
    this.rich(markup, 17, good ? '#1f6b35' : '#8a2a1c');
    const bottom = this.y;
    back.fillStyle(good ? 0xe3f6e8 : 0xfbe7e2, 1).fillRoundedRect(PAD - 4, top, this.width - 2 * PAD + 8, bottom - top, 12);
    this.y += GAP;
    if (!actions.length) {
      this.fit();
      return Promise.resolve(null);
    }
    return this.buttons(actions);
  }

  /** A row of action buttons under the content; resolves with the tapped action's id (the row goes). */
  buttons(actions: readonly CardAction[]): Promise<string> {
    this.local = this.local.filter((t) => t.kind !== 'action');
    return new Promise((resolve) => {
      const top = this.y;
      const w = (this.width - 2 * PAD - GAP * (actions.length - 1)) / actions.length;
      const chips = actions.map((a, i) => {
        const chip = this.chip(a.label, 17, a.soft ? 0xe9e4f5 : COLORS.gold, a.soft ? COLORS.purple : COLORS.tagFill, w);
        chip.setPosition(PAD + i * (w + GAP) + w / 2, this.y + chip.height / 2);
        this.add(chip);
        this.target('action', a.id, chip);
        chip.on('pointerup', () => {
          this.tap();
          chips.forEach((c) => c.destroy());
          this.local = this.local.filter((t) => t.kind !== 'action');
          this.y = top;
          resolve(a.id);
        });
        return chip;
      });
      this.y += Math.max(...chips.map((c) => c.height)) + PAD;
      this.fit();
    });
  }

  /** Word chips that flow and wrap from the cursor; returns the chips. */
  private flow(list: readonly CardOption[], fill: number, onTap: (t: CardOption) => void, kind: 'token' | 'tray'): Chip[] {
    let x = PAD;
    let rowH = 0;
    const chips = list.map((t) => {
      const chip = this.chip(t.text, 19, fill, INK, undefined, 0xcfc6e6);
      if (x + chip.width > this.width - PAD && x > PAD) {
        x = PAD;
        this.y += rowH + 6;
        rowH = 0;
      }
      chip.setPosition(x + chip.width / 2, this.y + chip.height / 2);
      x += chip.width + 6;
      rowH = Math.max(rowH, chip.height);
      this.add(chip);
      this.target(kind, t.id, chip);
      chip.on('pointerup', () => onTap(t));
      return chip;
    });
    this.y += rowH + 6;
    return chips;
  }

  /** A rounded, tappable box with a label (wrapped to `width` when given). */
  private chip(value: string, size: number, fill: number, color: number | string, width?: number, border?: number): Chip {
    const label = this.scene.add
      .text(0, 0, value, {
        fontFamily: FONT,
        fontSize: `${size}px`,
        fontStyle: '700',
        color: typeof color === 'number' ? `#${color.toString(16).padStart(6, '0')}` : color,
        align: 'center',
        ...(width ? { wordWrap: { width: width - 24, useAdvancedWrap: true } } : {}),
      })
      .setResolution(2)
      .setOrigin(0.5);
    const w = width ?? Math.max(44, label.width + 22);
    const h = Math.max(42, label.height + 16);
    const g = this.scene.add.graphics();
    const chip = this.scene.add.container(0, 0, [g, label]).setSize(w, h);
    chip.setData('fill', fill).setData('border', border ?? fill);
    this.paint(chip, fill, border ?? fill);
    chip.setInteractive({ useHandCursor: true });
    return chip;
  }

  private paint(chip: Chip, fill: number, border: number): void {
    const g = chip.list[0] as Phaser.GameObjects.Graphics;
    const w = chip.width;
    const h = chip.height;
    g.clear();
    g.fillStyle(0x000000, 0.12).fillRoundedRect(-w / 2, -h / 2 + 3, w, h, 12);
    g.fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    g.lineStyle(2, border, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
  }

  private target(kind: CardTarget['kind'], id: string, obj: Chip): void {
    this.local.push({ kind, id, x: obj.x, y: obj.y });
  }

  private add(obj: Phaser.GameObjects.GameObject): void {
    this.box?.add(obj);
  }

  /** Draws the paper to fit the content and keeps the card inside the screen (it moves up). */
  private fit(): void {
    if (!this.box || !this.bg) return;
    const a = this.area();
    const h = this.y;
    const screenH = this.scene.scale.height;
    const top = this.anchor === 'bottom' ? Math.max(8, a.y + a.height - h) : Math.max(8, Math.min(a.y, screenH - 8 - h));
    this.box.setPosition(a.x, top);
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.3).fillRoundedRect(0, 5, this.width, h, 18);
    this.bg.fillStyle(COLORS.paper, 0.98).fillRoundedRect(0, 0, this.width, h, 18);
  }
}
