/**
 * The 2D camera shared by the baked backgrounds (scripts/apk2d-bake.ts) and the forge sprites
 * (scripts/apk2d-sprites.ts): orthographic, azimuth 0 (looking from +Z toward -Z), elevation E,
 * `ppm` pixels per meter. A world point (x, y, z) is at u = x, v = y cos E - z sin E (meters), and
 * at the background pixel ((u - uMin) ppm, (vMax - v) ppm). Pure: no DOM, no Phaser.
 */
export interface Projection2D {
  /** Degrees. */
  elevation: number;
  ppm: number;
  uMin: number;
  vMax: number;
  /** The background size in pixels. */
  width: number;
  height: number;
}

export interface Point2D {
  x: number;
  y: number;
}

/** The background pixel of a world point. */
export function project(p: Projection2D, x: number, y: number, z: number): Point2D {
  const e = (p.elevation * Math.PI) / 180;
  const v = y * Math.cos(e) - z * Math.sin(e);
  return { x: (x - p.uMin) * p.ppm, y: (p.vMax - v) * p.ppm };
}

/** Draw order for a thing standing at depth z (nearer the camera = larger z = drawn later). */
export const depthOf = (z: number, y = 0): number => z * 1000 + y;

/**
 * The sprite sheet row for a movement or facing direction on the ground (dx, dz), for sheets
 * rendered by the forge: row 0 faces the camera (+Z), and each next row turns by 360/dirs degrees
 * counterclockwise seen from above (the forge's camera azimuth order).
 */
export function directionRow(dx: number, dz: number, dirs: 1 | 4 | 8): number {
  if (dirs === 1 || (dx === 0 && dz === 0)) return 0;
  // Facing angle about +Y: 0 = +Z (toward the camera), +90 degrees = +X (screen right). The forge
  // turns its camera, not the model, so row i shows the model facing -i steps: row 1 (SW) is a
  // model facing (-X, +Z), row 2 (W) one facing -X, row 6 (E) one facing +X.
  const facing = Math.atan2(dx, dz);
  const step = (2 * Math.PI) / dirs;
  return ((Math.round(-facing / step) % dirs) + dirs) % dirs;
}

/** Row order names of forge sheets (8 directions); a 4-direction sheet uses every second one. */
export const DIRECTION_NAMES_8 = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'] as const;

/**
 * The game size of a 2D view in game pixels: 480 across the short side of the screen, the long
 * side from the screen's aspect (so FIT scaling leaves no wide bars), within limits a layout can
 * handle. A 2D view calls it in `createGameConfig` (the APK factory then replaces the size with
 * the safe rect when it has a responsive composition).
 */
export function fitGameSize(vw = typeof innerWidth === 'number' ? innerWidth : 390, vh = typeof innerHeight === 'number' ? innerHeight : 844, short = 480): [number, number] {
  const clamp = (v: number, lo: number, hi: number): number => Math.round(Math.min(hi, Math.max(lo, v)));
  return vh > vw ? [short, clamp((short * vh) / vw, short * 1.5, short * 2)] : [clamp((short * vw) / vh, short * 1.33, short * 2.08), short];
}
