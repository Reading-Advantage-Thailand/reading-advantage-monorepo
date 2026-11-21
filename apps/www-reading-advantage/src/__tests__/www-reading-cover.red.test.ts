import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import FeaturesPage from "@/app/[locale]/(marketing)/features/page";
import enMessages from "@/locales/en";

/*
 * Red r9 pins for F4 (track www_features_pricing_20261120, UX r7 at
 * cd50ca035): the 1200x576 strip of the Origins 2 cover reads as a
 * landscape banner, not a book cover, and breaks the "no banner crop"
 * picture rule. Default D-R9-1: the whole portrait cover keeps the title
 * band, so the "crop to the card ratio" part of D-R8-1 yields; the cover
 * sits in the card's width-limited picture column at its own portrait ratio
 * (object-contain or intrinsic, no crop). Source size measured 2026-11-21
 * from the read-only
 * advantage-pr/assets/sales-training/2027/source/decks/covers/RA-Origins-2-Front-Cover.jpg:
 * 1200x1628. The new (1) and (2) rows fail at cd50ca035 where the strip is
 * live; the (3) rows are regression guards for the other pictured cards.
 */

const APP_DIR = resolve(__dirname, "../..");
const FEATURES_PAGE = resolve(
  __dirname,
  "../app/[locale]/(marketing)/features/page.tsx",
);
const PROGRAM_CARD = resolve(
  __dirname,
  "../components/features/program-card.tsx",
);

/** Measured source cover size (portrait). */
const SOURCE_WIDTH = 1200;
const SOURCE_HEIGHT = 1628;

/** Relative aspect drift between two width/height pairs. */
function aspectDrift(
  outWidth: number,
  outHeight: number,
  boxWidth: number,
  boxHeight: number,
): number {
  return Math.abs(outWidth / outHeight - boxWidth / boxHeight) / (boxWidth / boxHeight);
}

/** Reads JPEG dimensions from the first SOF marker (standard library). */
function jpegSize(bytes: Buffer): { width: number; height: number } {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      (marker >= 0xd0 && marker <= 0xd7) ||
      marker === 0x01
    ) {
      offset += 2;
      continue;
    }
    const length = bytes.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  throw new Error("no JPEG SOF marker");
}

const hoisted = vi.hoisted(() => {
  const state: { messages: unknown } = { messages: {} };

  function readPath(root: unknown, path: string): unknown {
    let value: unknown = root;
    for (const segment of path.split(".")) {
      if (value === null || typeof value !== "object") return undefined;
      if (!(segment in (value as Record<string, unknown>))) return undefined;
      value = (value as Record<string, unknown>)[segment];
    }
    return value;
  }

  function makeTranslator(scope: string) {
    const prefix = scope ? `${scope}.` : "";
    const translate = (key: string): string => {
      const value = readPath(state.messages, `${prefix}${key}`);
      return typeof value === "string" ? value : `[[missing:${prefix}${key}]]`;
    };
    translate.raw = (key: string): unknown =>
      readPath(state.messages, `${prefix}${key}`);
    return translate;
  }

  return { state, makeTranslator, readPath };
});

vi.mock("@/locales/server", () => ({
  getI18n: vi.fn(() => Promise.resolve(hoisted.makeTranslator(""))),
  getScopedI18n: vi.fn((scope: string) =>
    Promise.resolve(hoisted.makeTranslator(scope)),
  ),
  getStaticParams: vi.fn(() => []),
}));

vi.mock("@/locales/client", () => ({
  useScopedI18n: vi.fn(
    (scope: string) => (key: string) => {
      const value = hoisted.readPath(
        hoisted.state.messages,
        scope ? `${scope}.${key}` : key,
      );
      return typeof value === "string" ? value : `[[missing:${scope}.${key}]]`;
    },
  ),
}));

/** Returns the reading entry dims declared in CARD_IMAGES. */
function readingDims(): { width: number; height: number } {
  const source = readFileSync(FEATURES_PAGE, "utf8");
  const block = source.split("CARD_IMAGES")[1] ?? "";
  const entry = block.split("reading:")[1]?.split("},")[0] ?? "";
  const width = Number(entry.match(/width:\s*(\d+)/)?.[1] ?? "0");
  const height = Number(entry.match(/height:\s*(\d+)/)?.[1] ?? "0");
  return { width, height };
}

/** Returns a CARD_IMAGES entry's src/alt/width/height by key. */
function cardEntry(key: string): Record<string, string> {
  const source = readFileSync(FEATURES_PAGE, "utf8");
  const block = source.split("CARD_IMAGES")[1] ?? "";
  const entry = block.split(`${key}:`)[1]?.split("},")[0] ?? "";
  const pick = (name: string): string =>
    entry.match(new RegExp(`${name}:\\s*("[^"]+"|\\d+)`))?.[1] ?? "";
  return { src: pick("src"), alt: pick("alt"), width: pick("width"), height: pick("height") };
}

/** Returns width/height attributes of the rendered reading image. */
function renderedReadingSize(): { width: number; height: number; className: string; alt: string } {
  const image = document.querySelector('[data-testid="program-card-reading"] img');
  return {
    width: Number(image?.getAttribute("width") ?? "0"),
    height: Number(image?.getAttribute("height") ?? "0"),
    className: image?.getAttribute("class") ?? "",
    alt: image?.getAttribute("alt") ?? "",
  };
}

afterEach(() => {
  cleanup();
});

describe("control: cover scanners resolve the source, file and page", () => {
  it("control: the JPEG reader decodes a crafted 1200x1628 SOF0 frame", () => {
    const bytes = Buffer.alloc(30, 0);
    bytes[0] = 0xff;
    bytes[1] = 0xd8;
    bytes[2] = 0xff;
    bytes[3] = 0xe0;
    bytes.writeUInt16BE(16, 4);
    bytes[20] = 0xff;
    bytes[21] = 0xc0;
    bytes.writeUInt16BE(11, 22);
    bytes[24] = 8;
    bytes.writeUInt16BE(1628, 25);
    bytes.writeUInt16BE(1200, 27);
    expect(jpegSize(bytes)).toEqual({ width: 1200, height: 1628 });
  });

  it("control: the recorded source ratio is portrait", () => {
    expect(SOURCE_WIDTH, "source width: 1200").toBe(1200);
    expect(SOURCE_HEIGHT, "source height: 1628").toBe(1628);
    expect(
      SOURCE_WIDTH < SOURCE_HEIGHT,
      "source cover: portrait",
    ).toBe(true);
  });

  it("control: the rendered reading card keeps the D13 alt", async () => {
    hoisted.state.messages = enMessages;
    render(await FeaturesPage());
    expect(renderedReadingSize().alt, "reading alt").toBe(
      "Reading Advantage Origins 2 book cover",
    );
  });
});

describe("F4: the reading asset is the whole portrait cover", () => {
  it("keeps the file aspect within 1% of the source cover", () => {
    const path = join(APP_DIR, "public/images/products/ra-origins-2-cover.jpg");
    const size = jpegSize(readFileSync(path));
    expect(
      aspectDrift(size.width, size.height, SOURCE_WIDTH, SOURCE_HEIGHT),
      `cover file aspect drift: at most 1% (file ${size.width}x${size.height})`,
    ).toBeLessThanOrEqual(0.01);
  });

  it("declares portrait dims for the reading card image", () => {
    const dims = readingDims();
    expect(
      aspectDrift(dims.width, dims.height, SOURCE_WIDTH, SOURCE_HEIGHT),
      `reading dims aspect drift: at most 1% (${dims.width}x${dims.height})`,
    ).toBeLessThanOrEqual(0.01);
  });
});

describe("F4: the rendered reading picture is not cropped", () => {
  beforeEach(async () => {
    hoisted.state.messages = enMessages;
    render(await FeaturesPage());
  });

  it("keeps the portrait ratio on the rendered reading image", () => {
    const size = renderedReadingSize();
    expect(
      aspectDrift(size.width, size.height, SOURCE_WIDTH, SOURCE_HEIGHT),
      `rendered reading aspect drift: at most 1% (${size.width}x${size.height})`,
    ).toBeLessThanOrEqual(0.01);
  });

  it("control: the rendered reading image uses no object-cover crop", () => {
    const className = renderedReadingSize().className;
    const crops =
      className.includes("object-cover") || className.includes("object-fill");
    const keepsRatio =
      className.includes("h-auto") ||
      className.includes("object-contain") ||
      /aspect-\[/.test(className);
    expect(
      crops && !keepsRatio,
      `reading image crops (class: ${className})`,
    ).toBe(false);
  });
});

describe("F4 regression: the other pictured cards are unchanged", () => {
  it("control: storytime keeps its approved source, dims and alt", () => {
    expect(cardEntry("storytime")).toEqual({
      src: '"/images/features/storytime-reader-card.webp"',
      alt: '"Storytime Advantage reader screen"',
      width: "366",
      height: "282",
    });
  });

  it("control: primary keeps its approved source, dims and alt", () => {
    expect(cardEntry("primary")).toEqual({
      src: '"/images/features/primary-lesson-step05.webp"',
      alt: '"Primary Advantage lesson screen"',
      width: "375",
      height: "622",
    });
  });

  it("control: the tutor leaderboard keeps its approved source and dims", () => {
    const source = readFileSync(FEATURES_PAGE, "utf8");
    expect(
      source.includes("/images/features/tutor-class-leaderboard.webp"),
      "tutor src: present",
    ).toBe(true);
    expect(
      source.includes("Tutor Advantage live class leaderboard screen"),
      "tutor alt: present",
    ).toBe(true);
  });
});
