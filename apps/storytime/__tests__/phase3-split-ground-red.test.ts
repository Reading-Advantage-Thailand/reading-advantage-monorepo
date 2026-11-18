/**
 * Task 3.2 Red: the split ground layer (PM decision 2026-11-18).
 *
 * The ground layer gets its own small file. It shows at blur(6px).
 * The sharp hero header stays unchanged. The real first load with the
 * place pictures is at most 300000 bytes.
 *
 * The budget: the recorded first load without the two place pictures is
 * 284270 bytes (plan 3.1 note). Each ground file holds at most
 * 300000 - 284270 = 15730 bytes, so one ground file fits the budget.
 * One file loads per orientation, so the cap is per file.
 *
 * At the base this file fails: the ground still names meadow-p.webp, no
 * ground file exists, and the gate asserts no with-places row. The hero
 * rule and the blur rule pass here as characterization.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCss } from "./helpers/css-rules";

const app = resolve(import.meta.dirname, "..");
const repoRoot = resolve(app, "..", "..");
const lookCssPath = resolve(app, "app/look.css");
const placesDir = resolve(app, "app/look/places");
const gatePath = resolve(app, "__tests__/phase3-browser-gate.sh");

/** The role base that the split starts from. */
const ROLE_BASE = "9619b9548";
/** The recorded first load without the two place pictures, in bytes. */
const FIRST_LOAD_WITHOUT_PLACES_BYTES = 284270;
/** The first-load budget, in bytes. */
const FIRST_LOAD_BUDGET_BYTES = 300000;
/** Each ground file holds at most 300000 - 284270 bytes. */
const GROUND_FILE_BYTES_MAX = FIRST_LOAD_BUDGET_BYTES - FIRST_LOAD_WITHOUT_PLACES_BYTES;
const HERO_IMAGES = ["meadow-p.webp", "path-p.webp"] as const;

/**
 * Reads the style sheet text with a named assertion when absent.
 * @returns The style sheet text.
 */
function readLookCss(): string {
  expect(existsSync(lookCssPath), "Missing apps/storytime/app/look.css").toBe(true);
  return readFileSync(lookCssPath, "utf8");
}

/**
 * Reads the base revision of a repository path with git.
 * @param path The repository-relative path.
 * @returns The base bytes.
 */
function readBaseBytes(path: string): Buffer {
  return execFileSync("git", ["show", `${ROLE_BASE}:${path}`], {
    cwd: repoRoot,
    encoding: "buffer",
    maxBuffer: 8 * 1024 * 1024,
  }) as Buffer;
}

/**
 * Reports whether one rule paints the ground layer.
 * @param selector The selector list text.
 * @returns True when the rule targets the place ground.
 */
function isGroundRule(selector: string): boolean {
  return selector.includes("[data-place") && selector.includes("::before");
}
function groundImages(css: string): string[] {
  const found: string[] = [];
  for (const rule of parseCss(css)) {
    if (rule.keyframes) continue;
    if (!isGroundRule(rule.selector)) continue;
    for (const declaration of rule.declarations) {
      if (declaration.property !== "background-image") continue;
      for (const match of declaration.value.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        found.push(match[1]!);
      }
    }
  }
  return found;
}

/**
 * Checks the ground contract of one style sheet.
 * @param css The style sheet text.
 * @returns The failure messages.
 */
function checkGround(css: string): string[] {
  const failures: string[] = [];
  const images = groundImages(css);
  if (images.length === 0) failures.push("no ground background-image");
  for (const url of images) {
    if (url.includes("meadow-p") || url.includes("path-p")) {
      failures.push(`ground names a hero picture: ${url}`);
    }
    if (!url.includes("ground-")) {
      failures.push(`ground misses its own file: ${url}`);
    }
  }
  return failures;
}

/**
 * Reads the filter of the top-level ground rule.
 * @param css The style sheet text.
 * @returns The filter value, or an empty string when absent.
 */
function groundFilter(css: string): string {
  let value = "";
  for (const rule of parseCss(css)) {
    if (rule.keyframes || rule.media.length > 0) continue;
    if (!isGroundRule(rule.selector)) continue;
    for (const declaration of rule.declarations) {
      if (declaration.property === "filter") value = declaration.value;
    }
  }
  return value;
}

/**
 * Reads the top-level hero header rule of one style sheet.
 * @param css The style sheet text.
 * @returns The rule text, or null when absent.
 */
function heroRule(css: string): string | null {
  const start = css.indexOf("header[data-hero] {");
  if (start < 0) return null;
  const end = css.indexOf("}", start);
  return end < 0 ? null : css.slice(start, end + 1);
}

describe("task 3.2 split ground layer (Red)", () => {
  it("states the ground budget as a labeled integer", () => {
    expect(`ground_budget_bytes=${GROUND_FILE_BYTES_MAX}`).toBe("ground_budget_bytes=15730");
    expect(GROUND_FILE_BYTES_MAX).toBe(
      FIRST_LOAD_BUDGET_BYTES - FIRST_LOAD_WITHOUT_PLACES_BYTES,
    );
  });

  it("G1 the ground layer uses its own file, not meadow-p or path-p", () => {
    const images = groundImages(readLookCss());
    expect(`ground_images_found=${images.length}`).toMatch(/^ground_images_found=[1-9][0-9]*$/);
    expect(checkGround(readLookCss())).toEqual([]);
  });

  it("G2 the ground layer keeps blur(6px)", () => {
    expect(groundFilter(readLookCss()), "the ground filter").toContain("blur(6px)");
  });

  it("H1 the hero header rule is byte-identical to the role base", () => {
    const base = readBaseBytes("apps/storytime/app/look.css").toString("utf8");
    expect(heroRule(readLookCss()), "the hero header rule").toBe(heroRule(base));
  });

  it("H2 the hero pictures are byte-identical to the role base", () => {
    expect(`hero_images_checked=${HERO_IMAGES.length}`).toBe("hero_images_checked=2");
    for (const name of HERO_IMAGES) {
      const path = resolve(placesDir, name);
      expect(existsSync(path), `Missing ${name}`).toBe(true);
      const base = readBaseBytes(`apps/storytime/app/look/places/${name}`);
      expect(readFileSync(path).equals(base), `${name} differs from ${ROLE_BASE}`).toBe(true);
    }
  });

  it("C1 each ground file exists and holds at most 15730 bytes", () => {
    const names = existsSync(placesDir)
      ? readdirSync(placesDir).filter((name) => name.startsWith("ground-"))
      : [];
    expect(`ground_files_found=${names.length}`).toMatch(/^ground_files_found=[1-9][0-9]*$/);
    expect(names.length, "the split ships at least one ground file").toBeGreaterThan(0);
    for (const name of names) {
      const bytes = statSync(resolve(placesDir, name)).size;
      expect(bytes, `ground_file_bytes_${name}=${bytes}`).toBeLessThanOrEqual(GROUND_FILE_BYTES_MAX);
    }
  });

  it("D1 the browser gate asserts with-places first load at most 300000 bytes", () => {
    expect(existsSync(gatePath), "Missing phase3-browser-gate.sh").toBe(true);
    const gate = readFileSync(gatePath, "utf8");
    expect(gate).toContain("transferred_bytes_first_load_with_place_pictures");
    expect(gate, "the gate asserts withPlaces <= 300000").toMatch(/withPlaces\s*<=\s*300000/);
  });

  it("fails the broken copies (falsification)", () => {
    const good = `
main[data-place]::before { filter: blur(6px); }
main[data-place="meadow"]::before { background-image: url("look/places/ground-p.webp"); }
header[data-hero] { background-color: #2b6a3a; }
`;
    expect(checkGround(good)).toEqual([]);
    const hero = good.replace("ground-p.webp", "meadow-p.webp");
    expect(checkGround(hero), "a ground that names meadow-p fails G1").not.toEqual([]);
    const path = good.replace("ground-p.webp", "path-p.webp");
    expect(checkGround(path), "a ground that names path-p fails G1").not.toEqual([]);
    const noFile = good.replace('background-image: url("look/places/ground-p.webp");', "");
    expect(checkGround(noFile), "a ground without an image fails G1").not.toEqual([]);
    const noBlur = groundFilter(good.replace("blur(6px)", "blur(0px)"));
    expect(noBlur, "a ground without blur(6px) fails G2").not.toContain("blur(6px)");
    expect(
      "transferred_bytes_first_load_with_place_pictures=${m.withPlaces}\nok: m.withoutPlaces <= 300000",
      "a gate without the withPlaces row fails D1",
    ).not.toMatch(/withPlaces\s*<=\s*300000/);
  });
});
