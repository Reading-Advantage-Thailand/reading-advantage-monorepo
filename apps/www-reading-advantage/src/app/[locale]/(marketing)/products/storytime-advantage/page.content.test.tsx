import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import StorytimeAdvantage, { generateMetadata } from "@/app/[locale]/(marketing)/products/storytime-advantage/page";
import { navigation } from "@/config/navigation";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";
import { en as storytimeEn, zh as storytimeZh } from "@/locales/pages/products/storytime-advantage";
import {
  BANNED_COPY,
  CLAIM_TERMS,
  CONTAINER_IDS,
  EXPECTED_AUX_COPY,
  EXPECTED_META,
  IMAGE_ALT,
  LABEL_COPY,
  OLD_ROADMAP_COPY,
  OLD_STOCK_REFERENCES,
  OVERVIEW_LABEL_COPY,
  PAGE_COPY,
  SONG_COPY,
  SONG_POSTER_MEDIA,
  SONG_POSTERS,
  STORYTIME_IMAGES,
  findClaimTerms,
  type ClaimTermName,
} from "@/__tests__/fixtures/storytime-page-expected";

const state = vi.hoisted(() => ({ messages: {} as unknown }));

function lookup(path: string): unknown {
  let value: unknown = state.messages;
  for (const part of path.split(".")) {
    if (value === null || typeof value !== "object" || !(part in value)) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

vi.mock("@/locales/server", () => ({
  getScopedI18n: vi.fn(() => {
    const translate = (key: string): string => {
      const value = lookup(`pages.products.storytimeAdvantage.${key}`);
      return typeof value === "string" ? value : `[[missing:${key}]]`;
    };
    translate.raw = (key: string): unknown => lookup(`pages.products.storytimeAdvantage.${key}`);
    return Promise.resolve(translate);
  }),
}));

type Locale = "en" | "th" | "zh";
const MESSAGES: Record<Locale, unknown> = { en: enMessages, th: thMessages, zh: zhMessages };
const copyLocale = (locale: Locale): "en" | "th" => locale === "th" ? "th" : "en";

/**
 * Reads the expected text of one page string in one locale.
 * @param entry The page string of the fixture.
 * @param locale The locale of the page.
 * @returns The expected text.
 */
function expectedText(entry: (typeof PAGE_COPY)[typeof CONTAINER_IDS][number], locale: Locale): string {
  if (locale === "zh" && entry.zh) return entry.zh;
  return entry[copyLocale(locale)];
}

const OLD_ROADMAP_STRINGS = OLD_ROADMAP_COPY.flatMap(({ en, th, zh }) => [en, th, zh]);

const OLD_ROADMAP_KEYS = [
  "metadata.title",
  "metadata.description",
  "hero.title",
  "hero.subtitle",
  "hero.description",
  "hero.comingSoon",
  "coreValue.heading",
  "keyFeatures.heading",
  "teacherTools.heading",
  "adaptiveEngine.eyebrow",
  "adaptiveEngine.heading",
  "adaptiveEngine.description",
  ...[0, 1, 2, 3, 4].flatMap((item) => [`faq.questions.${item}.question`, `faq.questions.${item}.answer`]),
  "cta.description",
];

const CLAIM_CONTROLS: Record<ClaimTermName, readonly string[]> = {
  year: ["Starting 2026"],
  "English month": [
    "Start in January",
    "Start in February",
    "Start in March",
    "Start in April",
    "Start in May",
    "Start in June",
    "Start in July",
    "Start in August",
    "Start in September",
    "Start in October",
    "Start in November",
    "Start in December",
    "STARTS IN MAY",
  ],
  "พ.ศ.": ["เปิดภาคเรียน พ.ศ. 2569"],
  "฿": ["฿500"],
  THB: ["500 THB", "500THB"],
  baht: ["500 baht"],
  "บาท": ["500 บาท"],
  $: ["$5 a book"],
  USD: ["USD 5", "5USD"],
  price: ["See the price"],
  "ราคา": ["ดูราคา"],
  free: ["A free trial", "Free for schools"],
  "ฟรี": ["ใช้ฟรี"],
  "ทดลองใช้": ["ทดลองใช้หนึ่งเดือน"],
  discount: ["A 10% discount"],
  "ส่วนลด": ["ส่วนลด 10%"],
  results: ["Better test results"],
  score: ["A higher score"],
  guarantee: ["We guarantee it"],
  guaranteed: ["Guaranteed progress"],
  fluent: ["Fluent readers"],
  fluency: ["Reading fluency"],
  "grade level": ["Reading at grade level"],
  "ผลลัพธ์": ["ผลลัพธ์ที่ดีขึ้น"],
  "รับประกัน": ["รับประกันผล"],
};

const ALLOWED_TERMS = ["date", "no public date", "30-minute", "5-minute", "3-minute", "4 minutes"];

function textNodes(root: Node): string[] {
  return Array.from(root.childNodes).flatMap((node) => {
    if (node.nodeType !== Node.TEXT_NODE) return textNodes(node);
    return node.textContent?.trim() ? [node.textContent] : [];
  });
}

function stringLeaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value === null || typeof value !== "object") return [];
  return Object.values(value).flatMap(stringLeaves);
}

function findOldRoadmapCopy(text: string): string[] {
  return OLD_ROADMAP_STRINGS.filter((old) => text.includes(old));
}

function findBannedCopy(text: string): string[] {
  return BANNED_COPY.filter((banned) => text.toLowerCase().includes(banned.toLowerCase()));
}

function imagePath(src: string): string {
  if (src.startsWith("/_next/image")) {
    return new URL(src, "http://localhost").searchParams.get("url") ?? "";
  }
  return src;
}

afterEach(cleanup);

describe("Storytime Advantage content", () => {
  it.each(["en", "th", "zh"] as const)("uses the exact Storytime products overview handoff copy in %s", (locale) => {
    state.messages = MESSAGES[locale];
    const expected = OVERVIEW_LABEL_COPY[locale];
    const overview = lookup("pages.products.overview.gradeBands.storytime") as {
      gradeRange: string;
      description: string;
      ctaLabel: string;
    };

    expect(overview.gradeRange).toBe(expected.gradeRange);
    expect(overview.description).toBe(expected.description);
    expect(overview.ctaLabel).toBe(expected.ctaLabel);
    expect(findClaimTerms(overview.gradeRange)).toEqual([]);
    expect(findClaimTerms(overview.description)).toEqual([]);
  });

  it.each(["en", "th", "zh"] as const)("uses the exact Storytime label handoff copy in %s", (locale) => {
    state.messages = MESSAGES[locale];
    const expected = LABEL_COPY[locale === "th" ? "th" : locale === "zh" ? "zh" : "en"];
    const card = lookup("components.products.b2bSolutions.products.storytimeAdvantage") as {
      badge: string;
      gradeRange: string;
      features: Record<string, string>;
    };
    const cardCopy = [card.badge, card.gradeRange, ...Object.values(card.features)];
    const navigation = lookup("components.common.navigation.itemsDescription.storytimeAdvantage");
    const home = lookup("pages.home.suite.description");
    const homeStatus = lookup("pages.home.v2.products.storytimePreparingLabel");
    const allCopy = [...cardCopy, navigation, home];

    expect(cardCopy).toEqual([expected.badge, expected.gradeRange, ...expected.features]);
    expect(navigation).toBe(expected.navigation);
    const staticNavigation = navigationConfigStorytimeDescription();
    expect(staticNavigation).toBe(LABEL_COPY.en.navigation);
    expect(home).toBe(expected.home);
    expect(homeStatus).toBe(expected.badge);
    expect([...allCopy, homeStatus].every((value) => typeof value === "string")).toBe(true);
    for (const value of allCopy as string[]) expect(findClaimTerms(value)).toEqual([]);
    expect(findClaimTerms(homeStatus as string)).toEqual([]);
    expect(findClaimTerms(staticNavigation ?? "")).toEqual([]);
    expect(cardCopy.join("\n")).not.toMatch(/roadmap|planned|แผนงาน|วางแผน|路线图|规划中/i);
    expect(navigation).not.toMatch(/roadmap|planned|แผนงาน|วางแผน|路线图|规划中/i);
    expect(home).not.toMatch(/Storytime Advantage.{0,80}(?:roadmap|planned|แผนงาน|วางแผน|路线图|规划中)/i);
    expect(homeStatus).not.toMatch(/roadmap|planned|แผนงาน|วางแผน|路线图|规划中/i);
  });

  it.each(["en", "th", "zh"] as const)("renders approved copy, links, and images in %s", async (locale) => {
    state.messages = MESSAGES[locale];
    const scope = lookup("pages.products.storytimeAdvantage");
    const copy = copyLocale(locale);
    const page = await StorytimeAdvantage({ params: Promise.resolve({ locale }) });
    render(page);

    const foundContainers = Array.from(document.querySelectorAll("[data-testid^='st-']"))
      .map((element) => element.getAttribute("data-testid"));
    expect(foundContainers).toEqual(CONTAINER_IDS);
    expect(document.body.textContent).not.toContain("[[missing:");

    const renderedCopy = Object.fromEntries(CONTAINER_IDS.map((id) => {
      const container = document.querySelector(`[data-testid="${id}"]`);
      return [id, container ? textNodes(container) : []];
    }));
    expect(renderedCopy).toEqual(Object.fromEntries(CONTAINER_IDS.map((id) => [id, PAGE_COPY[id].map((entry) => expectedText(entry, locale))])));
    expect(textNodes(document.body)).toEqual(CONTAINER_IDS.flatMap((id) => PAGE_COPY[id].map((entry) => expectedText(entry, locale))));

    const buttons = CONTAINER_IDS.flatMap((id) => PAGE_COPY[id]).filter((entry) => entry.href);
    const links = Array.from(document.querySelectorAll("a"));
    expect(links).toHaveLength(2);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/contact", "/contact"]);
    expect(links.map((link) => ({ href: link.getAttribute("href"), text: link.textContent?.trim() })))
      .toEqual(buttons.map((entry) => ({ href: entry.href, text: expectedText(entry, locale) })));

    const images = Array.from(document.querySelectorAll("img"));
    const posterImages = images.filter((image) => imagePath(image.getAttribute("src") ?? "").includes("song-week-1"));
    expect(posterImages).toHaveLength(1);
    expect(imagePath(posterImages[0].getAttribute("src") ?? "")).toBe(SONG_POSTERS.desktop);
    expect(posterImages[0].getAttribute("alt")).toBe("");

    const storyImages = images.filter((image) => !posterImages.includes(image));
    expect(storyImages).toHaveLength(STORYTIME_IMAGES.length);
    expect(storyImages.map((image) => ({
      path: imagePath(image.getAttribute("src") ?? ""),
      alt: image.getAttribute("alt"),
    }))).toEqual(STORYTIME_IMAGES.map((image) => ({
      path: `/images/storytime-advantage/${image.name}.webp`,
      alt: IMAGE_ALT[image.name][copy],
    })));
    expect(STORYTIME_IMAGES.map((image) => lookup(`pages.products.storytimeAdvantage.${image.alt}`)))
      .toEqual(STORYTIME_IMAGES.map((image) => IMAGE_ALT[image.name][copy]));
    expect({
      heroAlt: lookup("pages.products.storytimeAdvantage.heroAlt"),
      adaptiveEngineAlt: lookup("pages.products.storytimeAdvantage.adaptiveEngine.alt"),
    }).toEqual({
      heroAlt: EXPECTED_AUX_COPY[copy].heroAlt,
      adaptiveEngineAlt: EXPECTED_AUX_COPY[copy]["adaptiveEngine.alt"],
    });

    const pageText = [...textNodes(document.body), ...images.map((image) => image.alt)].join("\n");
    expect(findBannedCopy(pageText)).toEqual([]);
    for (const reference of OLD_STOCK_REFERENCES) expect(document.body.innerHTML).not.toContain(reference);
    expect(findClaimTerms(pageText)).toEqual([]);
    expect(findOldRoadmapCopy(pageText)).toEqual([]);
    expect(findOldRoadmapCopy(stringLeaves(scope).join("\n"))).toEqual([]);
  });

  it.each(["en", "th", "zh"] as const)("exposes the exact metadata in %s", async (locale) => {
    state.messages = MESSAGES[locale];
    const expected = EXPECTED_META[copyLocale(locale)];
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
    expect({ title: metadata.title, description: metadata.description }).toEqual(expected);
    const metaText = [metadata.title, metadata.description].filter((value) => typeof value === "string").join("\n");
    expect(findClaimTerms(metaText)).toEqual([]);
    expect(findOldRoadmapCopy(metaText)).toEqual([]);
  });

  it.each(["en", "th", "zh"] as const)("uses the exact song copy in %s", (locale) => {
    state.messages = MESSAGES[locale];
    const song = lookup("pages.products.storytimeAdvantage.song") as Record<string, string>;
    expect(song).toEqual(SONG_COPY[locale]);
  });

  it("keeps every zh string equal to en except the song section", () => {
    const { song: enSong, ...enRest } = storytimeEn;
    const { song: zhSong, ...zhRest } = storytimeZh;
    expect(zhRest).toEqual(enRest);
    expect(enSong).toEqual(SONG_COPY.en);
    expect(zhSong).toEqual(SONG_COPY.zh);
  });

  it("loads one local poster with the 767 px media rule", async () => {
    state.messages = MESSAGES.en;
    const page = await StorytimeAdvantage({ params: Promise.resolve({ locale: "en" }) });
    render(page);
    const source = document.querySelector("picture source");
    expect(source?.getAttribute("media")).toBe(SONG_POSTER_MEDIA);
    expect(source?.getAttribute("srcset")).toBe(SONG_POSTERS.phone);
    expect(document.querySelector("picture img")?.getAttribute("src")).toBe(SONG_POSTERS.desktop);
  });

  it("holds no youtube string in the server HTML", async () => {
    state.messages = MESSAGES.en;
    const page = await StorytimeAdvantage({ params: Promise.resolve({ locale: "en" }) });
    const html = renderToStaticMarkup(page);
    expect(html.toLowerCase()).not.toContain("youtube");
    expect(html).not.toContain("Id4_X0nQnV4");
    expect(html).not.toContain("nwJW8yENJnY");
  });

  it("control: the claims scanner has one control for each term class of spec section 7", () => {
    expect(CLAIM_TERMS.map(({ name }) => name)).toEqual(Object.keys(CLAIM_CONTROLS));
  });

  it.each(Object.entries(CLAIM_CONTROLS))("control: the claims scanner flags the term class %s", (name, samples) => {
    for (const sample of samples) expect(findClaimTerms(sample), sample).toContain(name);
  });

  it("control: the claims scanner passes the allowed words and durations", () => {
    for (const text of ALLOWED_TERMS) expect(findClaimTerms(text), text).toEqual([]);
  });

  it("control: the old roadmap check covers the spec section 5 keys and flags each old string", () => {
    expect(OLD_ROADMAP_COPY.map(({ key }) => key)).toEqual(OLD_ROADMAP_KEYS);
    for (const old of OLD_ROADMAP_STRINGS) {
      expect(findOldRoadmapCopy(`New copy.\n${old}\nMore copy.`), old).toContain(old);
    }
  });

  it("control: the banned copy check flags each AC-15 string", () => {
    for (const banned of BANNED_COPY) {
      expect(findBannedCopy(`New copy, ${banned.toUpperCase()}, more copy.`), banned).toEqual([banned]);
    }
  });
});

/** Returns the static product navigation description used by the header. */
function navigationConfigStorytimeDescription(): string | undefined {
  return navigation[0]?.items?.find((item) => item.href === "/products/storytime-advantage")?.description;
}
