/**
 * The prompt panel of the 2D view: the meaning of the sentence on top and the sentence below it
 * as blanks that fill in word by word (the 2D twin of the 3D prompt box and `sentenceBar`).
 */
import type * as Phaser from 'phaser';
import { COLORS, text } from '@reading-advantage/advantage-play-kit-3d/view2d';

export class PromptPanel2D {
  private box: Phaser.GameObjects.Container | null = null;
  /** Screen y of the panel's bottom edge (the status bar's bottom while nothing shows). */
  bottom: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly y = 66,
  ) {
    this.bottom = y;
  }

  /** Shows the prompt line and the sentence: `found` words are written, the rest are blanks (the next one marked in Helper mode). */
  set(label: string, prompt: string, words: readonly string[], found: number, helper: boolean): void {
    const scene = this.scene;
    const maxW = Math.min(scene.scale.width - 40, 640);
    const small = text(scene, 0, 8, label, 14, '#6a3fd1').setOrigin(0.5, 0);
    const big = text(scene, 0, 28, prompt, 22, COLORS.ink).setOrigin(0.5, 0);
    big.setWordWrapWidth(maxW - 28, true);
    const size = 22;
    const labels = words.map((w, k) => {
      const done = k < found;
      const shown = done ? w : '_'.repeat(Math.min(6, Math.max(3, w.length)));
      const t = text(scene, 0, 0, shown, size, done ? '#2fa84f' : '#b9a9cc').setOrigin(0, 0).setPadding(3, 1, 3, 1);
      if (!done && k === found && helper) t.setBackgroundColor('#ffe98a');
      return t;
    });
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
    const top = 30 + big.height + 6;
    const width = Math.max(small.width, big.width, ...lines.map((l) => l.reduce((sum, t) => sum + t.width + 6, -6))) + 40;
    lines.forEach((line, i) => {
      let lx = -line.reduce((sum, t) => sum + t.width + 6, -6) / 2;
      for (const t of line) {
        t.setPosition(lx, top + i * lineH);
        lx += t.width + 6;
      }
    });
    const height = top + lines.length * lineH + 8;
    this.box?.destroy();
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.3).fillRoundedRect(-width / 2, 4, width, height, 14);
    bg.fillStyle(COLORS.paper, 0.97).fillRoundedRect(-width / 2, 0, width, height, 14);
    this.box = scene.add.container(scene.scale.width / 2, this.y, [bg, small, big, ...labels]).setScrollFactor(0).setDepth(18_500);
    this.bottom = this.y + height;
  }

  hide(): void {
    this.box?.destroy();
    this.box = null;
    this.bottom = this.y;
  }
}
