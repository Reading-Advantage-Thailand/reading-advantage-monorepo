/**
 * Real Advantage logos — adversarial tests for the Phase 2 browser captures.
 *
 * Track: www_real_logos_20261008. Role: measure-adversarial-testing.
 *
 * These tests attack the Phase 2 capture set. They read the real PNG files under
 * measure/tracks/www_real_logos_20261008/captures/, the real favicon files, the real
 * capture spec, the real app source and the real plan. They change no production code.
 *
 * The attacks:
 * - Wrong size: a capture must measure the viewport of the capture spec.
 * - Blank capture: a capture must hold many colours and must not be a solid fill.
 *   The PNG magic alone proves nothing.
 * - Duplicate capture: a capture must differ from every other capture, except the
 *   two documented dark and light pairs.
 * - Pair drift: the site has no theme switch, so a dark capture must show the
 *   same page region as its light twin. A pair that shows different content
 *   proves the dark file is not a dark copy of the light file.
 * - Pair vacuity: the pair rule must fail on a pair that really differs. The rule
 *   reads two pages that differ and a synthetic capture that scrolled elsewhere.
 * - Capture type: the capture spec must declare one Capture type with the optional
 *   scroll, footer and dark keys.
 * - Dark twin: every dark capture must have a light twin on the same route with the
 *   same scroll and footer keys.
 * - 404 rule: the capture spec must count the image responses strictly above zero,
 *   must compare the 404 list with an empty array, and must wait after the scroll.
 * - Dark theme: no app source file may set a dark class or use the dark variant.
 *   The dark capture cannot differ from its light twin without one of these.
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
import { dirname, join, relative } from "node:path";
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
const APP_SOURCE_DIR = join(APP_ROOT, "src");
const LOGO_DIR = join(APP_ROOT, "public/media/brand/logos/vector");
const HORIZONTAL_LOGO_DIR = join(LOGO_DIR, "horizontal");

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
 * A pair may differ in at most this share of its bytes. A re-capture of the same
 * region changes a few anti-aliased pixels, not a third of the page.
 */
const MAX_PAIR_DIFFERENCE_SHARE = 0.01;

/**
 * The tutor pair may differ only inside the pulsing Live Now dot. The dot is 8 by 8
 * pixels. This limit leaves room for one pixel of anti-aliasing on each side.
 */
const MAX_DARK_DIFFERENCE_BOX = 16;

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

/**
 * The ten product ids of the track. Every colour lockup file uses the id.
 */
const PRODUCT_IDS = [
  "codecamp",
  "mastery",
  "math",
  "primary",
  "reading",
  "science",
  "stem",
  "storytime",
  "tutor",
  "zhongwen",
] as const;

const ICO_LENGTH = 6507;
const ICO_MAGIC = Buffer.from([0x00, 0x00, 0x01, 0x00]);

/**
 * The ink that each product page capture must hold. The colour is the artwork
 * colour of the logo file that the page must show. The last value is the least
 * number of pixels that still proves the artwork renders.
 */
const PRODUCT_PAGE_INK: [string, string, string, number][] = [
  ["en-math-light.png", "square/math-advantage.svg", "#9a3412", 1000],
  ["en-primary-light.png", "square/primary-advantage.svg", "#155e75", 1000],
  ["th-primary-light.png", "square/primary-advantage.svg", "#155e75", 1000],
  ["en-reading-light.png", "square/reading-advantage.svg", "#2f3192", 1000],
  ["en-science-light.png", "square/science-advantage.svg", "#9f1239", 1000],
  ["en-stem-light.png", "square/stem-advantage.svg", "#3730a3", 1000],
  [
    "en-storytime-light.png",
    "square/storytime-advantage.svg",
    "#92400e",
    1000,
  ],
  ["en-zhongwen-light.png", "square/zhongwen-advantage.svg", "#86198f", 1000],
  [
    "en-tutor-light.png",
    "horizontal-dark-inverse/tutor-advantage.svg",
    "#6ee7b7",
    1000,
  ],
];

/**
 * The artwork colour of every product logo. The colours differ per product, so a
 * capture of the wrong page holds another colour.
 */
const PRODUCT_ARTWORK_COLOURS: [string, string][] = [
  ["codecamp", "#3f6212"],
  ["mastery", "#1e293b"],
  ["math", "#9a3412"],
  ["primary", "#155e75"],
  ["reading", "#2f3192"],
  ["science", "#9f1239"],
  ["stem", "#3730a3"],
  ["storytime", "#92400e"],
  ["tutor", "#065f46"],
  ["zhongwen", "#86198f"],
];

/**
 * The artwork colour that each single product page capture must show. The other
 * product pages hold no other product colour.
 */
const CAPTURE_OWN_INK: [string, string][] = [
  ["en-math-light.png", "#9a3412"],
  ["en-primary-light.png", "#155e75"],
  ["en-reading-light.png", "#2f3192"],
  ["en-science-light.png", "#9f1239"],
  ["en-stem-light.png", "#3730a3"],
  ["en-storytime-light.png", "#92400e"],
  ["en-zhongwen-light.png", "#86198f"],
  ["en-tutor-light.png", "#065f46"],
  ["th-primary-light.png", "#155e75"],
];

/**
 * A single product page must hold less of another product colour than this
 * count. The home page and the products page show many product logos, so the
 * rule does not apply to them.
 */
const MAX_FOREIGN_INK = 1000;

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
 * The result of the pair rule for one light and one dark capture.
 */
interface PairVerdict {
  ok: boolean;
  share: number;
  reason: string;
}

/**
 * The box that holds all differing pixels of two captures.
 */
interface DifferenceBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  pixels: number;
}

/**
 * One entry of the CAPTURES array of the capture spec.
 */
interface SpecCapture {
  name: string;
  path: string;
  scroll: string | undefined;
  footer: boolean;
  dark: boolean;
}

/**
 * One app source file and its text.
 */
interface SourceFile {
  path: string;
  source: string;
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
 * Builds a valid PNG that holds the given RGB pixels.
 * @param width The image width.
 * @param height The image height.
 * @param rgb The pixel bytes. The buffer holds three bytes per pixel.
 * @returns The PNG file bytes.
 */
function encodeRgbPng(width: number, height: number, rgb: Buffer): Buffer {
  const stride = width * 3;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const start = y * (stride + 1);
    raw[start] = 0;
    rgb.copy(raw, start + 1, y * stride, (y + 1) * stride);
  }
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
 * Builds a capture that shows another page region. The bottom half of the source
 * capture holds the inverted colours.
 * @param image The decoded source capture.
 * @returns The decoded synthetic capture.
 */
function buildDifferentScrollCapture(image: DecodedPng): DecodedPng {
  const width = image.header.width;
  const height = image.header.height;
  const channels = image.channels;
  const cut = Math.floor(height / 2);
  const rgb = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const source = (y * width + x) * channels;
      const target = (y * width + x) * 3;
      const flip = y >= cut;
      rgb[target] = flip ? 255 - (image.pixels[source] ?? 0) : (image.pixels[source] ?? 0);
      rgb[target + 1] = flip
        ? 255 - (image.pixels[source + 1] ?? 0)
        : (image.pixels[source + 1] ?? 0);
      rgb[target + 2] = flip
        ? 255 - (image.pixels[source + 2] ?? 0)
        : (image.pixels[source + 2] ?? 0);
    }
  }
  return decodePng(encodeRgbPng(width, height, rgb));
}

/**
 * Computes the share of bytes that differ between two captures.
 * @param left The first capture.
 * @param right The second capture.
 * @returns The share of the bytes of the first capture that differ.
 */
function pairDifferenceShare(left: DecodedPng, right: DecodedPng): number {
  const length = left.pixels.length;
  if (length === 0) {
    return 1;
  }
  let different = 0;
  for (let index = 0; index < length; index++) {
    const other = index < right.pixels.length ? right.pixels[index] : undefined;
    if (left.pixels[index] !== other) {
      different += 1;
    }
  }
  return different / length;
}

/**
 * Applies the dark pair rule to one light and one dark capture.
 * @param light The light capture.
 * @param dark The dark capture.
 * @returns The verdict with the difference share and the reason.
 */
function pairShowsSamePage(light: DecodedPng, dark: DecodedPng): PairVerdict {
  if (
    light.header.width !== dark.header.width ||
    light.header.height !== dark.header.height
  ) {
    return {
      ok: false,
      share: 1,
      reason: "the two captures have different sizes",
    };
  }
  const share = pairDifferenceShare(light, dark);
  if (share > MAX_PAIR_DIFFERENCE_SHARE) {
    return {
      ok: false,
      share,
      reason: "the two captures show different page regions",
    };
  }
  return { ok: true, share, reason: "the two captures show the same page" };
}

/**
 * Finds the box that holds all differing pixels of two captures.
 * @param left The first capture.
 * @param right The second capture.
 * @returns The box and the number of differing pixels.
 */
function differingPixelBox(left: DecodedPng, right: DecodedPng): DifferenceBox {
  const width = left.header.width;
  const height = left.header.height;
  const channels = left.channels;
  let pixels = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * channels;
      let differs = false;
      for (let channel = 0; channel < channels; channel++) {
        if (left.pixels[offset + channel] !== right.pixels[offset + channel]) {
          differs = true;
          break;
        }
      }
      if (differs === false) {
        continue;
      }
      pixels += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, maxX, maxY, pixels };
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

/**
 * Reads a block of source text between two markers.
 * @param source The whole source text.
 * @param startMarker The text that opens the block.
 * @param endMarker The text that closes the block.
 * @returns The block text.
 * @throws When the block is not in the source.
 */
function readBlock(
  source: string,
  startMarker: string,
  endMarker: string,
): string {
  const start = source.indexOf(startMarker);
  if (start < 0) {
    throw new Error(`block start not found: ${startMarker}`);
  }
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) {
    throw new Error(`block end not found: ${endMarker}`);
  }
  return source.slice(start, end);
}

/**
 * Reads the CAPTURES array of the capture spec.
 * @param source The spec source text.
 * @returns The entries in source order.
 */
function parseCaptureEntries(source: string): SpecCapture[] {
  const block = readBlock(source, "const CAPTURES: Capture[] = [", "];");
  const entries: SpecCapture[] = [];
  const expression =
    /\{\s*name:\s*"([^"]+)"\s*,\s*path:\s*"([^"]+)"([^}]*)\}/g;
  let match = expression.exec(block);
  while (match !== null) {
    const rest = match[3] ?? "";
    const scroll = /scroll:\s*"([^"]+)"/.exec(rest);
    entries.push({
      name: match[1] ?? "",
      path: match[2] ?? "",
      scroll: scroll ? (scroll[1] ?? undefined) : undefined,
      footer: /footer:\s*true/.test(rest),
      dark: /dark:\s*true/.test(rest),
    });
    match = expression.exec(block);
  }
  return entries;
}

/**
 * Checks the Capture type of the capture spec.
 * @param typeSource The text of the type block.
 * @returns The defect messages. An empty list means the type holds every rule.
 */
function findCaptureTypeDefects(typeSource: string): string[] {
  const defects: string[] = [];
  const flat = typeSource.replace(/\s+/g, " ");
  if (/\bname: string;/.test(flat) === false) {
    defects.push("the Capture type has no name field of type string");
  }
  if (/\bpath: string;/.test(flat) === false) {
    defects.push("the Capture type has no path field of type string");
  }
  if (/scroll\?: "homeCards" \| "b2bGrid";/.test(flat) === false) {
    defects.push(
      "the Capture type has no optional scroll key with the two scroll names",
    );
  }
  if (/footer\?: boolean;/.test(flat) === false) {
    defects.push("the Capture type has no optional footer key");
  }
  if (/dark\?: boolean;/.test(flat) === false) {
    defects.push("the Capture type has no optional dark key");
  }
  if (/\[key: string\]/.test(flat)) {
    defects.push("the Capture type has an index signature");
  }
  if (/\bany\b/.test(flat)) {
    defects.push("the Capture type uses the any type");
  }
  return defects;
}

/**
 * Checks the CAPTURES array of the capture spec.
 * @param source The spec source text.
 * @returns The defect messages. An empty list means the array holds every rule.
 */
function findCaptureArrayDefects(source: string): string[] {
  const defects: string[] = [];
  const entries = parseCaptureEntries(source);
  if (entries.length !== CAPTURE_NAMES.length) {
    defects.push(
      `the CAPTURES array holds ${entries.length} entries, not ${CAPTURE_NAMES.length}`,
    );
  }
  const names = entries.map((entry) => entry.name);
  if (new Set(names).size !== names.length) {
    defects.push("the CAPTURES array holds a repeated name");
  }
  for (const entry of entries) {
    if (entry.name.endsWith(".png") === false) {
      defects.push(`${entry.name} does not end with .png`);
    }
    if (entry.path.startsWith("/") === false) {
      defects.push(`${entry.name} has a path that does not start with a slash`);
    }
    if (
      entry.scroll !== undefined &&
      entry.scroll !== "homeCards" &&
      entry.scroll !== "b2bGrid"
    ) {
      defects.push(`${entry.name} uses the unknown scroll key ${entry.scroll}`);
    }
  }
  for (const dark of entries.filter((entry) => entry.dark)) {
    const twin = entries.find(
      (entry) =>
        entry.dark === false &&
        entry.path === dark.path &&
        entry.scroll === dark.scroll &&
        entry.footer === dark.footer,
    );
    if (twin === undefined) {
      defects.push(
        `${dark.name} has no light twin on the same route with the same scroll and footer keys`,
      );
      continue;
    }
    if (twin.name !== dark.name.replace("-dark.png", "-light.png")) {
      defects.push(
        `${dark.name} has the light twin ${twin.name} with another name stem`,
      );
    }
  }
  return defects;
}

/**
 * Checks the image and 404 rule of the capture spec.
 * @param source The spec source text.
 * @returns The defect messages. An empty list means the rule holds every rule.
 */
function find404RuleDefects(source: string): string[] {
  const defects: string[] = [];
  if (/resourceType\(\)\s*===\s*"image"/.test(source) === false) {
    defects.push("the response listener does not filter on the image resource type");
  }
  if (/status\(\)\s*===\s*404/.test(source) === false) {
    defects.push("the response listener does not collect the 404 status");
  }
  if (/\.toBeGreaterThan\(0\)/.test(source) === false) {
    defects.push("the image count assertion is not strictly above zero");
  }
  if (/notFoundImages[\s\S]{0,240}?\.toEqual\(\[\]\)/.test(source) === false) {
    defects.push("the not found list is not compared with an empty array");
  }
  const scrollIndex = source.lastIndexOf("scrollIntoViewIfNeeded");
  const waitIndex = source.lastIndexOf('waitForLoadState("networkidle")');
  if (scrollIndex < 0) {
    defects.push("the spec never scrolls");
  }
  if (waitIndex < scrollIndex) {
    defects.push("the network idle wait does not come after the scroll");
  }
  return defects;
}

/**
 * Checks the app source for a dark theme.
 * @param files The app source files.
 * @returns The defect messages. An empty list means the site has no dark theme.
 */
function findDarkThemeDefects(files: SourceFile[]): string[] {
  const defects: string[] = [];
  for (const file of files) {
    if (/classList\.(add|toggle|remove)\(\s*["'`][^"'`]*dark/.test(file.source)) {
      defects.push(`${file.path} sets a dark class`);
    }
    if (/documentElement\.classList\./.test(file.source)) {
      defects.push(`${file.path} changes the document element class list`);
    }
    if (
      file.path.endsWith(".css") &&
      /@media[^{]*prefers-color-scheme/.test(file.source)
    ) {
      defects.push(`${file.path} holds a prefers-color-scheme media query`);
    }
    if (/\bdark:/.test(file.source)) {
      defects.push(`${file.path} uses the dark variant`);
    }
  }
  return defects;
}

/**
 * Lists the app source files that the dark theme rule reads.
 * @returns The files with their text.
 */
function readAppSourceFiles(): SourceFile[] {
  const files = listFiles(APP_SOURCE_DIR, [".ts", ".tsx", ".css"]);
  return files
    .filter((path) => isAppSource(path))
    .map((path) => ({
      path: relative(APP_ROOT, path),
      source: readFileSync(path, "utf8"),
    }));
}

/**
 * Lists the files under a directory that match the given extensions.
 * @param directory The directory to walk.
 * @param extensions The file extensions to keep.
 * @returns The absolute file paths.
 */
function listFiles(directory: string, extensions: string[]): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...listFiles(path, extensions));
      continue;
    }
    if (extensions.some((extension) => entry.name.endsWith(extension))) {
      found.push(path);
    }
  }
  return found;
}

/**
 * Reports whether a file holds app code and not test code.
 * @param path The absolute file path.
 * @returns True when the file holds app code.
 */
function isAppSource(path: string): boolean {
  const parts = path.split(/[\\/]/);
  if (parts.includes("__tests__") || parts.includes("test")) {
    return false;
  }
  const name = parts[parts.length - 1] ?? "";
  return (
    name.endsWith(".test.ts") === false && name.endsWith(".test.tsx") === false
  );
}

/**
 * Reads the viewport of the capture spec.
 * @param source The spec source text.
 * @returns The width and the height of the capture viewport.
 * @throws When the spec holds no viewport constant.
 */
function readSpecViewport(source: string): { width: number; height: number } {
  const match = /const VIEWPORT = \{ width: (\d+), height: (\d+) \}/.exec(source);
  if (match === null) {
    throw new Error("the capture spec holds no VIEWPORT constant");
  }
  return {
    width: Number(match[1] ?? "0"),
    height: Number(match[2] ?? "0"),
  };
}

/**
 * Reads the ratio of the viewBox of a colour lockup file.
 * @param id The product id.
 * @returns The width to height ratio of the viewBox.
 * @throws When the file holds no viewBox.
 */
function readLogoRatio(id: string): number {
  const path = join(HORIZONTAL_LOGO_DIR, `${id}-advantage.svg`);
  const source = readFileSync(path, "utf8");
  const match = /viewBox="([^"]+)"/.exec(source);
  if (match === null) {
    throw new Error(`no viewBox in ${path}`);
  }
  const parts = (match[1] ?? "").split(/\s+/).map(Number);
  const width = parts[2] ?? 0;
  const height = parts[3] ?? 0;
  if (height === 0) {
    throw new Error(`the viewBox of ${path} has no height`);
  }
  return width / height;
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
    // The home dark capture is a copy of the home light capture. The site has no
    // dark theme. A bad pair must use two pages that really differ.
    const home = loadCapture("en-home-light.png");
    const math = loadCapture("en-math-light.png");
    const share = pairDifferenceShare(home, math);
    expect(
      share,
      `the home and the math page differ in ${(share * 100).toFixed(2)} percent of bytes`,
    ).toBeGreaterThan(MAX_PAIR_DIFFERENCE_SHARE);
    const verdict = pairShowsSamePage(home, math);
    expect(verdict.ok, verdict.reason).toBe(false);
  });

  it("rejects a synthetic capture that scrolled to another region", () => {
    const home = loadCapture("en-home-light.png");
    const other = buildDifferentScrollCapture(home);
    const verdict = pairShowsSamePage(home, other);
    expect(verdict.ok, verdict.reason).toBe(false);
    expect(verdict.share).toBeGreaterThan(MAX_PAIR_DIFFERENCE_SHARE);
  });

  it("rejects a capture that lacks the brand colour", () => {
    const solid = decodePng(
      encodeSolidPng(EXPECTED_WIDTH, EXPECTED_HEIGHT, 255, 255, 255),
    );
    expect(countPixelsOfColour(solid, HORIZONTAL_LOCKUP_COLOUR)).toBe(0);
  });

  it("rejects a Capture type with a required scroll key", () => {
    const source = readFileSync(CAPTURE_SPEC_PATH, "utf8");
    const typeSource = readBlock(source, "type Capture = {", "};");
    expect(findCaptureTypeDefects(typeSource)).toEqual([]);
    const broken = typeSource.replace("scroll?:", "scroll:");
    expect(findCaptureTypeDefects(broken).length).toBeGreaterThan(0);
  });

  it("rejects a dark capture without a light twin", () => {
    const source = readFileSync(CAPTURE_SPEC_PATH, "utf8");
    expect(findCaptureArrayDefects(source)).toEqual([]);
    const broken = source.replace(
      '{ name: "en-home-dark.png", path: "/en", scroll: "homeCards", dark: true }',
      '{ name: "en-home-dark.png", path: "/en", dark: true }',
    );
    expect(broken).not.toBe(source);
    const defects = findCaptureArrayDefects(broken);
    expect(defects.length).toBeGreaterThan(0);
    expect(defects.join(" ")).toContain("en-home-dark.png");
  });

  it("rejects a vacuous image count rule", () => {
    const source = readFileSync(CAPTURE_SPEC_PATH, "utf8");
    expect(find404RuleDefects(source)).toEqual([]);
    const broken = source.replace(".toBeGreaterThan(0)", ".toBeGreaterThanOrEqual(0)");
    const defects = find404RuleDefects(broken);
    expect(defects.length).toBeGreaterThan(0);
    expect(defects.join(" ")).toContain("image count");
  });

  it("rejects a spec without a wait after the scroll", () => {
    const source = readFileSync(CAPTURE_SPEC_PATH, "utf8");
    const broken = source.replace(
      'await page.waitForLoadState("networkidle");',
      "",
    );
    expect(broken).not.toBe(source);
    const defects = find404RuleDefects(broken);
    expect(defects.length).toBeGreaterThan(0);
    expect(defects.join(" ")).toContain("network idle wait");
  });

  it("rejects an app source file that sets a dark class", () => {
    const files: SourceFile[] = [
      { path: "src/app/example.tsx", source: 'body.classList.add("dark");' },
      { path: "src/app/example.tsx", source: 'className="dark:bg-black"' },
      {
        path: "src/app/globals.css",
        source: "@media (prefers-color-scheme: dark) { body { color: white; } }",
      },
    ];
    expect(findDarkThemeDefects(files).length).toBe(3);
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

describe("every capture measures the viewport of the capture spec", () => {
  it("uses a 1280 by 800 viewport in the capture spec", () => {
    const source = readFileSync(CAPTURE_SPEC_PATH, "utf8");
    const viewport = readSpecViewport(source);
    expect(viewport.width).toBe(EXPECTED_WIDTH);
    expect(viewport.height).toBe(EXPECTED_HEIGHT);
  });

  it.each(CAPTURE_NAMES)("%s carries the viewport size", (name) => {
    const source = readFileSync(CAPTURE_SPEC_PATH, "utf8");
    const viewport = readSpecViewport(source);
    const header = readPngHeader(readFileSync(join(CAPTURES_DIR, name)));
    expect(
      header.width === viewport.width && header.height === viewport.height,
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
      const verdict = pairShowsSamePage(loadCapture(light), loadCapture(dark));
      expect(
        verdict.ok,
        `${light} and ${dark} differ in ${(verdict.share * 100).toFixed(2)} percent of bytes. ${verdict.reason}`,
      ).toBe(true);
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

describe("every product page capture holds the ink of its own logo", () => {
  it.each(PRODUCT_PAGE_INK)(
    "%s holds the ink of %s",
    (capture, logoFile, hex, least) => {
      const source = readFileSync(join(LOGO_DIR, logoFile), "utf8");
      expect(
        source.toLowerCase().includes(hex),
        `${logoFile} does not hold the ink ${hex}`,
      ).toBe(true);
      const matches = countPixelsOfColour(loadCapture(capture), hex);
      expect(
        matches,
        `${capture} holds ${matches} pixels of ${hex}`,
      ).toBeGreaterThanOrEqual(least);
    },
  );
});

describe("no single product page holds the ink of another product", () => {
  it.each(CAPTURE_OWN_INK)("%s holds no foreign logo ink", (capture, own) => {
    const image = loadCapture(capture);
    for (const [product, hex] of PRODUCT_ARTWORK_COLOURS) {
      if (hex === own) {
        continue;
      }
      const matches = countPixelsOfColour(image, hex);
      expect(
        matches,
        `${capture} holds ${matches} pixels of the ${product} logo ${hex}`,
      ).toBeLessThan(MAX_FOREIGN_INK);
    }
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

describe("the capture spec declares one Capture type", () => {
  it("holds the optional scroll, footer and dark keys", () => {
    const source = readFileSync(CAPTURE_SPEC_PATH, "utf8");
    const typeSource = readBlock(source, "type Capture = {", "};");
    const defects = findCaptureTypeDefects(typeSource);
    expect(defects, defects.join(" ")).toEqual([]);
  });
});

describe("every dark capture has a light twin on the same route", () => {
  it("holds the 15 entries without a defect", () => {
    const source = readFileSync(CAPTURE_SPEC_PATH, "utf8");
    const defects = findCaptureArrayDefects(source);
    expect(defects, defects.join(" ")).toEqual([]);
  });

  it("names the two documented dark captures", () => {
    const source = readFileSync(CAPTURE_SPEC_PATH, "utf8");
    const dark = parseCaptureEntries(source)
      .filter((entry) => entry.dark)
      .map((entry) => entry.name);
    expect(dark.sort()).toEqual(["en-home-dark.png", "en-tutor-dark.png"]);
  });
});

describe("the capture spec holds a live 404 rule", () => {
  it("counts the image responses and holds no 404 image", () => {
    const source = readFileSync(CAPTURE_SPEC_PATH, "utf8");
    const defects = find404RuleDefects(source);
    expect(defects, defects.join(" ")).toEqual([]);
  });
});

describe("the site has no dark theme", () => {
  it("holds no dark class setter, dark variant or theme package", () => {
    const defects = findDarkThemeDefects(readAppSourceFiles());
    expect(defects, defects.join(" ")).toEqual([]);
  });

  it("names no theme package in the app manifest", () => {
    const manifest = JSON.parse(
      readFileSync(join(APP_ROOT, "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = Object.keys({
      ...(manifest.dependencies ?? {}),
      ...(manifest.devDependencies ?? {}),
    });
    const themes = names.filter((name) => /theme|dark|night/i.test(name));
    expect(themes, `theme packages: ${themes.join(", ")}`).toEqual([]);
  });

  it("states the dark fact in the plan", () => {
    const plan = readFileSync(PLAN_PATH, "utf8");
    expect(/no dark (theme|mode)/i.test(plan)).toBe(true);
  });
});

describe("the home dark capture is a copy of the home light capture", () => {
  it("holds the same bytes", () => {
    const light = readFileSync(join(CAPTURES_DIR, "en-home-light.png"));
    const dark = readFileSync(join(CAPTURES_DIR, "en-home-dark.png"));
    expect(bytesDiffer(light, dark)).toBe(false);
  });
});

describe("the tutor pair differs only in the pulsing Live Now dot", () => {
  it("holds the difference inside one small box", () => {
    const box = differingPixelBox(
      loadCapture("en-tutor-light.png"),
      loadCapture("en-tutor-dark.png"),
    );
    expect(
      box.pixels,
      `the tutor pair differs in ${box.pixels} pixels`,
    ).toBeGreaterThan(0);
    expect(
      box.maxX - box.minX + 1,
      `the difference box holds the width ${box.maxX - box.minX + 1}`,
    ).toBeLessThanOrEqual(MAX_DARK_DIFFERENCE_BOX);
    expect(
      box.maxY - box.minY + 1,
      `the difference box holds the height ${box.maxY - box.minY + 1}`,
    ).toBeLessThanOrEqual(MAX_DARK_DIFFERENCE_BOX);
  });
});

describe("the colour lockup assets keep a usable ratio", () => {
  it.each(PRODUCT_IDS)("%s holds a ratio between 2.3 and 3.3", (id) => {
    const ratio = readLogoRatio(id);
    expect(ratio, `${id} holds the ratio ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(
      2.3,
    );
    expect(ratio, `${id} holds the ratio ${ratio.toFixed(2)}`).toBeLessThanOrEqual(
      3.3,
    );
  });

  it("does not give the ten lockups one shared ratio", () => {
    const ratios = PRODUCT_IDS.map((id) => readLogoRatio(id));
    const lowest = Math.min(...ratios);
    const highest = Math.max(...ratios);
    expect(
      highest - lowest,
      `the ratios run from ${lowest.toFixed(2)} to ${highest.toFixed(2)}`,
    ).toBeGreaterThan(0.5);
  });
});
