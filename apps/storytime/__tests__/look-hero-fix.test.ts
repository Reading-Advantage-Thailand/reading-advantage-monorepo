/**
 * Tasks 2.2 and 2.3a to 2.3c: the three pinned hero heights of option 1 (AC-2.6 to AC-2.8; plan
 * 2.3a, 2.3b, 2.3c; strategy P2.2 H1 to H5).
 *
 * This is an artifact test: it reads the rules of `app/look.css`. It pins the CSS value (a pixel
 * height, no relative unit). The measured height and the first view (92 to 100, 116 to 124, and
 * 220 to 240) are two other checks, and the browser gate `look-phase2-browser-gate.sh` runs them.
 * A pin read from the CSS is not a measure.
 *
 * At the base `app/look.css` does not exist, so H1 to H4 fail with a named assertion. H5 is the
 * named characterization case: the three pins lie inside their ranges and each range differs from
 * its pin. The parser self-test and the broken-copy cases test the checks, not the file.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  lastDeclaration,
  parseCss,
  selectorEndsWith,
  type CssRule,
} from "./helpers/css-rules";

const app = resolve(import.meta.dirname, "..");
const lookCssPath = resolve(app, "app/look.css");

/** The last compounds that name the song stage of a portrait phone. */
const SONG_STAGE = ['.song-stage[data-phone="true"]'];
/** The last compounds that name the hero band. */
const HERO_BAND = ['[data-hero="band"]', 'header[data-hero="band"]'];
/** The one media condition of the tablet and wider screens (Q26). */
const WIDE = "(min-width: 640px)";

/** The CSS pins and the measured ranges of the three hero fixes. */
const PINS: Record<string, { pin: number; range: readonly [number, number] }> = {
  song: { pin: 220, range: [220, 240] },
  phone: { pin: 96, range: [92, 100] },
  tablet: { pin: 120, range: [116, 124] },
};

/** The units that move a pixel pin (H4). */
const MOVING_UNIT = /(\d(rem|em|vh|dvh|svh|lvh|%)(?![a-z]))|calc\(|clamp\(|min\(|max\(|var\(/i;

/**
 * Reads the `look.css` text with a named assertion when the file is absent.
 * @returns The style sheet text.
 */
function readLookCss(): string {
  expect(existsSync(lookCssPath), "Missing apps/storytime/app/look.css").toBe(true);
  return readFileSync(lookCssPath, "utf8");
}

/**
 * Finds the last `height` declaration of a hook in the rules that sit outside any media block.
 * @param rules The parsed rules.
 * @param targets The last compounds of the hook.
 * @param media The exact media stack, or an empty list for the top level.
 * @returns The declaration or `undefined`.
 */
function heightIn(rules: readonly CssRule[], targets: readonly string[], media: readonly string[]) {
  return lastDeclaration(
    rules,
    (rule) =>
      selectorEndsWith(rule.selector, targets) &&
      rule.media.length === media.length &&
      rule.media.every((entry, index) => entry === media[index]),
    "height",
  );
}

/**
 * H1: the song stage of a phone is 220 px high at the top level.
 * @param css The style sheet text.
 * @returns A failure message, or `null` when the check holds.
 */
function checkSongStage(css: string): string | null {
  const declaration = heightIn(parseCss(css), SONG_STAGE, []);
  if (!declaration) return "no height for .song-stage[data-phone=true] outside a media block";
  if (declaration.important) return "the song stage height uses !important";
  return declaration.value === "220px" ? null : `song stage height is ${declaration.value}`;
}

/**
 * H2: the hero band is 96 px high at the top level.
 * @param css The style sheet text.
 * @returns A failure message, or `null` when the check holds.
 */
function checkBandPhone(css: string): string | null {
  const declaration = heightIn(parseCss(css), HERO_BAND, []);
  if (!declaration) return "no height for [data-hero=band] outside a media block";
  if (declaration.important) return "the band height uses !important";
  return declaration.value === "96px" ? null : `band height is ${declaration.value}`;
}

/**
 * H3: the hero band is 120 px high inside `(min-width: 640px)`.
 * @param css The style sheet text.
 * @returns A failure message, or `null` when the check holds.
 */
function checkBandTablet(css: string): string | null {
  const declaration = heightIn(parseCss(css), HERO_BAND, [WIDE]);
  if (!declaration) return `no height for [data-hero=band] inside ${WIDE}`;
  if (declaration.important) return "the tablet band height uses !important";
  return declaration.value === "120px" ? null : `tablet band height is ${declaration.value}`;
}

/**
 * H4: no `height` declaration of the three hooks uses a unit that moves the pin.
 * @param css The style sheet text.
 * @returns The failure messages.
 */
function checkNoMovingUnit(css: string): string[] {
  const failures: string[] = [];
  for (const rule of parseCss(css)) {
    if (rule.keyframes) continue;
    if (!selectorEndsWith(rule.selector, [...SONG_STAGE, ...HERO_BAND])) continue;
    for (const declaration of rule.declarations) {
      if (declaration.property === "height" && MOVING_UNIT.test(declaration.value)) {
        failures.push(`${rule.selector} height ${declaration.value}`);
      }
    }
  }
  return failures;
}

/** A style sheet that holds the three pins, a comment, and a string with a brace. */
const GOOD_CSS = `
/* a comment with { braces } and height: 1px; */
.song-stage[data-phone="true"] { height: 220px; }
header[data-hero="band"] { height: 96px; content: "}"; }
@media (min-width: 640px) {
  header[data-hero="band"] { height: 120px; }
}
@media (max-height: 500px) and (orientation: landscape) {
  header[data-hero="band"] { height: 84px; }
}
`;

describe("look.css hero heights (AC-2.6 to AC-2.8)", () => {
  it("parses nested media blocks, comments, and braces in strings (self-test)", () => {
    const rules = parseCss(GOOD_CSS);
    expect(`rules_parsed=${rules.length}`).toMatch(/^rules_parsed=[1-9][0-9]*$/);
    expect(rules.length, "the parser must find the four rules of the fixture").toBe(4);
    const wide = rules.filter((rule) => rule.media.length === 1 && rule.media[0] === WIDE);
    expect(wide.length, "one rule sits inside (min-width: 640px)").toBe(1);
    const landscape = rules.find((rule) => rule.media.some((entry) => entry.includes("max-height")));
    expect(landscape?.declarations[0]?.value, "the landscape rule keeps its own height").toBe("84px");
    expect(
      rules.some((rule) => rule.declarations.some((declaration) => declaration.value === "1px")),
      "a declaration inside a comment is not a declaration",
    ).toBe(false);
    expect(checkSongStage(GOOD_CSS)).toBeNull();
    expect(checkBandPhone(GOOD_CSS), "the landscape 84 px block must not hide the 96 px pin").toBeNull();
    expect(checkBandTablet(GOOD_CSS)).toBeNull();
    expect(checkNoMovingUnit(GOOD_CSS)).toEqual([]);
  });

  it("H1 the song stage of a phone is 220px high (AC-2.6)", () => {
    expect(checkSongStage(readLookCss())).toBeNull();
  });

  it("H2 the hero band is 96px high below 640px (AC-2.7)", () => {
    expect(checkBandPhone(readLookCss())).toBeNull();
  });

  it("H3 the hero band is 120px high from 640px of width (AC-2.8)", () => {
    expect(checkBandTablet(readLookCss())).toBeNull();
  });

  it("H4 no hero height uses rem, em, vh, dvh, calc, or clamp", () => {
    expect(checkNoMovingUnit(readLookCss())).toEqual([]);
  });

  it("H5 each pin lies inside its measured range and each range differs from its pin", () => {
    const entries = Object.entries(PINS);
    expect(`pins_checked=${entries.length}`).toBe("pins_checked=3");
    for (const [name, { pin, range }] of entries) {
      expect(pin >= range[0] && pin <= range[1], `${name} pin ${pin} must lie in ${range.join(" to ")}`).toBe(true);
      expect(range[0] === pin && range[1] === pin, `${name} range must not equal its pin`).toBe(false);
    }
  });

  it("fails the broken copies (falsification)", () => {
    const remHeight = GOOD_CSS.replace("height: 220px", "height: 13.75rem");
    expect(checkSongStage(remHeight), "13.75rem is not the 220px pin").not.toBeNull();
    expect(checkNoMovingUnit(remHeight), "H4 names the rem height").not.toEqual([]);
    const oldBand = GOOD_CSS.replace('height: 96px; content: "}";', 'height: 172px; content: "}";');
    expect(checkBandPhone(oldBand), "172px is not the 96px pin").not.toBeNull();
    const wrongTablet = GOOD_CSS.replace("height: 120px", "height: 200px");
    expect(checkBandTablet(wrongTablet), "a tablet block set to 200 fails H3").not.toBeNull();
    const important = GOOD_CSS.replace("height: 220px", "height: 220px !important");
    expect(checkSongStage(important), "!important fails H1").not.toBeNull();
    const media = GOOD_CSS.replace(
      '.song-stage[data-phone="true"] { height: 220px; }',
      '@media (max-width: 400px) { .song-stage[data-phone="true"] { height: 220px; } }',
    );
    expect(checkSongStage(media), "a height inside a media block is not the top-level pin").not.toBeNull();
  });
});
