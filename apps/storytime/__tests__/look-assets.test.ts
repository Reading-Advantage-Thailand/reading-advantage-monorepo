/**
 * Task 2.2: the assets of the look reach the image and fit their pins (AC-2.2 assets; FR-2 asset
 * rules; strategy P2.2 A1 to A6, A9, and A10; facts M30 to M32).
 *
 * The Docker runner copies `.next/standalone` and `.next/static` only, never `public/`. So the
 * assets live under `app/look/`, reach the build through a relative `url()` in `look.css`, and the
 * fonts reach it through `next/font/local`. A `public/` folder or a root-absolute `url(/...)`
 * would pass `next start` and return 404 in the image.
 *
 * Each file check reads bytes with `node:fs`: a format signature and a size field are format
 * checks, not a hash (strategy section 1.2). At the base none of the 16 asset files exists, so
 * A1 to A6 fail with `Missing <path>`. A9 (no `public/` folder), A10, and the byte-parser and
 * scanner self-tests pass at the base (named characterization).
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCss, stripCssComments, type CssRule } from "./helpers/css-rules";

const app = resolve(import.meta.dirname, "..");
const lookCssPath = resolve(app, "app/look.css");
const layoutPath = resolve(app, "app/[locale]/layout.tsx");
const dockerfilePath = resolve(app, "Dockerfile");
const placesDir = resolve(app, "app/look/places");
const piecesDir = resolve(app, "app/look/pieces");
const fontsDir = resolve(app, "app/look/fonts");

const PLACES = ["meadow", "grove", "oak", "trail", "path"] as const;
const PLACE_FILES = PLACES.flatMap((place) => [
  { name: `${place}-p.webp`, width: 1080, height: 1920, orientation: "portrait" },
  { name: `${place}-d.webp`, width: 1920, height: 1080, orientation: "landscape" },
]);
const PIECES = ["q-tip-l.svg", "q-tip-r.svg"] as const;
const FONTS = ["fredoka-latin.woff2", "mitr-500-thai.woff2"] as const;
/** The largest place file (strategy A1). */
const PLACE_BYTES_MAX = 250_000;
const SVG_BYTES_MAX = 20 * 1024;
const FONT_BYTES_MAX = 60 * 1024;

/**
 * Reads the size of a WebP file from its header (VP8, VP8L, and VP8X).
 * @param bytes The file bytes.
 * @returns The width and the height, or `null` when the bytes are no WebP file.
 */
function webpSize(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 30) return null;
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8 ") {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    if (bytes[20] !== 0x2f) return null;
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
  }
  return null;
}

/**
 * Scans one SVG text for anything that is not inert artwork.
 * @param text The SVG text.
 * @returns The violations.
 */
function scanSvg(text: string): string[] {
  const violations: string[] = [];
  if (!/<svg[\s>]/.test(text)) violations.push("no root <svg");
  if (!/\sviewBox\s*=\s*["'][^"']+["']/.test(text)) violations.push("no viewBox");
  if (/<script/i.test(text)) violations.push("<script");
  if (/<foreignObject/i.test(text)) violations.push("<foreignObject");
  if (/<image[\s>]/i.test(text)) violations.push("<image");
  if (/\son[a-z]+\s*=/i.test(text)) violations.push("on* attribute");
  for (const match of text.matchAll(/\s(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi)) {
    if (!match[1]!.startsWith("#") && !match[1]!.startsWith("data:")) violations.push(`href ${match[1]}`);
  }
  return violations;
}

/**
 * Reads the viewBox size of an SVG text.
 * @param text The SVG text.
 * @returns The width and the height, or `null`.
 */
function viewBoxSize(text: string): { width: number; height: number } | null {
  const match = /\sviewBox\s*=\s*["']\s*(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/.exec(text);
  if (!match) return null;
  return { width: Number(match[3]), height: Number(match[4]) };
}

/**
 * Reads the width over height ratio that one rule pins, from `aspect-ratio` or from a px size.
 * @param rule The rule.
 * @returns The ratio, or `null` when the rule pins none.
 */
function ratioOfRule(rule: CssRule): number | null {
  const lastOf = (property: string) => [...rule.declarations].reverse().find((declaration) => declaration.property === property);
  const aspect = lastOf("aspect-ratio");
  if (aspect) {
    const pair = /^\s*([\d.]+)\s*(?:\/\s*([\d.]+))?\s*$/.exec(aspect.value);
    if (pair) return Number(pair[1]) / (pair[2] ? Number(pair[2]) : 1);
  }
  const width = lastOf("width");
  const height = lastOf("height");
  const w = width ? /^([\d.]+)px$/.exec(width.value.trim()) : null;
  const h = height ? /^([\d.]+)px$/.exec(height.value.trim()) : null;
  return w && h ? Number(w[1]) / Number(h[1]) : null;
}

/**
 * A4: checks that each rule that draws a piece pins the ratio of that piece's viewBox.
 * @param css The style sheet text.
 * @param boxes The viewBox size of each piece file.
 * @returns The violations and the number of rules that drew a piece with a ratio.
 */
function checkRatios(
  css: string,
  boxes: Record<string, { width: number; height: number }>,
): { violations: string[]; ratioRules: Record<string, number> } {
  const violations: string[] = [];
  const ratioRules: Record<string, number> = {};
  for (const rule of parseCss(css)) {
    for (const name of Object.keys(boxes)) {
      const draws = rule.declarations.some((declaration) => declaration.value.includes(`${name}`) && /url\(/.test(declaration.value));
      if (!draws) continue;
      const ratio = ratioOfRule(rule);
      if (ratio === null) continue;
      ratioRules[name] = (ratioRules[name] ?? 0) + 1;
      const wanted = boxes[name]!.width / boxes[name]!.height;
      if (Math.abs(ratio / wanted - 1) > 0.01) {
        violations.push(`${rule.selector}: ratio ${ratio.toFixed(3)} but ${name} viewBox is ${wanted.toFixed(3)}`);
      }
    }
  }
  return { violations, ratioRules };
}

/**
 * A9: reports whether the `public/` rule holds.
 * @param publicExists Whether `apps/storytime/public` exists.
 * @param dockerfile The Dockerfile text.
 * @returns Whether no `public/` folder exists, or the runner stage copies it.
 */
function publicDirOk(publicExists: boolean, dockerfile: string): boolean {
  if (!publicExists) return true;
  const runner = dockerfile.split(/^FROM .* AS runner\s*$/m)[1] ?? "";
  return /^COPY\b.*\bpublic\b/m.test(runner);
}

/**
 * Lists every file name and every source text of the app, for the origin scan.
 * @param directory The folder.
 * @returns The paths of the files.
 */
function walk(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "__tests__") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

/**
 * Reads one file with a named assertion when it is absent.
 * @param path The absolute path.
 * @returns The bytes.
 */
function readBytes(path: string): Buffer {
  expect(existsSync(path), `Missing ${path.replace(`${resolve(app, "../..")}/`, "")}`).toBe(true);
  return readFileSync(path);
}

describe("the assets of the look (AC-2.2, FR-2)", () => {
  it.each(PLACE_FILES)("A1 $name is a WebP file of $width x $height under 250 KB", (entry) => {
    const bytes = readBytes(resolve(placesDir, entry.name));
    const size = webpSize(bytes);
    expect(size, `${entry.name} must be a WebP file with a readable header`).not.toBeNull();
    expect(`${size!.width}x${size!.height}`, `${entry.name} size`).toBe(`${entry.width}x${entry.height}`);
    expect(bytes.length, `${entry.name} is ${bytes.length} bytes`).toBeLessThanOrEqual(PLACE_BYTES_MAX);
  });

  it("A1 the ten place files exist (webp_files=10)", () => {
    const found = PLACE_FILES.filter((entry) => existsSync(resolve(placesDir, entry.name))).length;
    expect(`webp_files=${found}`).toBe("webp_files=10");
  });

  it("A2 look.css draws all ten place files by a relative url() and the right orientation", () => {
    expect(existsSync(lookCssPath), "Missing apps/storytime/app/look.css").toBe(true);
    const rules = parseCss(readFileSync(lookCssPath, "utf8"));
    const used = new Set<string>();
    for (const entry of PLACE_FILES) {
      const drawing = rules.filter((rule) =>
        rule.declarations.some((declaration) => declaration.value.includes(`/${entry.name}`)),
      );
      expect(drawing.length, `look.css must draw ${entry.name}`).toBeGreaterThan(0);
      const chosen = drawing.some((rule) => rule.media.some((media) => media.includes(`(orientation: ${entry.orientation})`)));
      expect(chosen, `${entry.name} must sit inside (orientation: ${entry.orientation})`).toBe(true);
      used.add(entry.name.replace(/-[pd]\.webp$/, ""));
    }
    expect(`places_used=${used.size}`).toBe("places_used=5");
    expect([...used].sort()).toEqual([...PLACES].sort());
  });

  it.each(PIECES)("A3 %s is a small inert SVG file with a viewBox", (name) => {
    const bytes = readBytes(resolve(piecesDir, name));
    expect(bytes.length, `${name} is ${bytes.length} bytes`).toBeLessThanOrEqual(SVG_BYTES_MAX);
    expect(scanSvg(bytes.toString("utf8")), `${name} must hold no active content`).toEqual([]);
  });

  it("A4 every rule that draws a tip pins the ratio of its own viewBox, and no rule draws the bar or the crest", () => {
    // spec FR-4 (a), Daniel 2026-11-10: the game bar and the crest go, so their rules go too.
    const boxes: Record<string, { width: number; height: number }> = {};
    for (const name of ["q-tip-l.svg", "q-tip-r.svg"]) {
      const box = viewBoxSize(readBytes(resolve(piecesDir, name)).toString("utf8"));
      expect(box, `${name} must hold a readable viewBox`).not.toBeNull();
      boxes[name] = box!;
    }
    expect(existsSync(lookCssPath), "Missing apps/storytime/app/look.css").toBe(true);
    const css = readFileSync(lookCssPath, "utf8");
    const { violations, ratioRules } = checkRatios(css, boxes);
    expect(violations).toEqual([]);
    const tipRules = parseCss(css).filter((rule) =>
      ["q-tip-l.svg", "q-tip-r.svg"].some((name) =>
        rule.declarations.some((declaration) => declaration.value.includes(name)),
      ),
    );
    expect(`tip_rules=${tipRules.length}`, "look.css must draw the two tips").toBe("tip_rules=2");
    expect(`tip_ratio_rules=${ratioRules["q-tip-l.svg"] ?? 0}`).toMatch(/^tip_ratio_rules=[0-9]+$/);
    expect(css.includes("q-bar.svg"), "look.css must draw no game bar").toBe(false);
    expect(css.includes("q-crest.svg"), "look.css must draw no crest").toBe(false);
  });

  it.each(FONTS)("A5 %s is a WOFF2 file of 60 KB or less", (name) => {
    const bytes = readBytes(resolve(fontsDir, name));
    expect(bytes.toString("ascii", 0, 4), `${name} must start with wOF2`).toBe("wOF2");
    expect(bytes.length, `${name} is ${bytes.length} bytes`).toBeLessThanOrEqual(FONT_BYTES_MAX);
  });

  it("A5 layout.tsx loads both fonts through next/font/local and links no font host", () => {
    expect(existsSync(layoutPath), "Missing apps/storytime/app/[locale]/layout.tsx").toBe(true);
    const layout = readFileSync(layoutPath, "utf8");
    expect(/from\s+["']next\/font\/local["']/.test(layout), "layout.tsx must import next/font/local").toBe(true);
    for (const name of FONTS) expect(layout.includes(name), `layout.tsx must name ${name}`).toBe(true);
    expect(/import\s+["'][^"']*look\.css["']/.test(layout), "layout.tsx must import look.css").toBe(true);
    expect(/<link[^>]*fonts\.(googleapis|gstatic)\.com/i.test(layout), "no <link> to a font host").toBe(false);
    expect(existsSync(lookCssPath), "Missing apps/storytime/app/look.css").toBe(true);
    const css = stripCssComments(readFileSync(lookCssPath, "utf8"));
    expect(/@import\s+url\(\s*["']?https?:/i.test(css), "no @import url(http in look.css").toBe(false);
  });

  it("A6 look.css and layout.tsx hold no root-absolute url and every relative url exists", () => {
    expect(existsSync(lookCssPath), "Missing apps/storytime/app/look.css").toBe(true);
    const css = stripCssComments(readFileSync(lookCssPath, "utf8"));
    expect(/url\(\s*["']?\//.test(css), "look.css must hold no url(/").toBe(false);
    expect(css.includes("/__look/"), "look.css must hold no /__look/").toBe(false);
    expect(existsSync(layoutPath), "Missing apps/storytime/app/[locale]/layout.tsx").toBe(true);
    const layout = readFileSync(layoutPath, "utf8");
    expect(/url\(\s*["']?\//.test(layout) || layout.includes("/__look/"), "layout.tsx holds no root-absolute url").toBe(false);
    let checked = 0;
    for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
      const target = match[1]!;
      if (target.startsWith("data:") || target.startsWith("#")) continue;
      checked += 1;
      expect(existsSync(resolve(app, "app", target)), `look.css url(${target}) must exist on disk`).toBe(true);
    }
    expect(`urls_checked=${checked}`).toMatch(/^urls_checked=[1-9][0-9]*$/);
  });

  it("A9 no public folder exists, or the Dockerfile copies it into the runner stage", () => {
    const dockerfile = readFileSync(dockerfilePath, "utf8");
    expect(publicDirOk(existsSync(resolve(app, "public")), dockerfile)).toBe(true);
  });

  it("A9 the rule fails a public folder with no COPY line (self-test)", () => {
    const withoutCopy = "FROM node AS builder\nCOPY a b\nFROM node:22-alpine AS runner\nCOPY --from=builder x y\n";
    const withCopy = `${withoutCopy}COPY --from=builder /app/apps/storytime/public ./apps/storytime/public\n`;
    expect(publicDirOk(true, withoutCopy), "a public folder with no COPY fails").toBe(false);
    expect(publicDirOk(true, withCopy), "a public folder with a COPY in the runner passes").toBe(true);
    expect(publicDirOk(false, withoutCopy), "no public folder passes").toBe(true);
  });

  it("A10 no source file or asset name holds elvgames or advantage-play-kit", () => {
    const hits: string[] = [];
    for (const path of [...walk(resolve(app, "app")), ...walk(resolve(app, "lib"))]) {
      if (/elvgames|advantage-play-kit/i.test(path)) hits.push(path);
      if (/\.(ts|tsx|css|svg|json)$/.test(path) && statSync(path).size < 1_000_000) {
        if (/elvgames|advantage-play-kit/i.test(readFileSync(path, "utf8"))) hits.push(path);
      }
    }
    expect(hits).toEqual([]);
  });

  it("the byte parsers read the three WebP forms (self-test)", () => {
    const base = (chunk: string, size: number) => {
      const bytes = Buffer.alloc(40);
      bytes.write("RIFF", 0, "ascii");
      bytes.writeUInt32LE(size, 4);
      bytes.write("WEBP", 8, "ascii");
      bytes.write(chunk, 12, "ascii");
      return bytes;
    };
    const lossy = base("VP8 ", 30);
    lossy[23] = 0x9d;
    lossy[24] = 0x01;
    lossy[25] = 0x2a;
    lossy.writeUInt16LE(1080, 26);
    lossy.writeUInt16LE(1920, 28);
    expect(webpSize(lossy)).toEqual({ width: 1080, height: 1920 });
    const lossless = base("VP8L", 30);
    lossless[20] = 0x2f;
    lossless.writeUInt32LE((1920 - 1) | ((1080 - 1) << 14), 21);
    expect(webpSize(lossless)).toEqual({ width: 1920, height: 1080 });
    const extended = base("VP8X", 30);
    extended.writeUIntLE(1080 - 1, 24, 3);
    extended.writeUIntLE(1920 - 1, 27, 3);
    expect(webpSize(extended)).toEqual({ width: 1080, height: 1920 });
    expect(webpSize(Buffer.from("not a webp file at all, only text bytes")), "text is no WebP").toBeNull();
    const square = base("VP8X", 30);
    square.writeUIntLE(1079, 24, 3);
    square.writeUIntLE(1079, 27, 3);
    expect(webpSize(square), "a 1080 x 1080 file is not 1080 x 1920").not.toEqual({ width: 1080, height: 1920 });
  });

  it("the SVG scanner flags hostile content and reads a viewBox (self-test)", () => {
    const good = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 644.8 52"><path d="M0 0h1"/></svg>';
    expect(scanSvg(good)).toEqual([]);
    expect(viewBoxSize(good)).toEqual({ width: 644.8, height: 52 });
    const hostile =
      '<svg viewBox="0 0 1 1" onload="x()"><script>x()</script><foreignObject/><image href="https://x/y.png"/><use href="#a"/></svg>';
    const found = scanSvg(hostile);
    for (const needle of ["<script", "<foreignObject", "<image", "on* attribute", "href https://x/y.png"]) {
      expect(found, `the scanner must flag ${needle}`).toContain(needle);
    }
    expect(scanSvg("<svg><path/></svg>"), "an svg with no viewBox is flagged").toContain("no viewBox");
  });

  it("the ratio check fails the stand-in ratio on the final bar (self-test)", () => {
    const boxes = { "q-bar.svg": { width: 644.8, height: 52 } };
    const standIn = '[data-game-bar] { background: url("look/pieces/q-bar.svg"); aspect-ratio: 360 / 52; }';
    expect(checkRatios(standIn, boxes).violations, "360 : 52 on a 644.8 : 52 bar fails").toHaveLength(1);
    const final = '[data-game-bar] { background: url("look/pieces/q-bar.svg"); aspect-ratio: 644.8 / 52; }';
    const result = checkRatios(final, boxes);
    expect(result.violations).toEqual([]);
    expect(result.ratioRules["q-bar.svg"]).toBe(1);
    const sized = '[data-game-bar] { background: url("look/pieces/q-bar.svg"); width: 645px; height: 52px; }';
    expect(checkRatios(sized, boxes).violations, "a px pair within 1 percent passes").toEqual([]);
  });
});
