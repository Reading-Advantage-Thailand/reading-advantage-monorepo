/**
 * The shared entry style of the sign-in and join pages (Phase 4, task 4.1, spec FR-A71,
 * AC-A71.11).
 *
 * The style file `app/entry.css` uses the existing Storytime tokens, one accent from the art,
 * and no remote font or image. Motion sits under `prefers-reduced-motion: no-preference`. The
 * locale layout imports the file once.
 *
 * At the base the first assertion fails on the missing file, because `app/entry.css` does not
 * exist. The CSS reader is the shared helper, so no case fails on a reader defect.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  lastDeclaration,
  lengthPx,
  parseCss,
  selectorEndsWith,
} from "./helpers/css-rules";

const APP = resolve(import.meta.dirname, "..");
const ENTRY_CSS = resolve(APP, "app/entry.css");
const LAYOUT = resolve(APP, "app/[locale]/layout.tsx");
const LOOK_CSS = resolve(APP, "app/look.css");
const GLOBALS_CSS = resolve(APP, "app/globals.css");
const MISSING_CSS = "Missing apps/storytime/app/entry.css";

/** Reads the entry style sheet after the existsSync assertion. */
function entryCss(): string {
  expect(existsSync(ENTRY_CSS), MISSING_CSS).toBe(true);
  const css = readFileSync(ENTRY_CSS, "utf8");
  expect(css.length, "the entry style is not empty").toBeGreaterThan(0);
  return css;
}

/** Collects every hex colour of one style sheet, lower-cased. */
function hexes(css: string): Set<string> {
  const found = new Set<string>();
  for (const match of css.toLowerCase().matchAll(/#[0-9a-f]{3,8}\b/g)) {
    found.add(match[0]);
  }
  return found;
}

/** Returns true when the media list holds a min-width 980px two-column change. */
function isDesktopGrid(media: string[]): boolean {
  return media.some((condition) => /min-width:\s*980px/.test(condition));
}

describe("entry css layout (red)", () => {
  it("L1 centres the shell at one column on a phone and two columns on a desktop", async () => {
    const css = entryCss();
    const rules = parseCss(css);
    expect(rules.length, "the entry style holds rules").toBeGreaterThan(0);
    const shell = (media: string[]) =>
      rules.filter(
        (rule) =>
          selectorEndsWith(rule.selector, ["[data-entry-shell]"]) &&
          (media.length === 0
            ? rule.media.length === 0
            : rule.media.some((condition) => media.includes(condition))),
      );
    const base = shell([]);
    expect(base.length, "the shell has a base rule").toBeGreaterThan(0);
    const maxWidth = lastDeclaration(
      rules,
      (rule) =>
        rule.media.length === 0 &&
        selectorEndsWith(rule.selector, ["[data-entry-shell]"]),
      "max-width",
    );
    expect(maxWidth, "the shell sets max-width").toBeDefined();
    const px = lengthPx(maxWidth?.value ?? "");
    console.log(`entry_shell_max_width=${maxWidth?.value ?? "none"}`);
    expect(px, "the shell max-width parses as pixels").not.toBeNull();
    expect(px ?? 0, "the shell is at most 1040 px wide").toBeLessThanOrEqual(1040);
    expect(px ?? 0, "the shell is at least 1000 px wide").toBeGreaterThanOrEqual(1000);
    const margin = lastDeclaration(
      rules,
      (rule) =>
        rule.media.length === 0 &&
        selectorEndsWith(rule.selector, ["[data-entry-shell]"]),
      "margin-inline",
    )?.value;
    expect(margin ?? "", "the shell is centred").toMatch(/auto/);
    const desktop = rules.filter(
      (rule) =>
        selectorEndsWith(rule.selector, ["[data-entry-shell]"]) &&
        rule.media.some((condition) => /min-width:\s*980px/.test(condition)),
    );
    expect(desktop.length, "the shell has a 980 px rule").toBeGreaterThan(0);
    const display = lastDeclaration(
      desktop,
      () => true,
      "display",
    )?.value;
    expect(display, "the desktop shell is a grid").toBe("grid");
    const columns = lastDeclaration(
      desktop,
      () => true,
      "grid-template-columns",
    )?.value;
    expect(columns ?? "", "the desktop shell has two column tracks").toMatch(
      /\S+\s+\S+/,
    );
    const baseGrid = lastDeclaration(
      rules,
      (rule) =>
        rule.media.length === 0 &&
        selectorEndsWith(rule.selector, ["[data-entry-shell]"]),
      "grid-template-columns",
    );
    expect(
      baseGrid?.value ?? "none",
      "the phone shell has no two-track grid",
    ).not.toMatch(/\S+\s+\S+/);
    expect(isDesktopGrid(desktop[0]?.media ?? []), "the helper reads the 980 px media").toBe(
      true,
    );
  });

  it("L2 keeps the labels readable and the tap targets thumb-size", async () => {
    const css = entryCss();
    const rules = parseCss(css);
    const field = rules.filter((rule) =>
      selectorEndsWith(rule.selector, ["[data-entry-field]"]),
    );
    expect(field.length, "the field has a rule").toBeGreaterThan(0);
    const fontSize = lastDeclaration(field, () => true, "font-size")?.value;
    const fontPx = lengthPx(fontSize ?? "");
    console.log(`entry_field_font_size=${fontSize ?? "none"}`);
    expect(fontPx, "the field font-size parses as pixels").not.toBeNull();
    expect(fontPx ?? 0, "the labels and fields are 18 px or more").toBeGreaterThanOrEqual(
      18,
    );
    const minHeight = lastDeclaration(field, () => true, "min-height")?.value;
    const heightPx = lengthPx(minHeight ?? "");
    expect(heightPx, "the field min-height parses as pixels").not.toBeNull();
    expect(heightPx ?? 0, "each input is 56 px or more high").toBeGreaterThanOrEqual(56);
    const primary = rules.filter((rule) =>
      selectorEndsWith(rule.selector, ["[data-entry-primary]"]),
    );
    expect(primary.length, "the primary button has a rule").toBeGreaterThan(0);
    expect(
      lastDeclaration(primary, () => true, "width")?.value,
      "the submit button is as wide as the card",
    ).toBe("100%");
    const primaryHeight = lengthPx(
      lastDeclaration(primary, () => true, "min-height")?.value ?? "",
    );
    expect(primaryHeight, "the primary min-height parses as pixels").not.toBeNull();
    expect(primaryHeight ?? 0, "the submit button is 56 px or more high").toBeGreaterThanOrEqual(
      56,
    );
  });

  it("L3 uses the existing tokens and no new font", async () => {
    const css = entryCss();
    const rules = parseCss(css);
    const allowed = new Set<string>();
    for (const file of [LOOK_CSS, GLOBALS_CSS]) {
      expect(existsSync(file), `Missing ${file}`).toBe(true);
      for (const hex of hexes(readFileSync(file, "utf8"))) allowed.add(hex);
    }
    expect(allowed.size, "the look holds token colours").toBeGreaterThan(0);
    const ownHexes = new Set<string>();
    for (const rule of rules) {
      for (const declaration of rule.declarations) {
        for (const match of declaration.value.matchAll(/#[0-9a-f]{3,8}\b/gi)) {
          ownHexes.add(match[0].toLowerCase());
        }
      }
    }
    console.log(`entry_hex_count=${ownHexes.size}`);
    for (const hex of ownHexes) {
      expect(allowed.has(hex), `the colour ${hex} comes from the existing tokens`).toBe(
        true,
      );
    }
    for (const rule of rules) {
      for (const declaration of rule.declarations) {
        if (declaration.property === "font-family") {
          expect(
            declaration.value,
            "the font comes from the existing faces",
          ).toMatch(/var\(--font-sans\)|var\(--sq-display\)|--font-display/);
        }
      }
    }
    expect(css, "the entry style adds no font file").not.toMatch(/@font-face/);
  });

  it("L4 loads no remote file", async () => {
    const css = entryCss();
    const urls = [...css.matchAll(/url\(\s*([^)]*?)\s*\)/gi)].map((match) => match[1]);
    console.log(`entry_url_count=${urls.length}`);
    for (const url of urls) {
      expect(url ?? "", "no remote url() in the entry style").not.toMatch(/^["']?https?:/i);
      expect(url ?? "", "no protocol-relative url()").not.toMatch(/^["']?\/\//);
    }
  });

  it("L5 moves only under no-preference", async () => {
    const css = entryCss();
    const rules = parseCss(css);
    const moving = rules.filter((rule) =>
      rule.declarations.some((declaration) =>
        ["transition", "animation"].includes(declaration.property),
      ),
    );
    console.log(`entry_moving_rules=${moving.length}`);
    for (const rule of moving) {
      expect(
        rule.media.join(" "),
        `the motion of ${rule.selector} sits under no-preference`,
      ).toMatch(/prefers-reduced-motion:\s*no-preference/);
    }
  });

  it("L6 imports the entry style once in the locale layout", async () => {
    expect(existsSync(ENTRY_CSS), MISSING_CSS).toBe(true);
    expect(existsSync(LAYOUT), "Missing apps/storytime/app/[locale]/layout.tsx").toBe(
      true,
    );
    const layout = readFileSync(LAYOUT, "utf8");
    const imports = layout.match(/import\s+["'][^"']*entry\.css["']/g) ?? [];
    console.log(`entry_css_imports=${imports.length}`);
    expect(imports.length, "the locale layout imports entry.css once").toBe(1);
  });

  it("L7 pins the show-password toggle tap area at 56 px or more", async () => {
    const css = entryCss();
    const rules = parseCss(css);
    const toggle = rules.filter((rule) =>
      selectorEndsWith(rule.selector, ["[data-password-toggle]"]),
    );
    expect(toggle.length, "the toggle has a rule").toBeGreaterThan(0);
    const minHeight = lastDeclaration(toggle, () => true, "min-height")?.value;
    const heightPx = lengthPx(minHeight ?? "");
    console.log(`entry_toggle_min_height=${minHeight ?? "none"}`);
    expect(heightPx, "the toggle min-height parses as pixels").not.toBeNull();
    expect(
      heightPx ?? 0,
      "the show-password toggle is 56 px or more high",
    ).toBeGreaterThanOrEqual(56);
  });
});
