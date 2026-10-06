/**
 * Pure easing and interpolation helpers for views. Every function takes a progress `t` in
 * [0, 1] (clamped) and returns a number; none reads time or the DOM.
 */

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export const clamp01 = (v: number): number => clamp(v, 0, 1);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** The `t` in [0, 1] at which `lerp(a, b, t)` equals `v` (0 when a equals b). */
export const inverseLerp = (a: number, b: number, v: number): number =>
  a === b ? 0 : clamp01((v - a) / (b - a));

/** Maps `v` from [inLo, inHi] to [outLo, outHi], clamped to the input range. */
export const remap = (v: number, inLo: number, inHi: number, outLo: number, outHi: number): number =>
  lerp(outLo, outHi, inverseLerp(inLo, inHi, v));

export const smoothstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

export const easeInQuad = (t: number): number => {
  const x = clamp01(t);
  return x * x;
};

export const easeOutQuad = (t: number): number => {
  const x = clamp01(t);
  return 1 - (1 - x) * (1 - x);
};

export const easeInOutQuad = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
};

export const easeOutCubic = (t: number): number => 1 - (1 - clamp01(t)) ** 3;

export const easeInOutCubic = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};

/** Overshoots past 1 near the end, then settles (pops, cards landing). */
export const easeOutBack = (t: number): number => {
  const x = clamp01(t);
  const c1 = 1.70158;
  return 1 + (c1 + 1) * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};

/** A bounce that fades: 0 at both ends, peaks near 0.3 (hit reactions, jiggles). */
export const bounce = (t: number): number => {
  const x = clamp01(t);
  return Math.sin(Math.PI * x) * (1 - x);
};

/**
 * Frame-rate independent smoothing toward `target`: the remaining distance shrinks by
 * `exp(-lambda * dtSeconds)`. `lambda` around 8 to 12 feels snappy, 2 to 4 lazy.
 */
export const damp = (current: number, target: number, lambda: number, dtSeconds: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * Math.max(0, dtSeconds)));

/** The shortest signed difference from `a` to `b` in degrees, in (-180, 180]. */
export const angleDelta = (a: number, b: number): number => {
  const d = (((b - a) % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
};

/** Interpolates angles in degrees along the shortest arc. */
export const lerpAngle = (a: number, b: number, t: number): number => a + angleDelta(a, b) * t;

/** A triangle wave in [0, 1]: 0 at t = 0, 1 at t = 0.5, 0 at t = 1 (for `t` in any range). */
export const pingPong = (t: number): number => {
  const x = t - Math.floor(t);
  return x < 0.5 ? x * 2 : 2 - x * 2;
};
