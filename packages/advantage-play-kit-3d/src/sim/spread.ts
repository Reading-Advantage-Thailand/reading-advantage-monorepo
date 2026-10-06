/**
 * Moves overlapping screen labels apart so each word stays readable (the HTML HUD labels and the
 * 2D tags): a portrait phone squeezes a wide scene, and the words over items, enemies, and gates
 * (or a stack of pinned labels at one screen edge) land on top of each other. Each label moves up
 * or down only, as little as it can; labels higher on the screen keep their place first.
 */
export interface SpreadBox {
  /** The anchor: the box is centered on x and hangs above y (the bottom middle of the label). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** The highest and the lowest anchor y the box may move to. */
  minY: number;
  maxY: number;
}

/** The space kept between two labels, in CSS pixels. */
export const SPREAD_GAP = 3;

/** The anchor y of each box after the spread, in the input order. */
export function spreadBoxes(boxes: readonly SpreadBox[]): number[] {
  const out = boxes.map((b) => b.y);
  const order = boxes.map((_, i) => i).sort((a, b) => boxes[a]!.y - boxes[b]!.y || a - b);
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  for (const i of order) {
    const b = boxes[i]!;
    const near = placed.filter((p) => Math.abs(p.x - b.x) < (p.w + b.w) / 2 + SPREAD_GAP);
    const free = (y: number): boolean => near.every((p) => y - b.h >= p.y + SPREAD_GAP || y + SPREAD_GAP <= p.y - p.h);
    const lo = Math.min(b.minY, b.y);
    const hi = Math.max(b.maxY, b.y);
    const options = [b.y, ...near.flatMap((p) => [p.y - p.h - SPREAD_GAP, p.y + b.h + SPREAD_GAP])].filter((y) => y >= lo && y <= hi && free(y));
    const y = options.length > 0 ? options.reduce((best, y) => (Math.abs(y - b.y) < Math.abs(best - b.y) ? y : best)) : b.y;
    out[i] = y;
    placed.push({ x: b.x, y, w: b.w, h: b.h });
  }
  return out;
}
