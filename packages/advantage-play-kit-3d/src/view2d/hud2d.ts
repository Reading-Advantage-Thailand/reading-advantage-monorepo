/**
 * HUD pieces drawn in Phaser for 2D views, in the look of the HTML HUD of the 3D views (the theme
 * colors, Fredoka for Latin and Mitr for Thai): word tags, popups, a banner, a status bar, and
 * round buttons. Every text comes from the caller (the game's catalog), as in the 3D HUD.
 */
import type * as Phaser from 'phaser';
import { spreadBoxes } from '../sim/index.js';

export const FONT = "'Fredoka', 'Mitr', 'Noto Sans Thai', system-ui, sans-serif";
export const COLORS = { ink: '#2b1d3a', paper: 0xfffdf7, night: 0x121a2c, gold: 0xffd84a, green: 0x2fa84f, red: 0xe0452f, purple: 0x6a3fd1, tagFill: 0x2b1d3a };

const thai = (s: string): boolean => /[฀-๿]/.test(s);

/** Text in the theme font (Thai gets a slightly larger size). */
export function text(scene: Phaser.Scene, x: number, y: number, value: string, size: number, color = '#ffffff', bold = true): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, value, { fontFamily: FONT, fontSize: `${thai(value) ? Math.round(size * 1.1) : size}px`, fontStyle: bold ? '700' : '500', color, align: 'center' })
    .setResolution(2);
}

/**
 * Tags that move apart where they overlap (see sim/spread.ts). The game keeps placing each tag
 * where it wants it; after the scene's update, the spread shifts it up or down (eased). `base` is
 * the y the game gave, `set` the y the spread wrote last.
 */
const spreading = new WeakMap<Phaser.Scene, Map<Phaser.GameObjects.Container, { base: number; set: number; shift: number }>>();

function spreadTags(scene: Phaser.Scene): void {
  const tags = spreading.get(scene);
  if (!tags) return;
  const live: { c: Phaser.GameObjects.Container; s: { base: number; set: number; shift: number } }[] = [];
  for (const [c, s] of tags) {
    if (!c.scene) {
      tags.delete(c);
      continue;
    }
    if (c.y !== s.set) s.base = c.y;
    // A hidden tag, a tag in a container, and the tag the student drags keep the game's place.
    if (!c.visible || c.alpha === 0 || c.parentContainer || (c.input?.dragState ?? 0) > 0) {
      s.shift = 0;
      c.y = s.set = s.base;
      continue;
    }
    live.push({ c, s });
  }
  if (live.length === 0) return;
  const view = scene.cameras.main.worldView;
  const boxes = live.map(({ c, s }) => {
    const w = c.width * c.scaleX;
    const h = c.height * c.scaleY;
    return { x: c.x, y: s.base + h / 2, w, h, minY: view.y + h + 4, maxY: view.bottom - 4 };
  });
  const ys = live.length > 1 ? spreadBoxes(boxes) : boxes.map((b) => b.y);
  live.forEach(({ c, s }, i) => {
    const target = ys[i]! - boxes[i]!.y;
    s.shift = Math.abs(target - s.shift) < 0.5 ? target : s.shift + (target - s.shift) * 0.3;
    c.y = s.set = s.base + s.shift;
  });
}

/**
 * A rounded tag with text (a word on an item, a meaning on a gate); centered on its container.
 * Tags of one scene move apart where they overlap (`spread`, on by default).
 */
export function tag(scene: Phaser.Scene, value: string, size = 20, fill = COLORS.tagFill, border = 0xffffff, spread = true): Phaser.GameObjects.Container {
  const label = text(scene, 0, 0, value, size).setOrigin(0.5);
  const w = Math.max(44, label.width + 24);
  const h = Math.max(38, label.height + 12);
  const box = scene.add.graphics();
  box.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 12);
  box.fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 12);
  box.lineStyle(3, border, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
  const c = scene.add.container(0, 0, [box, label]);
  c.setSize(w, h);
  if (spread) {
    let tags = spreading.get(scene);
    if (!tags) {
      const made = new Map<Phaser.GameObjects.Container, { base: number; set: number; shift: number }>();
      spreading.set(scene, (tags = made));
      const run = (): void => spreadTags(scene);
      scene.events.on('postupdate', run);
      scene.events.once('shutdown', () => {
        scene.events.off('postupdate', run);
        made.clear();
        spreading.delete(scene);
      });
    }
    tags.set(c, { base: 0, set: 0, shift: 0 });
  }
  return c;
}

/** Redraws a tag's box in new colors (right, wrong, held). */
export function recolorTag(t: Phaser.GameObjects.Container, fill: number, border: number): void {
  const box = t.list[0] as Phaser.GameObjects.Graphics;
  const w = t.width;
  const h = t.height;
  box.clear();
  box.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 12);
  box.fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 12);
  box.lineStyle(3, border, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
}

/** A short floating text that rises and fades ("+10", "Yum!"). */
export function popup(scene: Phaser.Scene, x: number, y: number, value: string, kind: '' | 'good' | 'miss' = '', depth = 10_000): void {
  const color = kind === 'good' ? '#ffd84a' : kind === 'miss' ? '#cfd8ff' : '#ffffff';
  const t = text(scene, x, y, value, 26, color).setOrigin(0.5, 1).setStroke('#3a1f5c', 6).setDepth(depth);
  scene.tweens.add({ targets: t, y: y - 60, alpha: { from: 1, to: 0 }, scale: { from: 0.7, to: 1.05 }, duration: 1000, ease: 'Cubic.Out', onComplete: () => t.destroy() });
}

/** A message across the top ("Rush hour!", "Shop closed!"); resolves after it fades. */
export function banner(scene: Phaser.Scene, title: string, body: string, seconds = 2.2): Promise<void> {
  const { width } = scene.scale;
  const w = Math.min(width - 32, 480);
  const box = scene.add.graphics().setScrollFactor(0);
  box.fillStyle(COLORS.paper, 0.97).fillRoundedRect(-w / 2, -44, w, body ? 88 : 60, 20);
  const t1 = text(scene, 0, body ? -22 : -14, title, 26, '#6a3fd1').setOrigin(0.5);
  const t2 = text(scene, 0, 16, body, 16, COLORS.ink, false).setOrigin(0.5);
  // Under the status bar and a word panel (a tall screen has room for it lower down).
  const c = scene.add.container(width / 2, Math.max(150, scene.scale.height * 0.3), [box, t1, t2]).setDepth(20_000).setScrollFactor(0).setAlpha(0);
  return new Promise((resolve) => {
    scene.tweens.add({ targets: c, alpha: 1, duration: 300, hold: seconds * 1000, yoyo: true, onComplete: () => (c.destroy(), resolve()) });
  });
}

/** A round button with a label (Serve!, Blast) in screen space; `onTap` on click or tap. */
export function button(scene: Phaser.Scene, x: number, y: number, value: string, onTap: () => void, fill = COLORS.gold, color = COLORS.ink): Phaser.GameObjects.Container {
  const label = text(scene, 0, 0, value, 20, color).setOrigin(0.5);
  const w = Math.max(80, label.width + 30);
  const h = 48;
  const box = scene.add.graphics();
  box.fillStyle(0x000000, 0.3).fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 24);
  box.fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 24);
  const c = scene.add.container(x, y, [box, label]).setSize(w, h).setScrollFactor(0);
  c.setInteractive({ useHandCursor: true }).on('pointerup', onTap);
  return c;
}

/** The status bar: a place line and a value on the left, extra text and icon buttons on the right. */
export class StatusBar2D {
  private readonly place: Phaser.GameObjects.Text;
  private readonly value: Phaser.GameObjects.Text;
  private readonly right: Phaser.GameObjects.Text;
  /** The x where the next icon ends (icons fill from the right edge). */
  private edge: number;

  constructor(private readonly scene: Phaser.Scene, placeLabel: string) {
    const { width } = scene.scale;
    const bg = scene.add.graphics().setScrollFactor(0).setDepth(19_000);
    bg.fillStyle(COLORS.night, 0.82).fillRoundedRect(10, 8, width - 20, 52, 14);
    this.place = text(scene, 24, 13, placeLabel, 13, '#ffd84a').setScrollFactor(0).setDepth(19_001);
    this.value = text(scene, 24, 30, '', 20).setScrollFactor(0).setDepth(19_001);
    this.edge = width - 16;
    this.right = text(scene, this.edge - 8, 20, '', 22).setOrigin(1, 0).setScrollFactor(0).setDepth(19_001);
  }

  set(value: string, right: string): void {
    this.value.setText(value).setScale(1);
    this.right.setText(right);
    // A long value (a phone, many meters) shrinks into the room left of the right text.
    const room = this.right.x - this.right.width - 12 - this.value.x;
    if (room > 0 && this.value.width > room) this.value.setScale(room / this.value.width);
  }

  /** A small round button at the right end (the story book, the sound); returns its label. */
  icon(label: string, onTap: () => void): Phaser.GameObjects.Text {
    const r = 18;
    const x = this.edge - r;
    const disc = this.scene.add.circle(x, 34, r, 0xffffff, 0.14).setScrollFactor(0).setDepth(19_001);
    const t = text(this.scene, x, 34, label, 18).setOrigin(0.5).setScrollFactor(0).setDepth(19_002);
    disc.setInteractive({ useHandCursor: true }).on('pointerup', onTap);
    this.edge -= 2 * r + 6;
    this.right.setX(this.edge - 8);
    return t;
  }
}

/**
 * A word panel under the status bar, in screen space: a sentence to build (done words green, the
 * next word highlighted in Helper mode) or a label over one big word ("Find the meaning of" /
 * "brave"). `bottom` is the screen y under the panel, for the arena's free area.
 */
export class WordPanel2D {
  private box: Phaser.GameObjects.Container | null = null;
  bottom: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly y = 66,
  ) {
    this.bottom = y;
  }

  sentence(words: readonly string[], next: number, helper: boolean): void {
    const size = 20;
    const maxW = Math.min(this.scene.scale.width - 40, 640);
    const labels = words.map((w, k) => {
      const done = k < next;
      const t = text(this.scene, 0, 0, w, size, done ? '#2fa84f' : COLORS.ink).setOrigin(0, 0).setPadding(3, 1, 3, 1);
      if (!done && k === next && helper) t.setBackgroundColor('#ffe98a');
      return t;
    });
    // Lines of words, each line centered.
    const lines: Phaser.GameObjects.Text[][] = [[]];
    let x = 0;
    for (const t of labels) {
      if (x + t.width > maxW && lines[lines.length - 1]!.length) {
        lines.push([]);
        x = 0;
      }
      lines[lines.length - 1]!.push(t);
      x += t.width + 6;
    }
    const lineH = size + 12;
    const width = Math.max(...lines.map((l) => l.reduce((sum, t) => sum + t.width + 6, -6))) + 28;
    lines.forEach((line, i) => {
      let lx = -line.reduce((sum, t) => sum + t.width + 6, -6) / 2;
      for (const t of line) {
        t.setPosition(lx, 10 + i * lineH);
        lx += t.width + 6;
      }
    });
    this.show(labels, width, lines.length * lineH + 12);
  }

  target(label: string, value: string): void {
    const small = text(this.scene, 0, 8, label, 14, '#6a3fd1').setOrigin(0.5, 0);
    const big = text(this.scene, 0, 28, value, 26, COLORS.ink).setOrigin(0.5, 0);
    this.show([small, big], Math.max(small.width, big.width) + 40, 68);
  }

  hide(): void {
    this.box?.destroy();
    this.box = null;
    this.bottom = this.y;
  }

  private show(children: Phaser.GameObjects.GameObject[], width: number, height: number): void {
    this.box?.destroy();
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.3).fillRoundedRect(-width / 2, 4, width, height, 14);
    bg.fillStyle(COLORS.paper, 0.97).fillRoundedRect(-width / 2, 0, width, height, 14);
    this.box = this.scene.add.container(this.scene.scale.width / 2, this.y, [bg, ...children]).setScrollFactor(0).setDepth(18_500);
    this.bottom = this.y + height + 8;
  }
}
