// Finding F121 (review-c C3-1) of the Phase 3 review at e9c1908fd: the current-word pair of the
// read-along highlight must reach the 4.5:1 contrast floor of test-strategy P3.6 for 18 px
// non-bold text. The test maps the Tailwind classes of HIGHLIGHT_CLASSES.currentWord to their
// standard palette colors and computes the WCAG 2 contrast ratio of each pair, light and dark.
import { describe, expect, it } from "vitest";
import { HIGHLIGHT_CLASSES } from "../highlight";

/** The standard Tailwind palette colors that the highlight classes name. */
const TOKEN_HEX: Record<string, string> = {
  // The brand brown of the current word (remediation r2, finding P-1).
  "bg-[#92400e]": "#92400e",
  // The dark pair of the current word: amber with a brown label (finding P-1).
  "bg-[#fcd34d]": "#fcd34d",
  "text-[#92400e]": "#92400e",
  "bg-blue-500": "#3b82f6",
  "bg-blue-700": "#1d4ed8",
  "bg-blue-400": "#60a5fa",
  "text-white": "#ffffff",
  "text-blue-950": "#172554",
};

/** The contrast floor for 18 px non-bold text (test-strategy P3.6). */
const MIN_RATIO = 4.5;

/**
 * Gives the relative luminance of one hex color (WCAG 2).
 * @param hex The color as #rrggbb.
 * @returns The luminance from 0 to 1.
 */
function luminance(hex: string): number {
  const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(1 + offset, 3 + offset), 16) / 255);
  const scaled = channels.map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * scaled[0]! + 0.7152 * scaled[1]! + 0.0722 * scaled[2]!;
}

/**
 * Gives the WCAG 2 contrast ratio of two colors.
 * @param first One hex color.
 * @param other The other hex color.
 * @returns The ratio from 1 to 21.
 */
function contrastRatio(first: string, other: string): number {
  const a = luminance(first);
  const b = luminance(other);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * Gives the background and text classes of one highlight pair.
 * @param classes The class list of one highlight state.
 * @returns The background class and the text class, without the `dark:` prefix.
 */
function pairOf(classes: readonly string[]): { background: string; text: string } {
  const bare = classes.map((entry) => entry.replace(/^dark:/, ""));
  const background = bare.find((entry) => entry.startsWith("bg-"));
  const text = bare.find((entry) => entry.startsWith("text-"));
  expect(background, `the pair holds no background class: ${classes.join(" ")}`).toBeTruthy();
  expect(text, `the pair holds no text class: ${classes.join(" ")}`).toBeTruthy();
  expect(TOKEN_HEX[background!], `the palette table misses ${background}`).toBeDefined();
  expect(TOKEN_HEX[text!], `the palette table misses ${text}`).toBeDefined();
  return { background: background!, text: text! };
}

describe("the current-word highlight contrast", () => {
  it.each([
    ["light", HIGHLIGHT_CLASSES.currentWord.split(" ").filter((entry) => !entry.startsWith("dark:"))],
    ["dark", HIGHLIGHT_CLASSES.currentWord.split(" ").filter((entry) => entry.startsWith("dark:"))],
  ])("reaches 4.5:1 in the %s pair", (mode, classes) => {
    const { background, text } = pairOf(classes);
    const ratio = contrastRatio(TOKEN_HEX[text]!, TOKEN_HEX[background]!);
    expect(
      ratio,
      `the current-word ${mode} pair (${text} on ${background}) measures ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(MIN_RATIO);
  });

  it("the current word is the brand brown with white text and no blue (finding P-1)", () => {
    const classes = HIGHLIGHT_CLASSES.currentWord.split(" ");
    expect(classes, "the current word must name the brown background").toContain("bg-[#92400e]");
    expect(classes, "the current word must name white text").toContain("text-white");
    const blue = classes.filter((entry) => /blue/.test(entry));
    expect(blue, "the current word must hold no blue class").toEqual([]);
    const ratio = contrastRatio(TOKEN_HEX["text-white"]!, TOKEN_HEX["bg-[#92400e]"]!);
    expect(ratio, "the brown and white pair must reach 4.5:1").toBeGreaterThanOrEqual(MIN_RATIO);
  });
});
