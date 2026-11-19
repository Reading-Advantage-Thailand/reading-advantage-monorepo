/**
 * Phase 3 adversarial probes for the Tutor Advantage page (track
 * www_tutor_calculator_20261117; review finding C-P3-r2-3, AC-17, AC-22, AC-23, D-19).
 *
 * The page renders here through the real next-intl message engine (`createTranslator`),
 * the engine that production uses, and not through a fake that returns raw strings. So
 * the literal `{n}` value that the page passes for `calculator.graph.legBar` is proven
 * where it matters: each leg row of the graph reads Leg 1, Leg 2, and so on. A mutant
 * translator that rewrites the value to "1" shows that the numbering check can fail.
 *
 * The image checks scan every attribute of the whole document, head included, so a banned
 * file cannot hide in a srcset, a preload link, or a style. Each scan has controls that
 * prove it fires on every carrier. No case reads production source as text, and no case
 * computes a hash. Files read here are public image files inside the repository.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { createTranslator } from "next-intl";
import { getScopedI18n } from "@/locales/server";
import { en, th, zh } from "@/locales/pages/products/tutor-advantage";
import TutorAdvantage from "@/app/[locale]/(marketing)/products/tutor-advantage/page";
import { NETWORK_PRESETS, calculateNetwork } from "@/lib/tutor-commission";

const LOCALES = ["en", "th", "zh"] as const;
type Locale = (typeof LOCALES)[number];
type Dict = Record<string, unknown>;
type Values = Record<string, unknown>;
type Translate = (key: string, values?: Values) => string;
type Rewrite = (key: string, values?: Values) => Values | undefined;

const DICTS: Record<Locale, Dict> = {
  en: en as unknown as Dict,
  th: th as unknown as Dict,
  zh: zh as unknown as Dict,
};

/** What the engine saw during one render. */
type Trace = { errors: string[]; keys: string[] };

const makeTranslator = createTranslator as unknown as (config: {
  locale: string;
  messages: Dict;
  namespace: string;
  onError: (error: { code: string; message: string }) => void;
}) => Translate;

/**
 * Reads one string from a dictionary by dotted path.
 * @param locale The locale.
 * @param path The dotted path, array indexes included.
 * @returns The string.
 */
function text(locale: Locale, path: string): string {
  let current: unknown = DICTS[locale];
  for (const part of path.split(".")) {
    if (current === null || typeof current !== "object") throw new Error(`missing ${path}`);
    current = (current as Dict)[part];
  }
  if (typeof current !== "string") throw new Error(`not text: ${path}`);
  return current;
}

/** Restores the key-path mock of `src/test/setup.ts`. */
function restoreMock(): void {
  vi.mocked(getScopedI18n).mockImplementation((scope) => {
    const translator = ((key: string) =>
      key.endsWith(".image")
        ? "/images/placeholder.png"
        : `${String(scope)}.${key}`) as Awaited<ReturnType<typeof getScopedI18n>>;
    return Promise.resolve(translator);
  });
}

/**
 * Renders the page through the real message engine.
 * @param locale The locale.
 * @param rewrite An optional rewrite of the values the page passes, for a mutant control.
 * @returns What the engine saw.
 */
async function renderPage(locale: Locale, rewrite?: Rewrite): Promise<Trace> {
  const trace: Trace = { errors: [], keys: [] };
  vi.mocked(getScopedI18n).mockImplementation(((scope: string) => {
    const base = makeTranslator({
      locale,
      messages: { pages: { products: { tutorAdvantage: DICTS[locale] } } },
      namespace: scope,
      onError: (error) => {
        trace.errors.push(`${error.code}: ${error.message}`);
      },
    });
    const translate: Translate = (key, values) => {
      trace.keys.push(key);
      return base(key, rewrite ? rewrite(key, values) : values);
    };
    return Promise.resolve(translate);
  }) as never);
  const jsx = await TutorAdvantage({ params: Promise.resolve({ locale }) });
  render(jsx);
  return trace;
}

afterEach(() => {
  cleanup();
  restoreMock();
});

/* -------------------------------------------------------------------------- */
/* Calculator access on the page                                              */
/* -------------------------------------------------------------------------- */

/**
 * Returns the calculator section of the rendered page.
 * @returns The section.
 */
function calculator(): HTMLElement {
  const node = document.querySelector<HTMLElement>("[data-testid='tutor-calculator']");
  if (!node) throw new Error("no calculator section");
  return node;
}

/**
 * Finds the one button of the calculator with a given visible text.
 * @param label The text.
 * @returns The button.
 */
function buttonNamed(label: string): HTMLElement {
  const found = Array.from(calculator().querySelectorAll("button")).filter(
    (node) => (node.textContent ?? "").trim() === label,
  );
  if (found.length !== 1) throw new Error(`${found.length} buttons read ${label}`);
  return found[0]!;
}

/**
 * Reads the leg labels of the graph, in order.
 * @param locale The locale.
 * @returns The label texts.
 */
function legLabels(locale: Locale): string[] {
  const [prefix = "", suffix = ""] = text(locale, "calculator.graph.legBar").split("{n}");
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^\\s*${escape(prefix)}(\\d+)${escape(suffix)}\\s*$`);
  return Array.from(calculator().querySelectorAll<HTMLElement>("span"))
    .filter((node) => node.children.length === 0 && pattern.test(node.textContent ?? ""))
    .map((node) => (node.textContent ?? "").trim());
}

/**
 * Builds the leg labels the visitor must read for a number of legs.
 * @param locale The locale.
 * @param count The number of legs.
 * @returns The labels Leg 1 to Leg n in the locale.
 */
function expectedLabels(locale: Locale, count: number): string[] {
  return Array.from({ length: count }, (_item, index) =>
    text(locale, "calculator.graph.legBar").replace("{n}", String(index + 1)),
  );
}

const presetName = (locale: Locale, index: number) =>
  text(locale, `calculator.presets.${index}.name`);

/* -------------------------------------------------------------------------- */
/* The engine and the literal {n}                                             */
/* -------------------------------------------------------------------------- */

describe("P1 the page formats cleanly through the real engine", () => {
  for (const locale of LOCALES) {
    it(`${locale}: no formatting error, no missing message, and the engine saw the page keys`, async () => {
      const trace = await renderPage(locale);
      expect(trace.errors, `${locale} engine errors`).toEqual([]);
      expect(trace.keys).toContain("calculator.graph.legBar");
      // The page asks for well over 100 distinct keys; a small count means a vacuous run.
      expect(new Set(trace.keys).size).toBeGreaterThan(120);
    });
  }
});

describe("P2 each leg row reads its own numeral (C-P3-r2-3, design rule 11)", () => {
  for (const locale of LOCALES) {
    it(`${locale}: the rows read ${text(locale, "calculator.graph.legBar").replace("{n}", "1")}, 2, and so on, after presets, Add, and Remove`, async () => {
      const trace = await renderPage(locale);
      expect(legLabels(locale)).toEqual([]);

      fireEvent.click(buttonNamed(presetName(locale, 2)));
      expect(legLabels(locale), "preset 3").toEqual(expectedLabels(locale, 3));

      fireEvent.click(buttonNamed(presetName(locale, 1)));
      expect(legLabels(locale), "preset 2").toEqual(expectedLabels(locale, 2));

      fireEvent.click(buttonNamed(text(locale, "calculator.inputs.addLeg")));
      fireEvent.click(buttonNamed(text(locale, "calculator.inputs.addLeg")));
      expect(legLabels(locale), "preset 2 then two adds").toEqual(expectedLabels(locale, 4));

      for (let removed = 3; removed >= 0; removed -= 1) {
        fireEvent.click(buttonNamed(text(locale, "calculator.inputs.removeLeg")));
        expect(legLabels(locale), `after remove to ${removed}`).toEqual(
          expectedLabels(locale, removed),
        );
      }
      expect(trace.errors).toEqual([]);
    });
  }

  it("control: a page that passes { n: '1' } makes every row read the same numeral", async () => {
    const rewrite: Rewrite = (key, values) =>
      key === "calculator.graph.legBar" ? { ...values, n: "1" } : values;
    await renderPage("en", rewrite);
    fireEvent.click(buttonNamed(presetName("en", 2)));
    const labels = legLabels("en");
    expect(labels).toEqual(["Leg 1", "Leg 1", "Leg 1"]);
    // The numbering check of P2 must reject this page.
    expect(labels).not.toEqual(expectedLabels("en", 3));
  });

  it("control: a page that passes no value makes the engine fail and the rows lose the numeral", async () => {
    const rewrite: Rewrite = (key, values) =>
      key === "calculator.graph.legBar" ? undefined : values;
    const trace = await renderPage("en", rewrite);
    expect(trace.errors.some((line) => line.includes('"n"'))).toBe(true);
    fireEvent.click(buttonNamed(presetName("en", 2)));
    expect(legLabels("en")).not.toEqual(expectedLabels("en", 3));
  });
});

/* -------------------------------------------------------------------------- */
/* The image map                                                              */
/* -------------------------------------------------------------------------- */

/** Files that no part of the page may show (spec D-19). */
const BANNED = [
  "/media/images/classroom/",
  "/media/images/primary/primary-book",
  "/media/images/chibi/",
  "/media/images/tutor/tutor-question",
] as const;

/**
 * Decodes a URL text up to three times and lowercases it.
 * @param value The text.
 * @returns The decoded text.
 */
function decodeAll(value: string): string {
  let current = value;
  for (let pass = 0; pass < 3; pass += 1) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
    } catch {
      break;
    }
  }
  return current.toLowerCase();
}

/**
 * Scans every attribute and every style text below a root for a banned file.
 * @param root The root element.
 * @returns One line for each hit.
 */
function scanBanned(root: Element): string[] {
  const hits: string[] = [];
  for (const node of [root, ...Array.from(root.querySelectorAll("*"))]) {
    const carriers = Array.from(node.attributes).map((attribute) => `${attribute.name}=${attribute.value}`);
    if (node.tagName === "STYLE") carriers.push(node.textContent ?? "");
    for (const carrier of carriers) {
      const decoded = decodeAll(carrier);
      for (const banned of BANNED) {
        if (decoded.includes(banned)) hits.push(`${node.tagName.toLowerCase()} shows ${banned}`);
      }
    }
  }
  return hits;
}

/**
 * Reads the pixel size of a webp or jpeg from its header bytes.
 * @param bytes The file bytes.
 * @returns The width and height.
 */
function rasterSize(bytes: Buffer): { width: number; height: number } {
  if (bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP") {
    const chunk = bytes.subarray(12, 16).toString("latin1");
    if (chunk === "VP8 ") {
      return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === "VP8L") {
      const bits = bytes.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") {
      return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
    }
    throw new Error(`unsupported webp chunk ${chunk}`);
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1]!;
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
      }
      offset += 2 + bytes.readUInt16BE(offset + 2);
    }
  }
  throw new Error("unsupported image file");
}

/** One image of the rendered page. */
type PageImage = {
  file: string;
  alt: string;
  width: number;
  height: number;
  loading: string | null;
  fetchPriority: string | null;
};

/**
 * Lists the images of the rendered page in DOM order, with the optimizer URL unwrapped.
 * @returns One record for each img element.
 */
function pageImages(): PageImage[] {
  return Array.from(document.querySelectorAll("img")).map((img) => {
    const src = img.getAttribute("src") ?? "";
    const nested = new URL(src, "http://localhost").searchParams.get("url");
    return {
      file: nested ?? src,
      alt: img.getAttribute("alt") ?? "",
      width: Number(img.getAttribute("width")),
      height: Number(img.getAttribute("height")),
      loading: img.getAttribute("loading"),
      fetchPriority: img.getAttribute("fetchpriority"),
    };
  });
}

/**
 * Builds the content images the page must show, in order (spec D-19).
 * @param locale The locale.
 * @returns The file and alt of each content image.
 */
function expectedContentImages(locale: Locale): Array<{ file: string; alt: string }> {
  return [
    { file: "/images/tutor-advantage-hero-2026-11-06.webp", alt: text(locale, "heroExtra.imageAlt") },
    { file: "/images/products/primary-origins-2-cover.webp", alt: text(locale, "books.items.0.alt") },
    { file: "/images/products/primary-origins-3-1-cover.webp", alt: text(locale, "books.items.1.alt") },
    { file: "/images/products/reading-origins-2-cover.webp", alt: text(locale, "books.items.2.alt") },
    { file: "/images/primary-advantage/reedy-preview.webp", alt: text(locale, "reedyBlock.alt") },
    { file: "/images/tutor-advantage-teach-class.webp", alt: text(locale, "tutorRole.alt") },
    ...[
      "040-screen.webp",
      "002-screen.webp",
      "004-screen.webp",
      "052-screen.webp",
      "064-screen.webp",
    ].map((name, index) => ({
      file: `/images/products/tutor-advantage/student-mobile/${name}`,
      alt: text(locale, `screens.items.${index}.alt`),
    })),
  ];
}

describe("P3 the image map of the whole page (AC-22, AC-23)", () => {
  it("control: the banned scan fires on every carrier of every banned file", () => {
    for (const banned of BANNED) {
      const file = `${banned}x.webp`;
      const encoded = encodeURIComponent(file);
      const carriers = [
        `<img src="${file}" alt="">`,
        `<img src="/_next/image?url=${encoded}&w=640&q=75" alt="">`,
        `<img src="/a.webp" srcset="/_next/image?url=${encodeURIComponent(encoded)}&w=64 64w" alt="">`,
        `<picture><source srcset="${file} 1x"></picture>`,
        `<link rel="preload" as="image" imagesrcset="/_next/image?url=${encoded}&w=256 256w">`,
        `<div style="background-image: url('${file}')"></div>`,
        `<div data-bg="${file.toUpperCase()}"></div>`,
        `<style>.hero { background: url(${file}); }</style>`,
      ];
      for (const carrier of carriers) {
        const box = document.createElement("div");
        box.innerHTML = carrier;
        expect(scanBanned(box), carrier).not.toEqual([]);
      }
    }
    const clean = document.createElement("div");
    clean.innerHTML =
      '<img src="/_next/image?url=%2Fimages%2Fproducts%2Fprimary-origins-2-cover.webp&w=640" alt="">' +
      '<img src="/media/images/primary/primary-origins.png" alt=""><img src="/media/brand/logo.svg" alt="">';
    expect(scanBanned(clean)).toEqual([]);
  });

  for (const locale of LOCALES) {
    it(`${locale}: shows no banned file in any attribute of the document, head included`, async () => {
      await renderPage(locale);
      fireEvent.click(buttonNamed(presetName(locale, 2)));
      expect(document.querySelectorAll("img").length).toBeGreaterThan(10);
      expect(scanBanned(document.documentElement)).toEqual([]);
    });

    it(`${locale}: shows the content images in the D-19 order, each file real and sized as declared`, async () => {
      await renderPage(locale);
      const images = pageImages();
      const content = images.filter((image) => !image.file.startsWith("/media/brand/"));
      expect(content.map(({ file, alt }) => ({ file, alt }))).toEqual(expectedContentImages(locale));

      for (const image of content) {
        const path = join(process.cwd(), "public", image.file);
        expect(existsSync(path), `${image.file} exists`).toBe(true);
        expect(rasterSize(readFileSync(path)), `${image.file} declared size`).toEqual({
          width: image.width,
          height: image.height,
        });
      }
      for (const image of images.filter((item) => item.file.startsWith("/media/brand/"))) {
        expect(existsSync(join(process.cwd(), "public", image.file)), `${image.file} exists`).toBe(true);
      }
    });

    it(`${locale}: only the hero is eager and only the hero is preloaded`, async () => {
      await renderPage(locale);
      const images = pageImages().filter((image) => !image.file.startsWith("/media/brand/"));
      const eager = images.filter(
        (image) => image.loading === "eager" || image.fetchPriority === "high",
      );
      expect(eager.map((image) => image.alt)).toEqual([text(locale, "heroExtra.imageAlt")]);
      for (const image of images.slice(1)) expect(image.loading, image.file).toBe("lazy");

      const preloads = Array.from(document.head.querySelectorAll('link[rel="preload"][as="image"]'));
      for (const link of preloads) {
        expect(decodeAll(link.getAttribute("imagesrcset") ?? "")).toContain(
          "/images/tutor-advantage-hero-2026-11-06.webp",
        );
      }
    });
  }
});

/* -------------------------------------------------------------------------- */
/* No downline wording                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Finds banned downline wording in rendered HTML, attributes included. No line is
 * filtered, so a hit beside the words "never" or "do not" still counts.
 * @param html The rendered HTML.
 * @returns The banned terms found.
 */
function findDownline(html: string): string[] {
  const flat = html.replace(/&[a-z]+;/gi, " ");
  const patterns: Array<[string, RegExp]> = [
    ["downline", /down[\s\-_]*line/i],
    ["ดาวน์ไลน์", /ดาวน์\s*ไลน์/u],
    ["ดาวไลน์", /ดาว\s*ไลน์/u],
  ];
  return patterns.filter(([, pattern]) => pattern.test(flat)).map(([name]) => name);
}

describe("P4 no downline wording on the page before and after each preset (AC-17)", () => {
  it("control: the scanner keeps a hit that sits beside a filter word", () => {
    for (const probe of [
      "We never show a Downline deduction here",
      "Do not call it a down-line",
      '<img alt="no downline">',
      "no ดาวน์ไลน์ here",
      "ไม่มี ดาวน์ ไลน์",
    ]) {
      expect(findDownline(probe), probe).not.toEqual([]);
    }
    expect(findDownline("Commission of each leg earns 8,010 baht")).toEqual([]);
  });

  for (const locale of LOCALES) {
    it(`${locale}: holds no downline wording in the document, head and attributes included`, async () => {
      await renderPage(locale);
      const html = () => document.documentElement.outerHTML;
      expect(findDownline(html()), "first paint").toEqual([]);
      for (let index = 0; index < 3; index += 1) {
        fireEvent.click(buttonNamed(presetName(locale, index)));
        expect(findDownline(html()), `preset ${index + 1}`).toEqual([]);
        fireEvent.click(buttonNamed(text(locale, "calculator.inputs.addLeg")));
        expect(findDownline(html()), `preset ${index + 1} then add`).toEqual([]);
        fireEvent.click(buttonNamed(text(locale, "calculator.inputs.removeLeg")));
        expect(findDownline(html()), `preset ${index + 1} then remove`).toEqual([]);
      }
    });
  }
});

/* -------------------------------------------------------------------------- */
/* The preset example lines and the live figures                              */
/* -------------------------------------------------------------------------- */

/**
 * Builds the figures that a preset example line must quote, from the live module.
 * @param index The preset index.
 * @returns The expected number tokens, in reading order.
 */
function quotedTokens(index: number): string[] {
  const result = calculateNetwork(NETWORK_PRESETS[index]!);
  const whole = (value: number) =>
    String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const rate = `${Math.round(result.rate * 1000) / 10}%`;
  const tokens = [whole(result.networkVolume), rate, whole(result.gross)];
  if (result.legs.length > 0) tokens.push(whole(result.legPayouts), whole(result.preTax));
  tokens.push(whole(result.net));
  return tokens;
}

describe("P5 each preset example line quotes the live figures (D-2)", () => {
  for (const locale of LOCALES) {
    it(`${locale}: the result line of each preset holds the module figures in order`, async () => {
      await renderPage(locale);
      for (let index = 0; index < 3; index += 1) {
        fireEvent.click(buttonNamed(presetName(locale, index)));
        const line = text(locale, `calculator.presets.${index}.result`);
        expect(calculator().textContent ?? "").toContain(line);
        const numbers: string[] = line.match(/\d[\d,]*(?:\.\d+)?%?/g) ?? [];
        let from = 0;
        for (const token of quotedTokens(index)) {
          const at = numbers.indexOf(token, from);
          expect(at, `${locale} preset ${index + 1} quotes ${token}`).toBeGreaterThanOrEqual(0);
          from = at + 1;
        }
      }
    });
  }
});
