import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import FeaturesPage from "@/app/[locale]/(marketing)/features/page";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";

/*
 * Red r8 pins for the PM look check 2026-11-21 (track
 * www_features_pricing_20261120). Pricing passed the PM look check; no
 * pricing pin is touched here.
 * (1) The Reading Advantage books card shows the printed cover of Reading
 * Advantage Origins 2, not the old grey "Article Selection" app screen.
 * Default D-R8-1: the new asset lives at
 * APP/public/images/products/ra-origins-2-cover.jpg (title band kept,
 * cropped to the card ratio) with the English alt of D13.
 * (2) The body sentence "Reading Advantage books are taught through Tutor
 * Advantage, not presented as a school app." is deleted in en, th and zh;
 * the status line stays.
 * (3) The Primary gap at md+: the featured row must not bottom-anchor its
 * bullet list in stretched space. Cause: the md:flex-row featured article
 * stretches its flex-1 text column to the picture height while the bullets
 * ul carries mt-auto, pinning the list to the bottom and opening the gap
 * above it. The pin accepts either fix (no mt-auto, or an items-start
 * cross-axis class on the featured article). If no clean pin existed this
 * would be left to the browser review; a source assertion catches the
 * cause, so it is pinned here.
 * Every new row fails at 4ccf4c879 for the right reason.
 */

const APP_DIR = resolve(__dirname, "../..");
const FEATURES_PAGE = resolve(
  __dirname,
  "../app/[locale]/(marketing)/features/page.tsx",
);

const COVER_SRC = "/images/products/ra-origins-2-cover.jpg";
const OLD_SRC = "/images/features/reading-article-selection.webp";
const DELETED_EN =
  "Reading Advantage books are taught through Tutor Advantage, not presented as a school app.";
const DELETED_TH =
  "หนังสือ Reading Advantage ใช้เรียนผ่าน Tutor Advantage ไม่ได้นำเสนอเป็นแอปสำหรับโรงเรียน";
const STATUS_EN =
  "Status: Reading Advantage Origins 2 is on sale through Tutor Advantage.";
const STATUS_TH =
  "Reading Advantage Origins 2 วางจำหน่ายผ่าน Tutor Advantage";

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

type Messages = Record<string, unknown>;

/** Collects every string leaf under a locale value. */
function collectLeaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectLeaves);
  if (value !== null && typeof value === "object") {
    return Object.values(value as Messages).flatMap(collectLeaves);
  }
  return [];
}

/** Reads the feature scope of a locale root. */
function featureLeaves(messages: unknown): string[] {
  const pages = (messages as Messages).pages as Messages;
  return collectLeaves(pages.feature);
}

const enLeaves = featureLeaves(enMessages);
const thLeaves = featureLeaves(thMessages);
const zhLeaves = featureLeaves(zhMessages);

/** Returns the CARD_IMAGES block of the features page. */
function cardImagesBlock(): string {
  const source = readFileSync(FEATURES_PAGE, "utf8");
  const afterKey = source.split("CARD_IMAGES")[1] ?? "";
  return afterKey.split("};")[0] ?? "";
}

/** Returns the src value of the reading entry in CARD_IMAGES. */
function readingSrc(): string {
  const block = cardImagesBlock();
  const entry = block.split("reading:")[1] ?? "";
  return entry.match(/src:\s*"([^"]+)"/)?.[1] ?? "";
}

/** Returns the rendered reading card image. */
function renderedReadingImage(): HTMLImageElement {
  const card = document.querySelector('[data-testid="program-card-reading"]');
  const image = card?.querySelector("img");
  expect(image, "the reading cover must render").not.toBeNull();
  return image as HTMLImageElement;
}

/** Returns the decoded local path of a Next image src attribute. */
function decodedSrc(image: HTMLImageElement): string {
  const src = image.getAttribute("src") ?? "";
  const encoded = /url=([^&]+)/.exec(src)?.[1] ?? src;
  return decodeURIComponent(encoded);
}

/** Computed values produced by the reading card's own layout utilities. */
function readingCardComputed(property: string): string {
  const card = document.querySelector('[data-testid="program-card-reading"]');
  expect(card, "the reading card must render").not.toBeNull();
  const utilities: Record<string, string> = {
    "md:items-start": "align-items: flex-start;",
    "mt-auto": "margin-top: auto;",
  };
  const declarations = ((card as HTMLElement).getAttribute("class") ?? "")
    .split(/\s+/)
    .map((token) => utilities[token] ?? "")
    .filter(Boolean)
    .join("\n");
  const style = document.createElement("style");
  style.textContent = `[data-probe="1"] { ${declarations} }`;
  document.head.appendChild(style);
  const probe = document.createElement("div");
  probe.setAttribute("data-probe", "1");
  document.body.appendChild(probe);
  const value = window.getComputedStyle(probe).getPropertyValue(property);
  document.body.removeChild(probe);
  style.remove();
  return value;
}

afterEach(() => {
  cleanup();
});

describe("control: reading-card scanners and the kept status line", () => {
  it("control: the CARD_IMAGES block names a reading src", () => {
    expect(readingSrc().length, "reading src: non-empty").toBeGreaterThan(0);
  });

  it("control: the status line stays in every locale source", () => {
    expect(enLeaves.includes(STATUS_EN), "en status: present").toBe(true);
    expect(thLeaves.includes(STATUS_TH), "th status: present").toBe(true);
    expect(zhLeaves.includes(STATUS_EN), "zh status: present").toBe(true);
  });

  it("control: the rendered reading card keeps its status line", async () => {
    hoisted.state.messages = enMessages;
    render(await FeaturesPage());
    const card = document.querySelector('[data-testid="program-card-reading"]');
    expect(card?.textContent ?? "", "status on card").toContain(STATUS_EN);
  });
});

describe("PM(1): the reading card shows the Origins 2 printed cover", () => {
  it("points the reading card at the new cover asset", async () => {
    hoisted.state.messages = enMessages;
    render(await FeaturesPage());
    expect(decodedSrc(renderedReadingImage()), "rendered cover src").toContain(
      COVER_SRC,
    );
  });

  it("no longer points the reading card at the old app screen", async () => {
    hoisted.state.messages = enMessages;
    render(await FeaturesPage());
    expect(decodedSrc(renderedReadingImage()), "old screenshot src").not.toContain(
      OLD_SRC,
    );
  });

  it("ships the cover file as a non-empty JPEG or WebP image", () => {
    const path = join(APP_DIR, "public", COVER_SRC.replace(/^\/+/, ""));
    let size = 0;
    let magic = "";
    try {
      size = statSync(path).size;
      const bytes = readFileSync(path);
      magic = bytes.subarray(0, 12).toString("binary");
    } catch {
      size = 0;
    }
    expect(size, "cover bytes: more than 0").toBeGreaterThan(0);
    const isJpeg = magic.charCodeAt(0) === 0xff && magic.charCodeAt(1) === 0xd8;
    const isWebP =
      magic.startsWith("RIFF") && magic.substring(8, 12) === "WEBP";
    expect(isJpeg || isWebP, "cover magic: JPEG or WebP").toBe(true);
  });

  it("renders a non-empty cover alt on the reading card per D13", async () => {
    hoisted.state.messages = enMessages;
    render(await FeaturesPage());
    expect(renderedReadingImage().getAttribute("alt")?.trim().length ?? 0).toBeGreaterThan(0);
  });
});

describe("PM(2): the taught-through sentence is gone", () => {
  it("absent from the en locale source", () => {
    expect(
      enLeaves.some((leaf) => leaf.includes(DELETED_EN)),
      "deleted en sentence: absent",
    ).toBe(false);
  });

  it("absent from the th locale source", () => {
    expect(
      thLeaves.some((leaf) => leaf.includes(DELETED_TH)),
      "deleted th sentence: absent",
    ).toBe(false);
  });

  it("absent from the zh locale source", () => {
    expect(
      zhLeaves.some((leaf) => leaf.includes(DELETED_EN)),
      "deleted sentence in zh: absent",
    ).toBe(false);
  });

  it.each([
    ["en", enMessages, DELETED_EN],
    ["th", thMessages, DELETED_TH],
    ["zh", zhMessages, DELETED_EN],
  ] as const)("absent from the rendered reading card in %s", async (
    _locale,
    messages,
    deleted,
  ) => {
    hoisted.state.messages = messages;
    render(await FeaturesPage());
    const card = document.querySelector('[data-testid="program-card-reading"]');
    expect(
      (card?.textContent ?? "").includes(deleted),
      `deleted sentence on card (${_locale}): absent`,
    ).toBe(false);
  });
});

describe("PM(3): the featured row does not bottom-anchor its bullets", () => {
  it("has no mt-auto list in stretched featured space", async () => {
    hoisted.state.messages = enMessages;
    render(await FeaturesPage());
    const card = document.querySelector(
      '[data-testid="program-card-reading"]',
    ) as HTMLElement;
    const list = card?.querySelector("ul");
    const listMargin = list
      ? window.getComputedStyle(list).getPropertyValue("margin-top")
      : "0px";
    expect(listMargin, "bullets are not bottom-anchored").not.toBe("auto");
    expect(
      readingCardComputed("align-items") || "flex-start",
      "featured cross-axis is top-aligned",
    ).toBe("flex-start");
  });
});
