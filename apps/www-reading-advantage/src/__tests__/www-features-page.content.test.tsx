import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import FeaturesPage from "@/app/[locale]/(marketing)/features/page";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";
import {
  APP_LOGO_ORDER,
  FEATURES_ENTRIES,
} from "@/__tests__/fixtures/features-pricing-expected";
import {
  expectKeysInEveryLocale,
  keysUnderScope,
} from "@/__tests__/fixtures/locale-key-check";

/*
 * Red test for the new /features page (track www_features_pricing_20261120).
 * It renders the real route component with the real locale objects and asserts
 * the hooks of spec section 7. At Red every hook assertion fails because the
 * old page is still mounted; the control cases pass.
 */

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

type Locale = "en" | "th" | "zh";
const LOCALES: readonly Locale[] = ["en", "th", "zh"];
const MESSAGES: Record<Locale, unknown> = {
  en: enMessages,
  th: thMessages,
  zh: zhMessages,
};

/** Section-level hooks in the spec order (S1 to S9). */
const SECTION_ORDER = [
  "features-hero",
  "features-programs",
  "features-engine",
  "features-blended",
  "features-tutor",
  "features-next-subjects",
  "features-app-family",
  "features-faq",
  "features-next-step",
] as const;

/** Program cards in the spec order (S2). */
const PROGRAM_CARDS = [
  "program-card-storytime",
  "program-card-primary",
  "program-card-reading",
  "program-card-codecamp",
  "program-card-school-subjects",
] as const;

/** Titles of the six old feature cards that go (spec section 6, item 4). */
const OLD_FEATURE_TITLES = [
  "Leveled Content",
  "Mastery-Based Learning",
  "Interactive Exercises",
  "Progress Tracking",
  "Web Access",
  "Translation Support",
] as const;

/** Old price figures that the features page must not show. */
const FORBIDDEN_AMOUNTS = [
  "1,000",
  "1,500",
  "+600",
  "+400",
  "1,800",
  "2,200",
  "2,450",
  "2,700",
] as const;

function sectionHookOrder(): string[] {
  return Array.from(
    document.querySelectorAll("main section[data-testid]"),
  ).map((element) => element.getAttribute("data-testid") ?? "");
}

async function renderLocale(locale: Locale): Promise<void> {
  hoisted.state.messages = MESSAGES[locale];
  const element = await FeaturesPage();
  render(element);
}

afterEach(() => {
  cleanup();
});

describe("control: fixture and hooks", () => {
  it("control: the fixture lists 9 sections, 5 cards and 7 logos", () => {
    expect(SECTION_ORDER.length, "sections: 9").toBe(9);
    expect(PROGRAM_CARDS.length, "program cards: 5").toBe(5);
    expect(APP_LOGO_ORDER.length, "logo tiles: 7").toBe(7);
    expect(APP_LOGO_ORDER[0], "first logo: storytime").toBe("storytime");
    expect(FEATURES_ENTRIES.length, "fixture entries: 51").toBe(51);
  });

  it("control: the hook scanner reads test ids in document order", () => {
    document.body.innerHTML =
      '<main><section data-testid="features-hero"></section>' +
      '<section data-testid="features-programs"></section></main>';
    expect(sectionHookOrder()).toEqual([
      "features-hero",
      "features-programs",
    ]);
    document.body.innerHTML = "";
  });
});

describe("generateMetadata", () => {
  it("holds the feature metadata keys in every shipped locale", () => {
    expectKeysInEveryLocale([
      "pages.feature.metadata.title",
      "pages.feature.metadata.description",
    ]);
  });
});

describe.each(LOCALES)("FeaturesPage content in %s", (locale) => {
  beforeEach(async () => {
    await renderLocale(locale);
  });

  it("renders the nine sections in the spec order (FR-1)", () => {
    expect(sectionHookOrder(), "sections: 9 in order").toEqual([...SECTION_ORDER]);
  });

  it("gives the programs section the in-page anchor id (FR-2)", () => {
    const section = document.querySelector('[data-testid="features-programs"]');
    expect(section?.getAttribute("id"), 'programs section id: "programs"').toBe(
      "programs",
    );
  });

  it("renders the five program cards in order (FR-2)", () => {
    const found = PROGRAM_CARDS.map(
      (testId) =>
        document.querySelectorAll(`[data-testid="${testId}"]`).length,
    );
    expect(found, "program cards: 5, each once").toEqual([1, 1, 1, 1, 1]);
    const order = Array.from(
      document.querySelectorAll("[data-testid^='program-card-']"),
    ).map((element) => element.getAttribute("data-testid"));
    expect(order).toEqual([...PROGRAM_CARDS]);
  });

  it("shows three bullets on the Storytime card and three on the Primary card (FR-2)", () => {
    for (const testId of ["program-card-storytime", "program-card-primary"] as const) {
      const card = document.querySelector(`[data-testid="${testId}"]`);
      const items = card?.querySelectorAll("li") ?? [];
      expect(items.length, `bullets in ${testId}: 3`).toBe(3);
    }
  });

  it("shows seven logo tiles with Storytime first (FR-4)", () => {
    const tiles = Array.from(
      document.querySelectorAll("[data-testid^='app-logo-']"),
    ).map((element) => element.getAttribute("data-testid"));
    expect(tiles.length, "logo tiles: 7").toBe(7);
    expect(tiles).toEqual(APP_LOGO_ORDER.map((id) => `app-logo-${id}`));
  });

  it("uses a custom hero as the first section of main (D11)", () => {
    const hero = document.querySelector("main > section:first-child");
    expect(hero?.getAttribute("data-testid"), "hero hook").toBe("features-hero");
    const eyebrow = hero?.querySelector("span");
    expect(eyebrow?.tagName, "eyebrow is a span").toBe("SPAN");
    const headings = hero?.querySelectorAll("h1") ?? [];
    expect(headings.length, "hero h1: 1").toBe(1);
    expect(headings[0]?.className).toMatch(/text-slate-900/);
    const firstParagraph = hero?.querySelector("p");
    expect(firstParagraph?.className).toMatch(/text-slate-(700|800|900)/);
  });

  it("shows three FAQ items (FR-5)", () => {
    const faq = document.querySelector('[data-testid="features-faq"]');
    expect(faq?.querySelectorAll("details").length, "FAQ items: 3").toBe(3);
  });

  it("points closing buttons to /contact, Tutor buttons to /products/tutor-advantage, S1 to #programs (D6)", () => {
    const hrefs = Array.from(document.querySelectorAll("a")).map((anchor) =>
      anchor.getAttribute("href"),
    );
    expect(hrefs.length, "links: more than 0").toBeGreaterThan(0);
    const outside = hrefs.filter(
      (href) =>
        href !== "/contact" &&
        href !== "/products/tutor-advantage" &&
        href !== "#programs",
    );
    expect(outside, "links outside the three targets").toEqual([]);
    expect(hrefs).toContain("/products/tutor-advantage");
    expect(hrefs).toContain("#programs");
  });

  it("has exactly one h1 and no image without a non-empty alt (FR-17)", () => {
    expect(document.querySelectorAll("h1").length, "h1: 1").toBe(1);
    const missing = Array.from(document.querySelectorAll("img")).filter(
      (image) => (image.getAttribute("alt") ?? "").trim() === "",
    );
    expect(missing.length, "images without alt: 0").toBe(0);
  });

  it("holds every feature key and no old feature copy (FR-1, FR-7)", () => {
    expectKeysInEveryLocale(keysUnderScope("pages.feature"));
    const body = document.body.textContent ?? "";
    expect(
      OLD_FEATURE_TITLES.filter((title) => body.includes(title)),
      "old feature titles",
    ).toEqual([]);
    expect(body.includes("Reading Program Comparison"), "comparison title").toBe(
      false,
    );
  });

  it("shows the 3,000 baht floor and none of the old price figures", () => {
    const body = document.body.textContent ?? "";
    expect(body.includes("3,000"), "3,000 baht floor").toBe(true);
    expect(
      FORBIDDEN_AMOUNTS.filter((amount) => body.includes(amount)),
      "old price figures",
    ).toEqual([]);
  });
});
