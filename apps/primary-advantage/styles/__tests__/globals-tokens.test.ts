import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(__dirname, "../globals.css"), "utf8");

/**
 * Reads the custom properties declared directly in one top-level rule.
 * @param selector The exact selector, for example ":root" or ".dark".
 * @returns The property map without the leading dashes.
 */
function block(selector: string): Record<string, string> {
  const start = css.search(new RegExp(`(^|\\n)${selector.replace(".", "\\.")}\\s*\\{`));
  expect(start, `${selector} block`).toBeGreaterThanOrEqual(0);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("\n}", start));
  const props: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) props[name] = value.trim();
  return props;
}

const root = block(":root");
const dark = block(".dark");

/**
 * Resolves a token to a color value through var() references.
 * @param name The token name without dashes.
 * @param theme The theme map to read first (falls back to :root).
 * @returns The color text.
 */
function resolve(name: string, theme: Record<string, string>): string {
  const value = theme[name] ?? root[name];
  expect(value, `--${name}`).toBeDefined();
  const ref = value.match(/^var\(--([\w-]+)\)$/);
  return ref ? resolve(ref[1], theme) : value;
}

/**
 * Converts an sRGB channel (0-1) to linear light.
 * @param c The gamma-encoded channel.
 * @returns The linear channel.
 */
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/**
 * Computes the WCAG relative luminance of a hex or oklch() color.
 * @param color The color text.
 * @returns The luminance from 0 to 1.
 */
function luminance(color: string): number {
  let rgb: number[];
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  const ok = color.match(/^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/);
  if (hex) {
    rgb = [0, 2, 4].map((i) => linear(parseInt(hex[1].slice(i, i + 2), 16) / 255));
  } else if (ok) {
    const [L, C, h] = ok.slice(1).map(Number);
    const a = C * Math.cos((h * Math.PI) / 180);
    const b = C * Math.sin((h * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    rgb = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ].map((c) => Math.min(1, Math.max(0, c)));
  } else {
    throw new Error(`unsupported color ${color}`);
  }
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/**
 * Computes the WCAG contrast ratio of two tokens in one theme.
 * @param fg The text token.
 * @param bg The background token.
 * @param theme The theme map.
 * @returns The contrast ratio.
 */
function contrast(fg: string, bg: string, theme: Record<string, string>): number {
  const [a, b] = [luminance(resolve(fg, theme)), luminance(resolve(bg, theme))].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

describe("Primary design tokens (FR-1)", () => {
  it("ports the Tutor brand, surface, text, motion, and nav tokens", () => {
    const names = [
      ...[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => `brand-${n}`),
      "surface-bg", "surface-card", "surface-elevated", "surface-nav", "surface-border",
      "text-primary", "text-secondary", "text-tertiary",
      "duration-fast", "duration-normal", "duration-slow",
      "nav-glass-bg", "nav-glass-border", "nav-active-bg", "safe-bottom",
    ];
    for (const name of names) expect(root, `--${name}`).toHaveProperty(name);
    for (const name of ["surface-bg", "surface-card", "text-tertiary", "nav-glass-bg", "brand-50"]) {
      expect(dark, `.dark --${name}`).toHaveProperty(name);
    }
    for (const token of ["--shadow-green:", "--ease-spring:", "--ease-smooth:", "--color-brand-700:"]) {
      expect(css).toContain(token);
    }
  });

  it("uses brand green, not neutral black, for the shadcn primary", () => {
    expect(resolve("primary", root)).toBe("#047d36");
    expect(resolve("primary", dark)).toBe(resolve("brand-400", dark));
  });

  it.each([
    ["primary-foreground", "primary"],
    ["foreground", "background"],
    ["muted-foreground", "background"],
    ["muted-foreground", "muted"],
    ["text-secondary", "surface-card"],
    ["text-tertiary", "surface-card"],
    ["text-tertiary", "surface-bg"],
    ["sidebar-primary-foreground", "sidebar-primary"],
    ["destructive-foreground", "destructive"],
  ])("%s on %s passes WCAG AA in light and dark", (fg, bg) => {
    expect(contrast(fg, bg, root)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(fg, bg, dark)).toBeGreaterThanOrEqual(4.5);
  });

  it("gives every animation a keyframe with the same name", () => {
    const used = [...css.matchAll(/animation:\s*([\w-]+)/g)].map((m) => m[1]);
    expect(used).toContain("glow");
    for (const name of used) expect(css, `@keyframes ${name}`).toMatch(new RegExp(`@keyframes ${name}\\s*\\{`));
  });

  it("loads fonts through next/font only; Noto Sans Thai comes first, then Inter (owner decision 2026-10-05)", () => {
    expect(css).not.toMatch(/--font-geist|fonts\.googleapis/);
    // The Thai face loads only the Thai subset, so Latin text falls through to Inter.
    expect(css).toMatch(/--font-sans:\s*var\(--font-noto-thai\),\s*var\(--font-inter\)/);
  });

  it("defines one bottom-nav height token that includes the device safe area", () => {
    expect(root["bottom-nav-h"]).toMatch(/var\(--safe-bottom\)|safe-area-inset-bottom/);
  });

  it("turns off motion for users who ask for reduced motion", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*animation-duration/);
  });
});
