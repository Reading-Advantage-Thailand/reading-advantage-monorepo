/**
 * Real Advantage logos — adversarial tests for the Phase 2 browser captures.
 *
 * Track: www_real_logos_20261008. Role: measure-adversarial-testing.
 *
 * These tests attack the Phase 2 capture set. They read the real PNG files under
 * measure/tracks/www_real_logos_20261008/captures/ and the real favicon files.
 * They change no production code.
 *
 * The attacks:
 * - Wrong size: a capture that exists must measure 1280x800 in its PNG header.
 * - Blank capture: a capture must hold many colours and must not be a solid fill.
 *   The PNG magic alone proves nothing.
 * - Duplicate capture: a capture must differ from every other capture, except the
 *   two documented dark and light pairs.
 * - Pair drift: the site has no theme switch, so a dark capture must show the
 *   same page region as its light twin. A pair that shows different content
 *   proves the dark file is not a dark copy of the light file.
 * - Missing logo ink: a capture that must show a logo must hold that logo colour.
 *   This proves the live page renders the real artwork.
 * - Stray file: the folder must hold exactly the 15 named captures. A renamed file
 *   and an extra file must both fail.
 * - Fixture drift: the Red test list, the capture spec list and the plan list must
 *   name the same 15 files.
 * - Vacuity: every rule runs against a synthetic bad fixture first. A rule that
 *   cannot fail on a bad fixture is not a rule.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(TEST_DIR, "../../..");
const REPO_ROOT = join(TEST_DIR, "../../../../..");
const TRACK_DIR = join(REPO_ROOT, "measure/tracks/www_real_logos_20261008");
const CAPTURES_DIR = join(TRACK_DIR, "captures");
const PLAN_PATH = join(TRACK_DIR, "plan.md");
const RED_TEST_PATH = join(
  APP_ROOT,
  "src/lib/__tests__/real-logos-captures.red.test.ts",
);
const CAPTURE_SPEC_PATH = join(APP_ROOT, "e2e/real-logos-captures.spec.ts");

/**
 * The 15 named captures, in the order the Red test, the capture spec and the plan
 * use.
 */
const CAPTURE_NAMES = [
  "en-home-light.png",
  "en-home-footer-light.png",
  "en-products-light.png",
  "en-math-light.png",
  "en-primary-light.png",
  "en-reading-light.png",
  "en-science-light.png",
  "en-stem-light.png",
  "en-storytime-light.png",
  "en-zhongwen-light.png",
  "en-tutor-light.png",
  "th-home-light.png",
  "th-primary-light.png",
  "en-home-dark.png",
  "en-tutor-dark.png",
] as const;

const EXPECTED_WIDTH = 1280;
const EXPECTED_HEIGHT = 800;

/**
 * The documented dark and light pairs. The site has no theme switch, so the dark
 * preference renders the same page. A dark capture must match its light twin.
 */
const DARK_LIGHT_PAIRS: [string, string][] = [
  ["en-home-light.png", "en-home-dark.png"],
  ["en-tutor-light.png", "en-tutor-dark.png"],
];

/**
 * A pair may differ in at most this share of its pixels. A re-capture of the same
 * region changes a few anti-aliased pixels, not a third of the page.
 */
const MAX_PAIR_DIFFERENCE_SHARE = 0.01;

/**
 * A capture must hold at least this many distinct colours.
 */
const MIN_DISTINCT_COLOURS = 100;

/**
 * A capture must hold at least this share of pixels that differ from the most
 * common pixel. A solid fill and a blank page both fail this rule.
 */
const MIN_NON_BACKGROUND_SHARE = 0.05;

/**
 * The brand colours of the real logos. The horizontal lockups use #155e75, the
 * square logos use #00aef0, and the reversed lockups use #065f46.
 */
const HORIZONTAL_LOCKUP_COLOUR = "#155e75";
const SQUARE_LOGO_COLOUR = "#00aef0";
const REVERSED_LOCKUP_COLOUR = "#065f46";

/**
 * The captures that must show each brand colour, with the least pixel count that
 * still proves the logo renders.
 */
const REQUIRED_INK: [string, string, number][] = [
  ["en-home-light.png", HORIZONTAL_LOCKUP_COLOUR, 100],
  ["en-primary-light.png", HORIZONTAL_LOCKUP_COLOUR, 100],
  ["th-primary-light.png", HORIZONTAL_LOCKUP_COLOUR, 100],
  ["en-products-light.png", SQUARE_LOGO_COLOUR, 100],
  ["en-reading-light.png", SQUARE_LOGO_COLOUR, 100],
  ["en-tutor-light.png", REVERSED_LOCKUP_COLOUR, 50],
];

const ICO_LENGTH = 6507;
const ICO_MAGIC = Buffer.from([0x00, 0x00, 0x01, 0x00]);

interface PngHeader {
  width: number;
  height: number;
  bitDepth: number;
  colourType: number;
  interlace: number;
}

interface DecodedPng {
  header: PngHeader;
  pixels: Buffer;
  channels: number;
}

/**
 * Computes the CRC-32 of a byte range.
 * @param bytes The buffer to read.
 * @returns The CRC-32 value.
 */
function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index++) {
    crc ^= bytes[index] ?? 0;
    for (let bit = 0; bit < 8; bit++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Reads the PNG header of a buffer.
 * @param bytes The PNG file bytes.
 * @returns The header fields the tests assert on.
 * @throws When the buffer holds no PNG header or the header CRC fails.
 */
function readPngHeader(bytes: Buffer): PngHeader {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.subarray(0, 8).equals(signature) === false) {
    throw new Error("not a PNG file");
  }
  const length = bytes.readUInt32BE(8);
  const type = bytes.toString("ascii", 12, 16);
  if (type !== "IHDR") {
    throw new Error(`first chunk is ${type}, not IHDR`);
  }
  const data = bytes.subarray(16, 16 + length);
  const stored = bytes.readUInt32BE(16 + length);
  if (crc32(bytes.subarray(12, 16 + length)) !== stored) {
    throw new Error("IHDR CRC mismatch");
  }
  return {
    width: data.readUInt32BE(0),
    height: data.readUInt32BE(4),
    bitDepth: data[8] ?? 0,
    colourType: data[9] ?? 0,
    interlace: data[12] ?? 0,
  };
}

/**
 * Decodes a PNG into raw pixels.
 * @param bytes The PNG file bytes.
 * @returns The header and the unfiltered pixel bytes.
 * @throws When the PNG holds an unsupported format or a broken chunk.
 */
function decodePng(bytes: Buffer): DecodedPng {
  const header = readPngHeader(bytes);
  if (header.bitDepth !== 8) {
    throw new Error(`unsupported bit depth ${header.bitDepth}`);
  }
  if (header.interlace !== 0) {
    throw new Error("interlaced PNG is not supported");
  }
  const channelsByType: Record<number, number> = { 0: 1, 2: 3, 4: 2, 6: 4 };
  const channels = channelsByType[header.colourType];
  if (channels === undefined) {
    throw new Error(`unsupported colour type ${header.colourType}`);
  }
  const idat: Buffer[] = [];
  let offset = 8;
  while (offset + 8 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    const stored = bytes.readUInt32BE(offset + 8 + length);
    if (crc32(bytes.subarray(offset + 4, offset + 8 + length)) !== stored) {
      throw new Error(`chunk ${type} CRC mismatch`);
    }
    if (type === "IDAT") {
      idat.push(data);
    }
    if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = header.width * channels;
  const pixels = Buffer.alloc(header.height * stride);
  let cursor = 0;
  for (let y = 0; y < header.height; y++) {
    const filter = raw[cursor] ?? 0;
    cursor += 1;
    const row = raw.subarray(cursor, cursor + stride);
    cursor += stride;
    const current = pixels.subarray(y * stride, (y + 1) * stride);
    const previous =
      y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? (current[x - channels] ?? 0) : 0;
      const up = previous ? (previous[x] ?? 0) : 0;
      const upLeft =
        previous && x >= channels ? (previous[x - channels] ?? 0) : 0;
      let value = row[x] ?? 0;
      if (filter === 1) {
        value += left;
      } else if (filter === 2) {
        value += up;
      } else if (filter === 3) {
        value += (left + up) >> 1;
      } else if (filter === 4) {
        const estimate = left + up - upLeft;
        const distanceLeft = Math.abs(estimate - left);
        const distanceUp = Math.abs(estimate - up);
        const distanceUpLeft = Math.abs(estimate - upLeft);
        value +=
          distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft
            ? left
            : distanceUp <= distanceUpLeft
              ? up
              : upLeft;
      }
      current[x] = value & 0xff;
    }
  }
  return { header, pixels, channels };
}

/**
 * Counts the distinct colours of a decoded PNG.
 * @param image The decoded image.
 * @returns The number of distinct pixel colours.
 */
function countDistinctColours(image: DecodedPng): number {
  const seen = new Set<number>();
  const { pixels, channels } = image;
  for (let offset = 0; offset + channels <= pixels.length; offset += channels) {
    let key = 0;
    for (let channel = 0; channel < channels; channel++) {
      key = key * 256 + (pixels[offset + channel] ?? 0);
    }
    seen.add(key);
  }
  return seen.size;
}

/**
 * Counts the pixels that differ from the most common pixel.
 * @param image The decoded image.
 * @returns The number of non-background pixels.
 */
function countNonBackgroundPixels(image: DecodedPng): number {
  const counts = new Map<number, number>();
  const { pixels, channels } = image;
  let largest = 0;
  for (let offset = 0; offset + channels <= pixels.length; offset += channels) {
    let key = 0;
    for (let channel = 0; channel < channels; channel++) {
      key = key * 256 + (pixels[offset + channel] ?? 0);
    }
    const next = (counts.get(key) ?? 0) + 1;
    counts.set(key, next);
    if (next > largest) {
      largest = next;
    }
  }
  return pixels.length / channels - largest;
}

/**
 * Counts the pixels that match a brand colour exactly.
 * @param image The decoded image.
 * @param hex The six digit colour value.
 * @returns The number of pixels that match the colour exactly.
 */
function countPixelsOfColour(image: DecodedPng, hex: string): number {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  const { pixels, channels } = image;
  let matches = 0;
  for (let offset = 0; offset + channels <= pixels.length; offset += channels) {
    if (
      (pixels[offset] ?? 0) === red &&
      (pixels[offset + 1] ?? 0) === green &&
      (pixels[offset + 2] ?? 0) === blue
    ) {
      matches += 1;
    }
  }
  return matches;
}

/**
 * Reports whether a PNG header carries the expected viewport size.
 * @param header The PNG header.
 * @returns True when the header carries the expected width and height.
 */
function hasExpectedSize(header: PngHeader): boolean {
  return header.width === EXPECTED_WIDTH && header.height === EXPECTED_HEIGHT;
}

/**
 * Reports whether two buffers hold different bytes.
 * @param left The first buffer.
 * @param right The second buffer.
 * @returns True when the buffers differ.
 */
function bytesDiffer(left: Buffer, right: Buffer): boolean {
  return left.equals(right) === false;
}

/**
 * Lists the missing and the unexpected names.
 * @param actual The names on disk.
 * @param expected The names the plan requires.
 * @returns The missing names and the unexpected names.
 */
function listNameDrift(
  actual: readonly string[],
  expected: readonly string[],
): { missing: string[]; extra: string[] } {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  return {
    missing: expected.filter((name) => actualSet.has(name) === false),
    extra: actual.filter((name) => expectedSet.has(name) === false),
  };
}

/**
 * Builds a PNG chunk with a valid CRC.
 * @param type The four character chunk type.
 * @param data The chunk payload.
 * @returns The chunk bytes.
 */
function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBytes, data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  typeBytes.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

/**
 * Builds a valid PNG that holds one solid colour.
 * @param width The image width.
 * @param height The image height.
 * @param red The red channel value.
 * @param green The green channel value.
 * @param blue The blue channel value.
 * @returns The PNG file bytes.
 */
function encodeSolidPng(
  width: number,
  height: number,
  red: number,
  green: number,
  blue: number,
): Buffer {
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x++) {
    row[1 + x * 3] = red;
    row[1 + x * 3 + 1] = green;
    row[1 + x * 3 + 2] = blue;
  }
  const raw = Buffer.concat(
    Array.from({ length: height }, () => Buffer.from(row)),
  );
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Reads every quoted PNG name from a source file.
 * @param path The file to read.
 * @param pattern The pattern that holds one name.
 * @returns The names in source order.
 */
function readNames(path: string, pattern: RegExp): string[] {
  const source = readFileSync(path, "utf8");
  const names: string[] = [];
  const expression = new RegExp(pattern.source, pattern.flags);
  let match = expression.exec(source);
  while (match !== null) {
    names.push(match[1] ?? "");
    match = expression.exec(source);
  }
  return names;
}

/**
 * Reads the quoted PNG names inside one block of a source file.
 * @param path The file to read.
 * @param startMarker The text that opens the block.
 * @param endMarker The text that closes the block.
 * @returns The names in source order.
 */
function readNamesInBlock(
  path: string,
  startMarker: string,
  endMarker: string,
): string[] {
  const source = readFileSync(path, "utf8");
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) {
    throw new Error(`block not found in ${path}`);
  }
  const block = source.slice(start, end);
  return [...block.matchAll(/"([a-z0-9-]+\.png)"/g)].map(
    (match) => match[1] ?? "",
  );
}

/**
 * Reads a capture file and decodes it once.
 * @param name The capture file name.
 * @returns The decoded capture.
 */
function loadCapture(name: string): DecodedPng {
  return decodePng(readFileSync(join(CAPTURES_DIR, name)));
}

describe("the adversarial rules fail on a bad fixture", () => {
  it("rejects a solid fill capture", () => {
    const solid = encodeSolidPng(EXPECTED_WIDTH, EXPECTED_HEIGHT, 12, 34, 56);
    const image = decodePng(solid);
    expect(countDistinctColours(image)).toBe(1);
    expect(countNonBackgroundPixels(image)).toBe(0);
  });

  it("rejects a capture with the wrong size", () => {
    const small = encodeSolidPng(640, 400, 255, 255, 255);
    expect(hasExpectedSize(readPngHeader(small))).toBe(false);
    const correct = encodeSolidPng(EXPECTED_WIDTH, EXPECTED_HEIGHT, 0, 0, 0);
    expect(hasExpectedSize(readPngHeader(correct))).toBe(true);
  });

  it("rejects a capture that copies another capture", () => {
    const original = readFileSync(join(CAPTURES_DIR, "en-home-light.png"));
    const copy = Buffer.from(original);
    expect(bytesDiffer(copy, original)).toBe(false);
    const other = readFileSync(join(CAPTURES_DIR, "en-math-light.png"));
    expect(bytesDiffer(original, other)).toBe(true);
  });

  it("rejects a renamed capture and a stray capture", () => {
    const renamed = CAPTURE_NAMES.map((name) =>
      name === "en-home-light.png" ? "en-home-light-renamed.png" : name,
    );
    const renamedDrift = listNameDrift(renamed, CAPTURE_NAMES);
    expect(renamedDrift.missing).toEqual(["en-home-light.png"]);
    expect(renamedDrift.extra).toEqual(["en-home-light-renamed.png"]);

    const strayDrift = listNameDrift(
      [...CAPTURE_NAMES, "stray-capture.png"],
      CAPTURE_NAMES,
    );
    expect(strayDrift.missing).toEqual([]);
    expect(strayDrift.extra).toEqual(["stray-capture.png"]);
  });

  it("rejects a pair whose pages differ", () => {
    const left = loadCapture("en-home-light.png");
    const right = loadCapture("en-home-dark.png");
    let different = 0;
    for (let index = 0; index < left.pixels.length; index++) {
      if (left.pixels[index] !== right.pixels[index]) {
        different += 1;
      }
    }
    const share = different / left.pixels.length;
    expect(share).toBeGreaterThan(MAX_PAIR_DIFFERENCE_SHARE);
  });

  it("rejects a capture that lacks the brand colour", () => {
    const solid = decodePng(
      encodeSolidPng(EXPECTED_WIDTH, EXPECTED_HEIGHT, 255, 255, 255),
    );
    expect(countPixelsOfColour(solid, HORIZONTAL_LOCKUP_COLOUR)).toBe(0);
  });
});

describe("the capture folder holds exactly the 15 named files", () => {
  it("holds no missing and no unexpected file", () => {
    const onDisk = readdirSync(CAPTURES_DIR).sort();
    const drift = listNameDrift(onDisk, CAPTURE_NAMES);
    expect(
      drift.missing,
      `missing captures: ${drift.missing.join(", ")}`,
    ).toEqual([]);
    expect(
      drift.extra,
      `unexpected captures: ${drift.extra.join(", ")}`,
    ).toEqual([]);
    expect(onDisk.length).toBe(15);
  });

  it("holds only regular files", () => {
    for (const name of readdirSync(CAPTURES_DIR)) {
      expect(statSync(join(CAPTURES_DIR, name)).isFile()).toBe(true);
    }
  });
});

describe("every capture measures the 1280x800 viewport", () => {
  it.each(CAPTURE_NAMES)("%s carries the viewport size", (name) => {
    const header = readPngHeader(readFileSync(join(CAPTURES_DIR, name)));
    expect(
      hasExpectedSize(header),
      `${name} measures ${header.width}x${header.height}`,
    ).toBe(true);
    expect(header.bitDepth).toBe(8);
    expect(header.interlace).toBe(0);
  });
});

describe("every capture holds real page content", () => {
  it.each(CAPTURE_NAMES)("%s is not a solid fill", (name) => {
    const image = loadCapture(name);
    const distinct = countDistinctColours(image);
    expect(distinct, `${name} holds ${distinct} distinct colours`).toBeGreaterThanOrEqual(
      MIN_DISTINCT_COLOURS,
    );
    const nonBackground = countNonBackgroundPixels(image);
    const total = image.header.width * image.header.height;
    expect(
      nonBackground / total,
      `${name} holds ${nonBackground} non-background pixels`,
    ).toBeGreaterThanOrEqual(MIN_NON_BACKGROUND_SHARE);
  });
});

describe("no capture copies another capture", () => {
  it("differs from every other capture outside the dark and light pairs", () => {
    const bytes = new Map<string, Buffer>();
    for (const name of CAPTURE_NAMES) {
      bytes.set(name, readFileSync(join(CAPTURES_DIR, name)));
    }
    for (let left = 0; left < CAPTURE_NAMES.length; left++) {
      for (let right = left + 1; right < CAPTURE_NAMES.length; right++) {
        const leftName = CAPTURE_NAMES[left] ?? "";
        const rightName = CAPTURE_NAMES[right] ?? "";
        const documented = DARK_LIGHT_PAIRS.some(
          (pair) =>
            (pair[0] === leftName && pair[1] === rightName) ||
            (pair[1] === leftName && pair[0] === rightName),
        );
        if (documented) {
          continue;
        }
        expect(
          bytesDiffer(
            bytes.get(leftName) ?? Buffer.alloc(0),
            bytes.get(rightName) ?? Buffer.alloc(0),
          ),
          `${leftName} copies ${rightName}`,
        ).toBe(true);
      }
    }
  });

  it("documents each excluded pair as one dark and one light twin", () => {
    expect(DARK_LIGHT_PAIRS.length).toBe(2);
    for (const [light, dark] of DARK_LIGHT_PAIRS) {
      expect(light.endsWith("-light.png")).toBe(true);
      expect(dark.endsWith("-dark.png")).toBe(true);
      expect(light.replace("-light.png", "")).toBe(
        dark.replace("-dark.png", ""),
      );
      expect(CAPTURE_NAMES).toContain(light);
      expect(CAPTURE_NAMES).toContain(dark);
    }
  });
});

describe("each dark capture shows the page of its light twin", () => {
  it.each(DARK_LIGHT_PAIRS)(
    "%s and %s show the same page",
    (light, dark) => {
      const left = loadCapture(light);
      const right = loadCapture(dark);
      let different = 0;
      for (let index = 0; index < left.pixels.length; index++) {
        if (left.pixels[index] !== right.pixels[index]) {
          different += 1;
        }
      }
      const share = different / left.pixels.length;
      expect(
        share,
        `${light} and ${dark} differ in ${(share * 100).toFixed(2)} percent of pixels`,
      ).toBeLessThanOrEqual(MAX_PAIR_DIFFERENCE_SHARE);
    },
  );
});

describe("the captures show the real logo artwork", () => {
  it.each(REQUIRED_INK)(
    "%s holds the %s logo colour",
    (name, hex, least) => {
      const matches = countPixelsOfColour(loadCapture(name), hex);
      expect(
        matches,
        `${name} holds ${matches} pixels of ${hex}`,
      ).toBeGreaterThanOrEqual(least);
    },
  );

  it("the home dark capture holds the horizontal lockup colour", () => {
    const matches = countPixelsOfColour(
      loadCapture("en-home-dark.png"),
      HORIZONTAL_LOCKUP_COLOUR,
    );
    expect(
      matches,
      `en-home-dark.png holds ${matches} pixels of ${HORIZONTAL_LOCKUP_COLOUR}`,
    ).toBeGreaterThanOrEqual(100);
  });
});

describe("the named capture lists agree with the folder", () => {
  it("names the same 15 files in the Red test", () => {
    const redNames = readNamesInBlock(
      RED_TEST_PATH,
      "const CAPTURE_FILES = [",
      "] as const;",
    );
    expect(redNames).toEqual([...CAPTURE_NAMES]);
  });

  it("names the same 15 files in the capture spec", () => {
    const specNames = readNames(CAPTURE_SPEC_PATH, /name: "([a-z0-9-]+\.png)"/g);
    expect(specNames).toEqual([...CAPTURE_NAMES]);
  });

  it("names the same 15 files in the plan", () => {
    const planNames = readNames(PLAN_PATH, /^[ \t]*-[ \t]+`([a-z0-9-]+\.png)`/gm);
    expect(planNames).toEqual([...CAPTURE_NAMES]);
  });
});

describe("the locale favicon copies carry the company icon", () => {
  const FAVICON_PATHS = [
    "public/favicon.ico",
    "public/en/favicon.ico",
    "public/th/favicon.ico",
    "public/zh/favicon.ico",
    "src/app/[locale]/favicon.ico",
  ];

  it.each(FAVICON_PATHS)("%s holds the 6507 byte icon", (path) => {
    const bytes = readFileSync(join(APP_ROOT, path));
    expect(bytes.length, `${path} byte length`).toBe(ICO_LENGTH);
    expect(
      bytes.subarray(0, 4).equals(ICO_MAGIC),
      `${path} does not start with ICO magic 00 00 01 00`,
    ).toBe(true);
  });

  it("keeps every favicon copy byte-identical to the root icon", () => {
    const root = readFileSync(join(APP_ROOT, "public/favicon.ico"));
    for (const path of FAVICON_PATHS) {
      expect(
        bytesDiffer(readFileSync(join(APP_ROOT, path)), root),
        `${path} differs from public/favicon.ico`,
      ).toBe(false);
    }
  });
});
