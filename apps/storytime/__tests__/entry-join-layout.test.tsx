/**
 * The entry redesign of the "How to join" page (Phase 4, task 4.1, spec FR-A71, AC-A71.7,
 * AC-A71.8).
 *
 * The page is short: one hero line, exactly five icon tiles, two numbered steps under the
 * "How to get a login" heading, three contact buttons and one small contact-page text
 * link, and the sign-in button last. The contact channels are buttons, not raw URLs:
 * the visible text holds no URL. The hero line, step 2, the contact lead, and the button
 * labels are exact substrings of the approved C3 copy. Each tile holds a short title and
 * one complete sentence, and step 1 holds one complete sentence (PM decision 2026-11-20).
 *
 * At the base the first assertion of the J2 and J3 cases fails on the missing tile titles,
 * sentences, and step 1, because the page holds single-line tiles and the old step 1.
 * The page and the copy module are loaded only after the existsSync assertions, so no
 * case fails with a load error.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieSets = vi.hoisted(() => ({ count: 0 }));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async (arg?: { locale?: string }) => (key: string) =>
    `${arg?.locale ?? "th"}:${key}`,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    getAll: () => [],
    set: () => {
      cookieSets.count += 1;
    },
    delete: () => undefined,
  }),
  headers: async () => new Headers(),
}));

const APP = resolve(import.meta.dirname, "..");
const PAGE = resolve(APP, "app/[locale]/join/page.tsx");
const COPY_FILE = resolve(APP, "lib/join-copy.ts");
const MISSING_PAGE = "Missing apps/storytime/app/[locale]/join/page.tsx";
const MISSING_COPY = "Missing apps/storytime/lib/join-copy.ts";

/** The tile order of the PM design decision 3. */
const TILE_ORDER = [
  "daily-lessons",
  "letters-phonics",
  "sight-words",
  "songs-readers",
  "home-app",
] as const;

/** The PM-approved tile titles and sentences (2026-11-20, new microcopy). */
const EXPECTED_TILES: Record<
  "en" | "th",
  Record<string, { title: string; sentence: string }>
> = {
  en: {
    "daily-lessons": {
      title: "Daily Class Lesson",
      sentence:
        "Your child follows a 30-minute scripted lesson on every class day.",
    },
    "letters-phonics": {
      title: "Letters and Sounds",
      sentence:
        "Your child practices letter formation, then phonics through recognition, blending, and segmenting.",
    },
    "sight-words": {
      title: "Sight Words",
      sentence: "Your child takes a timed step through 100 sight words.",
    },
    "songs-readers": {
      title: "Songs and Readers",
      sentence:
        "Songs, read-along books, and decodable books build up as the weeks pass.",
    },
    "home-app": {
      title: "Home Phone App",
      sentence:
        "On a phone at home, your child hears each page and taps words to hear them.",
    },
  },
  th: {
    "daily-lessons": {
      title: "บทเรียนในวันเรียน",
      sentence: "ลูกเรียนตามบทเรียนที่มีสคริปต์นาน 30 นาทีในทุกวันเรียน",
    },
    "letters-phonics": {
      title: "ตัวอักษรและเสียง",
      sentence:
        "ลูกฝึกเขียนตัวอักษร แล้วฝึกโฟนิกส์ด้วยการจดจำ การผสมเสียง และการแยกเสียง",
    },
    "sight-words": {
      title: "Sight words",
      sentence:
        "ลูกฝึกขั้น sight words แบบจับเวลา ครอบคลุมคำที่เห็นบ่อย 100 คำ",
    },
    "songs-readers": {
      title: "เพลงและหนังสืออ่าน",
      sentence:
        "เพลง หนังสืออ่านตาม และหนังสือฝึกอ่านจะเพิ่มขึ้นเรื่อย ๆ ตลอดหลายสัปดาห์",
    },
    "home-app": {
      title: "แอปบนโทรศัพท์ที่บ้าน",
      sentence:
        "ที่บ้าน ลูกฟังเสียงอ่านทีละหน้าและแตะคำเพื่อฟังเสียงอ่านได้ในแอปบนโทรศัพท์",
    },
  },
};

/** The PM-approved step 1 lines (2026-11-20; the Thai line is the approved C3 Thai). */
const EXPECTED_STEP_0: Record<"en" | "th", string> = {
  en: "Your child's school or tutor gives your family the sign-in details.",
  th: "โรงเรียนหรือครูสอนพิเศษของเด็กมอบข้อมูลเข้าสู่ระบบให้ครอบครัว",
};

/** Loads the copy module after the existsSync assertion. */
async function copyModule(): Promise<{
  JOIN_COPY: { en: Record<string, string>; th: Record<string, string> };
  JOIN_PIECES?: unknown;
}> {
  expect(existsSync(COPY_FILE), MISSING_COPY).toBe(true);
  return (await import("../lib/join-copy.js")) as unknown as {
    JOIN_COPY: { en: Record<string, string>; th: Record<string, string> };
    JOIN_PIECES?: unknown;
  };
}

/** Renders the join page for one locale and returns its static HTML. */
async function renderJoin(locale: string): Promise<string> {
  expect(existsSync(PAGE), MISSING_PAGE).toBe(true);
  const mod = (await import("../app/[locale]/join/page.js")) as {
    default: (props: never) => Promise<ReactElement> | ReactElement;
  };
  const element = await mod.default({
    params: Promise.resolve({ locale }),
  } as never);
  const html = renderToStaticMarkup(element);
  expect(html.length, "the join markup is not empty").toBeGreaterThan(0);
  return html;
}

/** Returns the text of one HTML string with markup and attributes removed. */
function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Splits the markup into its text blocks (paragraphs, list items, headings). */
function textBlocks(html: string): string[] {
  const blocks: string[] = [];
  for (const match of html.matchAll(
    /<(p|li|h1|h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi,
  )) {
    blocks.push(visibleText(match[2] ?? ""));
  }
  return blocks.filter((block) => block.length > 0);
}

beforeEach(() => {
  cookieSets.count = 0;
});

describe("entry join layout (red)", () => {
  it("J1 holds the heading and the hero line of the pieces", async () => {
    const copy = await copyModule();
    expect(copy.JOIN_PIECES, "Missing JOIN_PIECES in apps/storytime/lib/join-copy.ts").toBeDefined();
    const html = await renderJoin("th");
    const heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "";
    expect(heading.length, "the h1 is not empty").toBeGreaterThan(0);
    expect(heading, "the h1 holds the approved heading").toContain(
      copy.JOIN_COPY.th.heading,
    );
    const pieces = copy.JOIN_PIECES as {
      th: { hero: string };
      en: { hero: string };
    };
    expect(pieces.th.hero.length, "the Thai hero piece is not empty").toBeGreaterThan(0);
    expect(html, "the page holds the hero line").toContain(pieces.th.hero);
  });

  it("J2 holds exactly five tiles with a title and a sentence", async () => {
    const copy = await copyModule();
    expect(copy.JOIN_PIECES, "Missing JOIN_PIECES in apps/storytime/lib/join-copy.ts").toBeDefined();
    for (const locale of ["en", "th"] as const) {
      const html = await renderJoin(locale);
      const tiles = [...html.matchAll(/data-join-tile="([^"]*)"/g)].map(
        (match) => match[1],
      );
      console.log(`join_tile_count_${locale}=${tiles.length}`);
      expect(tiles.length, `the ${locale} page holds exactly five tiles`).toBe(5);
      expect(tiles, `the ${locale} tiles follow the designed order`).toEqual([...TILE_ORDER]);
      for (const name of TILE_ORDER) {
        const tile = html.match(
          new RegExp(
            `<[^>]*data-join-tile="${name}"[^>]*>([\\s\\S]*?)(?=<[^>]*data-join-tile=|$)`,
          ),
        )?.[0];
        expect(tile, `the ${locale} ${name} tile exists`).toBeDefined();
        if (tile) {
          const icons = [...tile.matchAll(/<svg[^>]*aria-hidden="true"[^>]*>/g)];
          expect(icons.length, `the ${locale} ${name} tile holds one icon`).toBe(1);
          const titleInner = tile.match(
            /<[^>]*data-join-tile-title[^>]*>([\s\S]*?)<\/[^>]+?>/,
          )?.[1];
          const sentenceInner = tile.match(
            /<[^>]*data-join-tile-sentence[^>]*>([\s\S]*?)<\/[^>]+?>/,
          )?.[1];
          expect(titleInner, `the ${locale} ${name} tile holds a title element`).toBeDefined();
          expect(sentenceInner, `the ${locale} ${name} tile holds a sentence element`).toBeDefined();
          if (titleInner !== undefined) {
            expect(
              visibleText(titleInner),
              `the ${locale} ${name} title holds the approved title`,
            ).toBe(EXPECTED_TILES[locale][name]?.title);
          }
          if (sentenceInner !== undefined) {
            expect(
              visibleText(sentenceInner),
              `the ${locale} ${name} sentence holds the approved sentence`,
            ).toBe(EXPECTED_TILES[locale][name]?.sentence);
          }
        }
      }
    }
  });

  it("J3 holds the two numbered steps with the approved step 1", async () => {
    const copy = await copyModule();
    expect(copy.JOIN_PIECES, "Missing JOIN_PIECES in apps/storytime/lib/join-copy.ts").toBeDefined();
    for (const locale of ["en", "th"] as const) {
      const html = await renderJoin(locale);
      const steps = [...html.matchAll(/data-join-step="(\d)"/g)].map(
        (match) => match[1],
      );
      console.log(`join_step_count_${locale}=${steps.length}`);
      expect(steps.length, `the ${locale} page holds exactly two steps`).toBe(2);
      expect(steps, `the ${locale} steps are numbered 1 and 2`).toEqual(["1", "2"]);
      expect(html, `the ${locale} page holds the approved step 1`).toContain(
        EXPECTED_STEP_0[locale],
      );
    }
    const html = await renderJoin("en");
    expect(html, "the steps sit under the how-to heading").toContain(
      "joinHowToTitle",
    );
  });

  it("J4 holds the three contact buttons and the small contact-page link", async () => {
    expect(existsSync(PAGE), MISSING_PAGE).toBe(true);
    const html = await renderJoin("th");
    const contacts = [...html.matchAll(/data-contact="([^"]*)"[^>]*href="([^"]*)"/g)];
    console.log(`join_contact_count=${contacts.length}`);
    expect(contacts.length, "the page holds three contact buttons").toBe(3);
    const byName = new Map(contacts.map((match) => [match[1], match[2]]));
    expect(byName.get("line"), "the LINE button target").toBe(
      "https://line.me/ti/p/Pf7_EF98Pv",
    );
    expect(byName.get("phone"), "the phone button target").toBe("tel:+66990058038");
    expect(byName.get("email"), "the email button target").toBe(
      "mailto:support@reading-advantage.com",
    );
    expect(byName.has("site"), "the contact page is not a button").toBe(false);
    for (const match of html.matchAll(/<a[^>]*data-contact[^>]*>/g)) {
      expect(match[0], "a contact button is an anchor").toMatch(/^<a[\s>]/);
    }
    const site = html.match(
      /<a[^>]*data-contact-site[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/,
    );
    console.log(`join_site_link=${site ? 1 : 0}`);
    expect(site, "the page holds the small contact-page link").toBeDefined();
    if (site) {
      expect(site[1], "the contact-page link target").toBe(
        "https://www.reading-advantage.com/contact",
      );
      const label = visibleText(site[2] ?? "");
      expect(label.length, "the contact-page label is not empty").toBeGreaterThan(0);
      expect(label, "the contact-page label shows no URL").not.toMatch(/https?:\/\//);
      expect(label, "the contact-page label shows no URL").not.toContain(
        "reading-advantage.com/contact",
      );
    }
  });

  it("J5 shows no raw URL in the visible text", async () => {
    expect(existsSync(PAGE), MISSING_PAGE).toBe(true);
    for (const locale of ["th", "en"] as const) {
      const html = await renderJoin(locale);
      const text = visibleText(html);
      expect(text.length, `the ${locale} visible text is not empty`).toBeGreaterThan(0);
      expect(text, `no http URL in the ${locale} text`).not.toMatch(/https?:\/\//);
      expect(text, `no line.me in the ${locale} text`).not.toContain("line.me");
      expect(text, `no contact path in the ${locale} text`).not.toContain(
        "reading-advantage.com/contact",
      );
    }
  });

  it("J6 ends with the sign-in button", async () => {
    const copy = await copyModule();
    for (const locale of ["th", "en"] as const) {
      const html = await renderJoin(locale);
      const link = html.match(
        /<a[^>]*data-join-signin[^>]*>([\s\S]*?)<\/a>/,
      )?.[0];
      console.log(`join_signin_${locale}=${link ? 1 : 0}`);
      expect(link, `the ${locale} page ends with the sign-in button`).toBeDefined();
      if (link) {
        expect(link, "the sign-in button target").toContain(
          `href="/${locale}/sign-in"`,
        );
        const want =
          locale === "th"
            ? copy.JOIN_COPY.th.signInLink
            : copy.JOIN_COPY.en.signInLink;
        expect(want.length, "the approved sign-in line is not empty").toBeGreaterThan(0);
        expect(link, "the sign-in button text").toContain(want);
      }
    }
  });

  it("J7 shows the Storytime Advantage logo", async () => {
    expect(existsSync(PAGE), MISSING_PAGE).toBe(true);
    const html = await renderJoin("th");
    const img = html.match(/<img[^>]*data-entry-logo[^>]*>/)?.[0] ?? "";
    console.log(`join_logo_found=${img ? 1 : 0}`);
    expect(img, "the markup holds img[data-entry-logo]").not.toBe("");
  });

  it("J8 holds no draft marker, no cookie write, no media, and no week content", async () => {
    expect(existsSync(PAGE), MISSING_PAGE).toBe(true);
    const html = await renderJoin("th");
    expect(html, "the approved copy shows no draft marker").not.toContain("data-draft");
    expect(cookieSets.count, "the join page writes no cookie").toBe(0);
    expect(html, "the join page holds no media URL").not.toMatch(
      /\/media\/|storage\.googleapis\.com|\.mp3|\.mp4/,
    );
    expect(html, "the join page holds no week path").not.toMatch(/\/st\/\d/);
  });

  it("J9 keeps every text block short and tiles the program", async () => {
    expect(existsSync(PAGE), MISSING_PAGE).toBe(true);
    const html = await renderJoin("en");
    const blocks = textBlocks(html);
    expect(blocks.length, "the page holds text blocks").toBeGreaterThan(0);
    const long = blocks.filter((block) => block.split(/\s+/).length > 40);
    console.log(`join_long_blocks=${long.length}`);
    expect(long, "no text block holds more than 40 words").toEqual([]);
    const tiles = [...html.matchAll(/data-join-tile="/g)];
    console.log(`join_tile_count_en=${tiles.length}`);
    expect(tiles.length, "the English page holds at least 5 tiles").toBeGreaterThanOrEqual(5);
  });
});
