/**
 * AC-22 (Phase 3, task 3.5c): every block of /products/tutor-advantage shows the
 * file and the alt text of spec D-19 in en, th, and zh. The page is rendered with
 * the real dictionaries, so the alt assertion reads the copy the visitor reads.
 * No case reads production source as text and no case computes a hash.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { getScopedI18n } from "@/locales/server";
import { en, th, zh } from "@/locales/pages/products/tutor-advantage";
import TutorAdvantage from "@/app/[locale]/(marketing)/products/tutor-advantage/page";

type Dict = Record<string, unknown>;
const REAL: Record<string, Dict> = {
  en: en as unknown as Dict,
  th: th as unknown as Dict,
  zh: zh as unknown as Dict,
};

const LOCALES = ["en", "th", "zh"] as const;
type Locale = (typeof LOCALES)[number];

/** Resolves a scope-relative dotted key against one real dictionary. */
function resolve(dict: Dict, key: string): string {
  let cur: unknown = dict;
  for (const part of key.split(".")) {
    if (cur == null || typeof cur !== "object") return key;
    cur = (cur as Dict)[part];
  }
  return typeof cur === "string" ? cur : key;
}

/** Reads one string from a real dictionary and fails on a missing path. */
function text(locale: Locale, path: string): string {
  let cur: unknown = REAL[locale];
  for (const part of path.split(".")) {
    if (cur == null || typeof cur !== "object") throw new Error(`missing ${path}`);
    cur = (cur as Dict)[part];
  }
  if (typeof cur !== "string") throw new Error(`not text: ${path}`);
  return cur;
}

/** The hero file and alt of each locale (spec D-2, D-5; AC-14). */
const HERO = {
  en: {
    src: "/images/tutor-advantage-hero-2026-11-06.webp",
    alt: text("en", "heroExtra.imageAlt"),
  },
  th: {
    src: "/images/tutor-advantage-hero-2026-11-06.webp",
    alt: text("th", "heroExtra.imageAlt"),
  },
  zh: {
    src: "/images/tutor-advantage-hero-2026-11-06.webp",
    alt: text("zh", "heroExtra.imageAlt"),
  },
} as const;

/** The teach-class file and alt of each locale (spec D-3, D-5; AC-15). */
const TUTOR = {
  en: {
    src: "/images/tutor-advantage-teach-class.webp",
    alt: text("en", "tutorRole.alt"),
  },
  th: {
    src: "/images/tutor-advantage-teach-class.webp",
    alt: text("th", "tutorRole.alt"),
  },
  zh: {
    src: "/images/tutor-advantage-teach-class.webp",
    alt: text("zh", "tutorRole.alt"),
  },
} as const;

/** The three book cards in the order of the books keys (spec D-19 item 2). */
const BOOK_CARDS = [
  {
    name: "Primary Advantage Origins 2",
    src: "/images/products/primary-origins-2-cover.webp",
  },
  {
    name: "Primary Advantage Origins 3.1",
    src: "/images/products/primary-origins-3-1-cover.webp",
  },
  {
    name: "Reading Advantage Origins 2",
    src: "/images/products/reading-origins-2-cover.webp",
  },
] as const;

/** The Reedy block file and alt of each locale (spec D-19 item 3). */
const REEDY = {
  en: {
    src: "/images/primary-advantage/reedy-preview.webp",
    alt: "Reedy, the speaking coach, is marked Preview. A wizard avatar stands in a forest next to a Start talking button.",
  },
  th: {
    src: "/images/primary-advantage/reedy-preview.webp",
    alt: "รีดี้ โค้ชฝึกพูด มีป้ายทดลอง ตัวละครพ่อมดยืนอยู่ในป่าข้างปุ่มเริ่มพูดคุย",
  },
  zh: {
    src: "/images/primary-advantage/reedy-preview.webp",
    alt: "Reedy, the speaking coach, is marked Preview. A wizard avatar stands in a forest next to a Start talking button.",
  },
} as const;

/** The five student screens of the gallery, which stay as they are (spec D-19 item 5). */
const GALLERY = [
  "/images/products/tutor-advantage/student-mobile/040-screen.webp",
  "/images/products/tutor-advantage/student-mobile/002-screen.webp",
  "/images/products/tutor-advantage/student-mobile/004-screen.webp",
  "/images/products/tutor-advantage/student-mobile/052-screen.webp",
  "/images/products/tutor-advantage/student-mobile/064-screen.webp",
] as const;

/** Files that no block of the page may show (spec D-19). */
const BANNED = [
  "/media/images/classroom/",
  "/media/images/primary/primary-book",
  "/media/images/chibi/",
  "/media/images/tutor/tutor-question",
] as const;

/** The book cover alt of one locale (spec D-19 item 2). */
function bookAlt(locale: Locale, name: string): string {
  return locale === "th" ? `ปกหนังสือ ${name}` : `${name} book cover`;
}

/**
 * Lists the file references an img element carries, from src and srcset.
 * A `/_next/image?url=...` form also yields the nested file path.
 */
function fileRefs(img: Element): string[] {
  const raw = [img.getAttribute("src") ?? "", img.getAttribute("srcset") ?? ""].join(",");
  const refs: string[] = [];
  for (const part of raw.split(",")) {
    const token = decodeURIComponent(part.trim().split(/\s+/)[0] ?? "");
    if (!token) continue;
    refs.push(token);
    const nested = token.match(/[?&]url=([^&]+)/)?.[1];
    if (nested) refs.push(nested);
  }
  return refs;
}

/**
 * Returns the file reference an img element carries: the nested url of a
 * `/_next/image` src, or the src itself.
 */
function imgFile(img: Element): string {
  const src = img.getAttribute("src") ?? "";
  const nested = new URL(src, "http://localhost").searchParams.get("url");
  return nested ?? src;
}

/** Returns the single content image of a block, outside the brand logo files. */
function contentImage(root: Element): HTMLElement {
  const images = Array.from(root.querySelectorAll("img")).filter((img) => {
    const refs = fileRefs(img);
    return refs.length > 0 && !refs.every((ref) => ref.startsWith("/media/brand/"));
  });
  expect(images.length, "one content image in the block").toBe(1);
  return images[0]!;
}

/** Returns the section that holds the heading with the given text. */
function blockByHeading(heading: string): HTMLElement {
  const node = screen.getByRole("heading", { name: heading });
  const section = node.closest("section");
  if (!(section instanceof HTMLElement)) throw new Error(`no section for ${heading}`);
  return section;
}

/** Returns the section that holds the h1 of the page. */
function heroBlock(): HTMLElement {
  const heading = screen.getByRole("heading", { level: 1 });
  const section = heading.closest("section");
  if (!(section instanceof HTMLElement)) throw new Error("no hero section");
  return section;
}

/** Renders the page with the real messages of one locale. */
async function renderWithRealCopy(locale: Locale): Promise<void> {
  const dict = REAL[locale];
  vi.mocked(getScopedI18n).mockImplementation(() => {
    const translator = ((key: string) =>
      resolve(dict, key)) as Awaited<ReturnType<typeof getScopedI18n>>;

    return Promise.resolve(translator);
  });
  const jsx = await TutorAdvantage({ params: Promise.resolve({ locale }) });
  render(jsx);
}

afterEach(() => {
  cleanup();
  vi.mocked(getScopedI18n).mockImplementation((scope) => {
    const translator = ((key: string) =>
      key.endsWith(".image")
        ? "/images/placeholder.png"
        : `${String(scope)}.${key}`) as Awaited<ReturnType<typeof getScopedI18n>>;

    return Promise.resolve(translator);
  });
});

describe("AC-14: the hero image", () => {
  for (const locale of LOCALES) {
    it(`${locale}: shows the hero file with the hero alt`, async () => {
      await renderWithRealCopy(locale);
      const expected = HERO[locale];
      const picture = contentImage(heroBlock());
      expect(fileRefs(picture), `${locale} hero file`).toContain(expected.src);
      expect(picture.getAttribute("alt"), `${locale} hero alt`).toBe(expected.alt);
    });
  }

  it("en and zh hold one hero alt value (spec D-5)", () => {
    expect(HERO.en.alt).toBe(HERO.zh.alt);
  });
});

describe("AC-23: the hero image is the eager largest image", () => {
  it("en: the hero img loads eagerly or declares high fetch priority", async () => {
    await renderWithRealCopy("en");
    const picture = contentImage(heroBlock());
    const loading = picture.getAttribute("loading");
    const fetchPriority = picture.getAttribute("fetchpriority");
    expect(
      loading === "eager" || fetchPriority === "high",
      `hero loading=${String(loading)} fetchpriority=${String(fetchPriority)}`,
    ).toBe(true);
  });
});

describe("AC-22: the three book covers", () => {
  for (const locale of LOCALES) {
    it(`${locale}: shows each cover in the books order with its alt`, async () => {
      await renderWithRealCopy(locale);
      const section = blockByHeading(text(locale, "books.heading"));
      const cards = Array.from(section.querySelectorAll("li"));
      expect(cards.length, `${locale} book cards`).toBe(BOOK_CARDS.length);
      for (const [index, expected] of BOOK_CARDS.entries()) {
        const card = cards[index]!;
        expect(card.querySelector("h3")?.textContent, `${locale} card ${index + 1} name`).toBe(
          expected.name,
        );
        const picture = contentImage(card);
        expect(fileRefs(picture), `${locale} card ${index + 1} file`).toContain(expected.src);
        expect(picture.getAttribute("alt"), `${locale} card ${index + 1} alt`).toBe(
          bookAlt(locale, expected.name),
        );
      }
    });
  }
});

describe("AC-22: the Reedy block", () => {
  for (const locale of LOCALES) {
    it(`${locale}: shows the Reedy preview with the approved alt`, async () => {
      await renderWithRealCopy(locale);
      const expected = REEDY[locale];
      const picture = contentImage(blockByHeading(text(locale, "reedyBlock.heading")));
      expect(fileRefs(picture), `${locale} Reedy file`).toContain(expected.src);
      expect(picture.getAttribute("alt"), `${locale} Reedy alt`).toBe(expected.alt);
    });
  }
});

describe("AC-15: the become-a-tutor block", () => {
  for (const locale of LOCALES) {
    it(`${locale}: shows the teach-class file with the tutor alt`, async () => {
      await renderWithRealCopy(locale);
      const block = document.querySelector("#become-a-tutor");
      expect(block, `${locale} become-a-tutor block`).toBeInTheDocument();
      const picture = contentImage(block!);
      expect(fileRefs(picture), `${locale} tutor file`).toContain(TUTOR[locale].src);
      expect(picture.getAttribute("alt"), `${locale} tutor alt`).toBe(TUTOR[locale].alt);
    });
  }

  it("en and zh hold one tutor alt value (spec D-5)", () => {
    expect(TUTOR.en.alt).toBe(TUTOR.zh.alt);
  });
});

describe("AC-16: no image uses the old hero file", () => {
  for (const locale of LOCALES) {
    it(`${locale}: no img references tutor-advantage-hero.jpg`, async () => {
      await renderWithRealCopy(locale);
      const refs = Array.from(document.querySelectorAll("img")).flatMap((img) => fileRefs(img));
      expect(refs.length, `${locale} image references`).toBeGreaterThan(0);
      const hits = refs.filter((ref) => ref.includes("tutor-advantage-hero.jpg"));
      expect(hits, `${locale} old hero file references`).toEqual([]);
    });
  }
});

describe("AC-17: no two content images share a file", () => {
  for (const locale of LOCALES) {
    it(`${locale}: every content img shows a distinct file`, async () => {
      await renderWithRealCopy(locale);
      const files = Array.from(document.querySelectorAll("img"))
        .map((img) => imgFile(img))
        .filter((file) => file !== "" && !file.startsWith("/media/brand/"));
      expect(files.length, `${locale} content images`).toBeGreaterThan(0);
      const duplicates = files.filter((file, index) => files.indexOf(file) !== index);
      expect(duplicates, `${locale} files shown by two blocks`).toEqual([]);
    });
  }
});

describe("AC-2: the block image box keeps the full 16:9 frame", () => {
  for (const locale of LOCALES) {
    it(`${locale}: the become-a-tutor image box is aspect-video and not aspect-4/3`, async () => {
      await renderWithRealCopy(locale);
      const block = document.querySelector("#become-a-tutor");
      expect(block, `${locale} become-a-tutor block`).toBeInTheDocument();
      const picture = contentImage(block!);
      expect(picture.className, `${locale} block box class`).toContain("aspect-video");
      expect(picture.className, `${locale} block box class`).not.toContain("aspect-4/3");
    });
  }
});

describe("AC-22: the student gallery stays as it is", () => {
  for (const locale of LOCALES) {
    it(`${locale}: shows the five student screens in slot order`, async () => {
      await renderWithRealCopy(locale);
      const section = document.querySelector("[data-testid='tutor-screens']");
      expect(section, `${locale} gallery section`).toBeInTheDocument();
      const cards = Array.from(section!.querySelectorAll("li"));
      expect(cards.length, `${locale} gallery cards`).toBe(GALLERY.length);
      for (const [index, src] of GALLERY.entries()) {
        const picture = contentImage(cards[index]!);
        expect(fileRefs(picture), `${locale} gallery slot ${index + 1}`).toContain(src);
        expect(picture.getAttribute("alt"), `${locale} gallery alt ${index + 1}`).toBe(
          text(locale, `screens.items.${index}.alt`),
        );
      }
    });
  }
});

describe("AC-22: no block shows a banned image", () => {
  for (const locale of LOCALES) {
    it(`${locale}: shows no classroom, primary-book, chibi, or tutor-question file`, async () => {
      await renderWithRealCopy(locale);
      const refs = Array.from(document.querySelectorAll("img")).flatMap((img) => fileRefs(img));
      expect(refs.length, `${locale} image references`).toBeGreaterThan(0);
      for (const banned of BANNED) {
        const hits = refs.filter((ref) => ref.startsWith(banned));
        expect(hits, `${locale} must not show ${banned}`).toEqual([]);
      }
    });
  }
});

/**
 * Reads pixel dimensions from a webp header without decoding the image.
 * @param buf The leading bytes of a webp file.
 * @returns The width and height declared in the webp header.
 */
function webpSize(buf: Buffer): { width: number; height: number } {
  const chunkName = (at: number) => buf.subarray(at, at + 4).toString("latin1");
  if (buf.length < 30 || chunkName(0) !== "RIFF" || chunkName(8) !== "WEBP") {
    throw new Error("not a RIFF/WEBP file");
  }
  const chunk = chunkName(12);
  if (chunk === "VP8 ") {
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) {
      throw new Error("bad VP8 start code");
    }
    return {
      width: buf.readUInt16LE(26) & 0x3fff,
      height: buf.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return {
      width: buf.readUIntLE(24, 3) + 1,
      height: buf.readUIntLE(27, 3) + 1,
    };
  }
  throw new Error(`unsupported webp chunk ${chunk}`);
}

describe("AC-18: the two new picture files", () => {
  for (const name of [
    "tutor-advantage-hero-2026-11-06.webp",
    "tutor-advantage-teach-class.webp",
  ]) {
    it(`${name} is a 1920 by 1080 webp at or below 300 KB`, () => {
      const file = join(process.cwd(), "public", "images", name);
      const bytes = existsSync(file) ? readFileSync(file) : null;
      expect(bytes, `missing ${file}`).not.toBeNull();
      if (bytes === null) return;
      expect(webpSize(bytes), `${name} header size`).toEqual({ width: 1920, height: 1080 });
      expect(bytes.length, `${name} byte count`).toBeLessThanOrEqual(307_200);
    });
  }
});

describe("AC-22: the Origins 3.1 cover file", () => {
  it("is a 480 by 651 webp under public/images/products", () => {
    const file = join(
      process.cwd(),
      "public",
      "images",
      "products",
      "primary-origins-3-1-cover.webp",
    );
    const bytes = existsSync(file) ? readFileSync(file) : null;
    expect(bytes, `missing ${file}`).not.toBeNull();
    if (bytes === null) return;
    expect(webpSize(bytes)).toEqual({ width: 480, height: 651 });
  });
});
