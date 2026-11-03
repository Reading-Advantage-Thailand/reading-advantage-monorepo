// @vitest-environment node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  CONTAINERS,
  IMAGES,
  META,
} from "@/test/fixtures/primary-page-expected";

/*
 * Image tests for the Primary Advantage page (track www_primary_page_revamp_20261030).
 * They read the image list of the PR session at run time. They copy no hash into the repository.
 * A34_REQUIRE_SOURCES=1 turns a missing source tree into a failure. Without it the tests skip.
 */

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SOURCE_ROOT = process.env.A34_SOURCE_ROOT ?? "/home/daniebo/Desktop/advantage-pr";
const LIST_PATH = join(SOURCE_ROOT, "11-content/www-primary-advantage-page-images.md");
const BRIEF_PATH = join(SOURCE_ROOT, "11-content/www-primary-advantage-page-brief.md");
const OUTPUT_DIR = join(APP_ROOT, "public/images/primary-advantage");
const REQUIRE_SOURCES = process.env.A34_REQUIRE_SOURCES === "1";
const SOURCES_PRESENT = existsSync(LIST_PATH) && existsSync(BRIEF_PATH);

if (!SOURCES_PRESENT && !REQUIRE_SOURCES) {
  console.warn(
    `primary-page-images: source files missing under ${SOURCE_ROOT}; the source tests skip. ` +
      "Set A34_REQUIRE_SOURCES=1 to fail instead.",
  );
}

const sourceTest = it.skipIf(!SOURCES_PRESENT && !REQUIRE_SOURCES);

interface ListRow {
  readonly name: string;
  readonly source: string;
  readonly sha256: string;
  readonly crop: readonly [number, number, number, number] | null;
  readonly outWidth: number;
  readonly outHeight: number;
  readonly altEn: string;
  readonly altTh: string;
}

/**
 * Splits a markdown table row into trimmed cells.
 * @param line The table row.
 * @returns The cells of the row.
 */
function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/**
 * Parses the image table of the image list.
 * @returns One row for each image of the list.
 */
function parseImageList(): ListRow[] {
  const rows: ListRow[] = [];
  for (const line of readFileSync(LIST_PATH, "utf8").split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = tableCells(line);
    if (cells.length !== 9 || !/^\d+$/.test(cells[0])) continue;
    const crop = /^\((\d+), (\d+), (\d+), (\d+)\)/.exec(cells[5]);
    const out = /^(\d+)×(\d+)$/.exec(cells[6]);
    if (!out) throw new Error(`Bad output size in row ${cells[0]}: ${cells[6]}`);
    rows.push({
      name: cells[4].replace(/`/g, ""),
      source: cells[2].replace(/`/g, ""),
      sha256: cells[3].replace(/`/g, ""),
      crop: crop
        ? [Number(crop[1]), Number(crop[2]), Number(crop[3]), Number(crop[4])]
        : null,
      outWidth: Number(out[1]),
      outHeight: Number(out[2]),
      altEn: cells[7],
      altTh: cells[8],
    });
  }
  return rows;
}

/**
 * Reads the chunk names of a RIFF WebP file.
 * @param file The file bytes.
 * @returns The four-letter chunk names in file order.
 */
function webpChunks(file: Buffer): string[] {
  if (
    file.length < 12 ||
    file.toString("ascii", 0, 4) !== "RIFF" ||
    file.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return [];
  }
  const chunks: string[] = [];
  let offset = 12;
  while (offset + 8 <= file.length) {
    chunks.push(file.toString("ascii", offset, offset + 4));
    const size = file.readUInt32LE(offset + 4);
    offset += 8 + size + (size % 2);
  }
  return chunks;
}

/**
 * Builds the source crop that the list describes, as raw RGBA bytes.
 * @param row The list row.
 * @returns The raw pixels and the size of the crop.
 */
async function rawCrop(
  row: ListRow,
  resize: boolean,
): Promise<{ data: Buffer; width: number; height: number }> {
  let pipeline = sharp(join(SOURCE_ROOT, row.source));
  if (row.crop) {
    const [left, top, width, height] = row.crop;
    pipeline = pipeline.extract({ left, top, width, height });
  }
  if (resize) {
    pipeline = pipeline.resize(row.outWidth, row.outHeight, { kernel: "lanczos3" });
  }
  const { data, info } = await pipeline
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/**
 * Reads an output file as raw RGBA bytes.
 * @param name The target name of the image.
 * @returns The raw pixels and the size of the file.
 */
async function rawOutput(
  name: string,
): Promise<{ data: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(join(OUTPUT_DIR, `${name}.webp`))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/**
 * Collects the cells of every table row of a markdown file.
 * @param path The markdown file.
 * @returns Each cell, and each pair of adjacent cells joined with a pipe.
 */
function cellSet(path: string): Set<string> {
  const set = new Set<string>();
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = tableCells(line);
    cells.forEach((cell, index) => {
      set.add(cell);
      if (index > 0) set.add(`${cells[index - 1]} | ${cell}`);
    });
  }
  return set;
}

describe("source files", () => {
  it("are present when A34_REQUIRE_SOURCES=1", () => {
    if (!REQUIRE_SOURCES) return;
    expect(existsSync(LIST_PATH), `image list at ${LIST_PATH}`).toBe(true);
    expect(existsSync(BRIEF_PATH), `brief at ${BRIEF_PATH}`).toBe(true);
  });
});

describe("image list", () => {
  sourceTest("has 16 rows from 15 distinct sources (images: 16, sources: 15)", () => {
    const rows = parseImageList();
    expect(rows.length, "images: 16").toBe(16);
    expect(new Set(rows.map((row) => row.source)).size, "sources: 15").toBe(15);
    expect(new Set(rows.map((row) => row.name)).size, "names: 16").toBe(16);
  });

  sourceTest("lists the same names and alt text as the page fixture", () => {
    const rows = parseImageList();
    expect(
      rows.map(({ name, altEn, altTh }) => ({ name, altEn, altTh })),
    ).toEqual(IMAGES.map(({ name, altEn, altTh }) => ({ name, altEn, altTh })));
  });

  sourceTest("has a source file whose SHA-256 matches the list, for each of the 15 sources", () => {
    const rows = parseImageList();
    expect(rows.length, "images: 16").toBe(16);
    const mismatches: string[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (seen.has(row.source)) continue;
      seen.add(row.source);
      const path = join(SOURCE_ROOT, row.source);
      if (!existsSync(path)) {
        mismatches.push(`${row.source}: missing`);
        continue;
      }
      const actual = createHash("sha256").update(readFileSync(path)).digest("hex");
      if (actual !== row.sha256) mismatches.push(`${row.source}: hash differs`);
    }
    expect(seen.size, "sources: 15").toBe(15);
    expect(mismatches).toEqual([]);
  });
});

describe("page images", () => {
  sourceTest("fill the output folder with exactly the 16 files of the list", () => {
    const rows = parseImageList();
    expect(rows.length, "images: 16").toBe(16);
    expect(existsSync(OUTPUT_DIR), `folder ${OUTPUT_DIR}`).toBe(true);
    const files = readdirSync(OUTPUT_DIR).sort();
    expect(files).toEqual(rows.map((row) => `${row.name}.webp`).sort());
  });

  sourceTest("are lossless WebP files at the output size of the list", async () => {
    const rows = parseImageList();
    expect(rows.length, "images: 16").toBe(16);
    expect(existsSync(OUTPUT_DIR), `folder ${OUTPUT_DIR}`).toBe(true);
    const problems: string[] = [];
    for (const row of rows) {
      const path = join(OUTPUT_DIR, `${row.name}.webp`);
      if (!existsSync(path)) {
        problems.push(`${row.name}: file missing`);
        continue;
      }
      const chunks = webpChunks(readFileSync(path));
      if (!chunks.includes("VP8L") || chunks.includes("VP8 ")) {
        problems.push(`${row.name}: not lossless (chunks ${chunks.join(",")})`);
      }
      const meta = await sharp(path).metadata();
      if (meta.format !== "webp" || meta.width !== row.outWidth || meta.height !== row.outHeight) {
        problems.push(
          `${row.name}: ${meta.format} ${meta.width}x${meta.height}, list says ${row.outWidth}x${row.outHeight}`,
        );
      }
    }
    expect(problems).toEqual([]);
  });

  sourceTest("equal the source crop byte for byte, except the one scaled image", async () => {
    const rows = parseImageList();
    expect(rows.length, "images: 16").toBe(16);
    expect(existsSync(OUTPUT_DIR), `folder ${OUTPUT_DIR}`).toBe(true);
    const scaled = rows.filter(
      (row) =>
        row.crop !== null &&
        (row.crop[2] !== row.outWidth || row.crop[3] !== row.outHeight),
    );
    expect(scaled.map((row) => row.name), "scaled images: 1").toEqual(["reedy-preview"]);
    const unscaled = rows.filter((row) => !scaled.includes(row));
    expect(unscaled.length, "unscaled images: 15").toBe(15);
    const problems: string[] = [];
    for (const row of unscaled) {
      if (!existsSync(join(OUTPUT_DIR, `${row.name}.webp`))) {
        problems.push(`${row.name}: file missing`);
        continue;
      }
      const [expected, actual] = await Promise.all([rawCrop(row, false), rawOutput(row.name)]);
      if (
        expected.width !== actual.width ||
        expected.height !== actual.height ||
        !expected.data.equals(actual.data)
      ) {
        problems.push(`${row.name}: pixels differ from the source crop`);
      }
    }
    expect(problems).toEqual([]);
  });

  sourceTest("keep the scaled Reedy image within 2.0 mean difference of a lanczos3 resize", async () => {
    const row = parseImageList().find((item) => item.name === "reedy-preview");
    expect(row, "row reedy-preview").toBeDefined();
    if (!row) return;
    expect(existsSync(join(OUTPUT_DIR, "reedy-preview.webp")), "reedy-preview.webp").toBe(true);
    const [expected, actual] = await Promise.all([rawCrop(row, true), rawOutput(row.name)]);
    expect([actual.width, actual.height]).toEqual([expected.width, expected.height]);
    let total = 0;
    for (let index = 0; index < expected.data.length; index++) {
      total += Math.abs(expected.data[index] - actual.data[index]);
    }
    expect(total / expected.data.length, "mean absolute difference, 0 to 255").toBeLessThanOrEqual(2.0);
  });
});

describe("repository", () => {
  it("adds no 64-character hash to any file under apps/ (hash lines: 0)", () => {
    const diff = execFileSync("git", ["diff", "master...HEAD", "--", "apps/"], {
      cwd: APP_ROOT,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    });
    const hits = diff
      .split("\n")
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
      .filter((line) => /[0-9a-f]{64}/.test(line));
    expect(hits.length, "hash lines: 0").toBe(0);
  });
});

describe("drift guard", () => {
  sourceTest("finds every fixture string in the brief and the image list", () => {
    const briefCells = cellSet(BRIEF_PATH);
    const listCells = cellSet(LIST_PATH);
    const strings: string[] = [
      ...CONTAINERS.flatMap((container) =>
        container.texts.flatMap(({ en, th }) => [en, th]),
      ),
      ...CONTAINERS.flatMap((container) =>
        container.links.flatMap(({ en, th }) => [en, th]),
      ),
      META.title.en,
      META.title.th,
      META.description.en,
      META.description.th,
    ];
    expect(strings.length, "brief strings: more than 60").toBeGreaterThan(60);
    const missingInBrief = strings.filter((text) => !briefCells.has(text));
    expect(missingInBrief, "fixture strings that are not a cell of the brief").toEqual([]);
    const alts = IMAGES.flatMap(({ altEn, altTh }) => [altEn, altTh]);
    expect(alts.length, "alt texts: 32").toBe(32);
    const missingInList = alts.filter((text) => !listCells.has(text));
    expect(missingInList, "alt texts that are not a cell of the image list").toEqual([]);
  });
});
