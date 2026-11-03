import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import StorytimeAdvantage, { generateMetadata } from "@/app/[locale]/(marketing)/products/storytime-advantage/page";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";
import {
  BANNED_COPY,
  CONTAINER_IDS,
  EXPECTED_META,
  OLD_STOCK_REFERENCES,
  REQUIRED_COPY,
  STORYTIME_IMAGES,
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

function imagePath(src: string): string {
  if (src.startsWith("/_next/image")) {
    return new URL(src, "http://localhost").searchParams.get("url") ?? "";
  }
  return src;
}

afterEach(cleanup);

describe("Storytime Advantage content", () => {
  it.each(["en", "th", "zh"] as const)("renders approved copy, links, and images in %s", async (locale) => {
    state.messages = MESSAGES[locale];
    const dictionary = MESSAGES[locale] as {
      pages: { products: { storytimeAdvantage: Record<string, unknown> } };
    };
    const scope = dictionary.pages.products.storytimeAdvantage;
    const copy = copyLocale(locale);
    const page = await StorytimeAdvantage({ params: Promise.resolve({ locale }) });
    render(page);

    const foundContainers = Array.from(document.querySelectorAll("[data-testid^='st-']"))
      .map((element) => element.getAttribute("data-testid"));
    expect(foundContainers).toEqual(CONTAINER_IDS);
    expect(document.body.textContent).not.toContain("[[missing:");
    for (const phrase of REQUIRED_COPY[copy]) expect(document.body.textContent).toContain(phrase);

    const links = Array.from(document.querySelectorAll("a"));
    expect(links).toHaveLength(2);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/contact", "/contact"]);
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      (scope.cta as { buttons: { joinWaitlist: string } }).buttons.joinWaitlist,
      (scope.cta as { buttons: { learnMore: string } }).buttons.learnMore,
    ]);

    const images = Array.from(document.querySelectorAll("img"));
    expect(images).toHaveLength(STORYTIME_IMAGES.length);
    expect(images.map((image) => ({
      path: imagePath(image.getAttribute("src") ?? ""),
      alt: image.getAttribute("alt"),
    }))).toEqual(STORYTIME_IMAGES.map((image) => {
      const alt = image.alt.split(".").reduce<unknown>((value, part) =>
        value !== null && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined,
      scope);
      return { path: `/images/storytime-advantage/${image.name}.webp`, alt };
    }));

    const pageText = `${document.body.textContent}\n${images.map((image) => image.alt).join("\n")}`;
    for (const text of BANNED_COPY) expect(pageText.toLowerCase()).not.toContain(text.toLowerCase());
    for (const reference of OLD_STOCK_REFERENCES) expect(document.body.innerHTML).not.toContain(reference);
    expect(pageText).not.toMatch(/20\d\d|\b(?:price|discount|results|score|guarantee|guaranteed|fluent|fluency)\b|฿|\bTHB\b|\bUSD\b|\bfree\b|ราคา|ส่วนลด|ฟรี|ทดลองใช้|ผลลัพธ์|รับประกัน/iu);
  });

  it.each(["en", "th", "zh"] as const)("exposes the exact metadata in %s", async (locale) => {
    state.messages = MESSAGES[locale];
    const expected = EXPECTED_META[copyLocale(locale)];
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
    expect({ title: metadata.title, description: metadata.description }).toEqual(expected);
  });

  it("control: the content scanner detects banned terms", () => {
    for (const text of ["Starting 2026", "USD 10", "free trial", "learning results", "Khan Academy Kids"]) {
      expect(/20\d\d|\b(?:price|discount|results|score|guarantee|guaranteed|fluent|fluency)\b|\bUSD\b|\bfree\b|Khan Academy Kids/iu.test(text)).toBe(true);
    }
  });
});
