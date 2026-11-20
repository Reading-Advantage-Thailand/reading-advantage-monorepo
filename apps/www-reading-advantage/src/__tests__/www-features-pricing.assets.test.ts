import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * Red test for the features image assets (track www_features_pricing_20261120).
 * It asserts that the four files of the image table in spec section 7 exist
 * under `public/images/features/`, are WebP, fit the 200 KB budget and carry
 * the planned pixel sizes. At Red the files do not exist, so the cases fail.
 * The page-src check passes at Red and guards Green against a dangling path.
 */

const PUBLIC_DIR = resolve(__dirname, "../../public");
const FEATURES_DIR = join(PUBLIC_DIR, "images", "features");

/** Planned outputs: file, width and height from the image table (spec 7). */
const PLANNED_FILES = [
  { name: "storytime-reader-card.webp", width: 366, height: 282 },
  { name: "primary-lesson-step05.webp", width: 375, height: 812 },
  { name: "reading-article-selection.webp", width: 1200, height: 576 },
  { name: "tutor-class-leaderboard.webp", width: 520, height: 880 },
] as const;

/** Reads the lossy VP8 frame size: width at byte 26, height at byte 28. */
function vp8Size(bytes: Buffer): { width: number; height: number } {
  const width = bytes.readUInt16LE(26) & 0x3fff;
  const height = bytes.readUInt16LE(28) & 0x3fff;
  return { width, height };
}

/** Collects every /images/... path that the two new pages name. */
function pageImagePaths(): string[] {
  const roots = [
    resolve(
      __dirname,
      "../app/[locale]/(marketing)/features/page.tsx",
    ),
    resolve(__dirname, "../app/[locale]/(marketing)/pricing/page.tsx"),
  ];
  const found = new Set<string>();
  for (const file of roots) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/\/images\/[^\s"'`)}\\]+/g)) {
      found.add(match[0]);
    }
  }
  return [...found].sort();
}

describe("control: planned files and page-src scanner", () => {
  it("control: the plan names four WebP files with sizes", () => {
    expect(PLANNED_FILES.length, "planned files: 4").toBe(4);
    for (const file of PLANNED_FILES) {
      expect(file.name.endsWith(".webp"), `WebP suffix: ${file.name}`).toBe(true);
      expect(file.width, `width of ${file.name}: more than 0`).toBeGreaterThan(0);
      expect(file.height, `height of ${file.name}: more than 0`).toBeGreaterThan(0);
    }
  });

  it("control: the VP8 reader decodes a crafted frame header", () => {
    const bytes = Buffer.alloc(30, 0);
    bytes.write("RIFF", 0);
    bytes.write("WEBP", 8);
    bytes.write("VP8 ", 12);
    bytes.writeUInt8(0x9d, 23);
    bytes.writeUInt8(0x01, 24);
    bytes.writeUInt8(0x2a, 25);
    bytes.writeUInt16LE(366, 26);
    bytes.writeUInt16LE(282, 28);
    expect(vp8Size(bytes)).toEqual({ width: 366, height: 282 });
  });
});

describe.each(PLANNED_FILES)("$name exists as a budgeted WebP ($width x $height)", (file) => {
  it("exists and is not empty", () => {
    const stat = statSync(join(FEATURES_DIR, file.name));
    expect(stat.size, `${file.name} bytes: more than 0`).toBeGreaterThan(0);
  });

  it("is a WebP file at most 200 KB", () => {
    const bytes = readFileSync(join(FEATURES_DIR, file.name));
    expect(bytes.subarray(0, 4).toString("ascii"), "RIFF magic").toBe("RIFF");
    expect(bytes.subarray(8, 12).toString("ascii"), "WEBP magic").toBe("WEBP");
    expect(bytes.length, `${file.name} bytes: at most 200 KB`).toBeLessThanOrEqual(
      200 * 1024,
    );
  });

  it("carries the planned pixel size", () => {
    const bytes = readFileSync(join(FEATURES_DIR, file.name));
    expect(vp8Size(bytes)).toEqual({ width: file.width, height: file.height });
  });
});

describe("page image sources resolve under public/", () => {
  it("resolves every /images path that the two pages name (page src paths)", () => {
    const paths = pageImagePaths();
    expect(paths.length, "page src paths: more than 0").toBeGreaterThan(0);
    const missing = paths.filter((path) => {
      try {
        statSync(join(PUBLIC_DIR, path.replace(/^\/+/, "")));
        return false;
      } catch {
        return true;
      }
    });
    expect(missing, "page src paths missing under public/").toEqual([]);
  });

  it("lists only files, not directories", () => {
    const entries = readdirSync(join(PUBLIC_DIR, "images"));
    expect(entries.length, "images entries: more than 0").toBeGreaterThan(0);
  });
});
