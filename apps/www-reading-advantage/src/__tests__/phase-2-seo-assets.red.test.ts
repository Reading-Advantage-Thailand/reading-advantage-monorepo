import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";
import { getScopedI18n } from "@/locales/server";

vi.mock("@/lib/seo", async () => {
  const actual = await vi.importActual<typeof import("@/lib/seo")>("@/lib/seo");

  return {
    ...actual,
    buildMarketingMetadata: vi.fn(actual.buildMarketingMetadata),
  };
});

import { buildMarketingMetadata } from "@/lib/seo";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SITE_ORIGIN = "https://reading-advantage.com";
const OPEN_GRAPH_IMAGE = "/images/teacher-at-board.png";
const LOCALES = {
  en: { messages: enMessages, openGraphLocale: "en_US" },
  th: { messages: thMessages, openGraphLocale: "th_TH" },
  zh: { messages: zhMessages, openGraphLocale: "zh_CN" },
} as const;
type Locale = keyof typeof LOCALES;
type LocaleMessages = (typeof LOCALES)[Locale]["messages"];
type LocaleEntry = (typeof LOCALES)[Locale];

const LOCALE_ENTRIES = Object.entries(LOCALES) as Array<[Locale, LocaleEntry]>;
const getScopedI18nMock = vi.mocked(getScopedI18n);

function readLocaleMessage(
  messages: LocaleMessages,
  scope: string,
  key: string,
): string {
  let value: unknown = messages;

  for (const segment of `${scope}.${key}`.split(".")) {
    if (value === null || typeof value !== "object" || !(segment in value)) {
      throw new Error(`Missing locale message: ${scope}.${key}`);
    }

    value = (value as Record<string, unknown>)[segment];
  }

  if (typeof value !== "string") {
    throw new Error(`Locale message is not text: ${scope}.${key}`);
  }

  return value;
}

function mockLocaleDictionary(messages: LocaleMessages): void {
  getScopedI18nMock.mockImplementation((scope) => {
    const translator = ((key: string) =>
      readLocaleMessage(messages, String(scope), key)) as Awaited<
      ReturnType<typeof getScopedI18n>
    >;

    return Promise.resolve(translator);
  });
}

const COMPLETED_ROUTE_METADATA = [
  {
    path: "/",
    load: () => import("@/app/[locale]/(marketing)/(home)/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.home.hero.title,
      description: messages.pages.home.hero.description,
    }),
  },
  {
    path: "/about",
    load: () => import("@/app/[locale]/(marketing)/about/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.about.hero.title,
      description: messages.pages.about.hero.description,
    }),
  },
  {
    path: "/case-studies",
    load: () => import("@/app/[locale]/(marketing)/case-studies/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.caseStudies.hero.title,
      description: messages.pages.caseStudies.hero.description,
    }),
  },
  {
    path: "/contact",
    load: () => import("@/app/[locale]/(marketing)/contact/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.contact.title,
      description: messages.pages.contact.description,
    }),
  },
  {
    path: "/features",
    load: () => import("@/app/[locale]/(marketing)/features/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.feature.hero.title,
      description: messages.pages.feature.hero.description,
    }),
  },
  {
    path: "/pricing",
    load: () => import("@/app/[locale]/(marketing)/pricing/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.pricing.hero.title,
      description: messages.pages.pricing.hero.description,
    }),
  },
  {
    path: "/products/primary-advantage",
    load: () =>
      import("@/app/[locale]/(marketing)/products/primary-advantage/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.products.primaryAdvantage.hero.title,
      description: messages.pages.products.primaryAdvantage.hero.description,
    }),
  },
  {
    path: "/products/reading-advantage",
    load: () =>
      import("@/app/[locale]/(marketing)/products/reading-advantage/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.products.readingAdvantage.hero.title,
      description: messages.pages.products.readingAdvantage.hero.description,
    }),
  },
  {
    path: "/services/blended-learning",
    load: () =>
      import("@/app/[locale]/(marketing)/services/blended-learning/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.blendedLearning.hero.title,
      description: messages.pages.blendedLearning.hero.description,
    }),
  },
  {
    path: "/services/managed-service",
    load: () =>
      import("@/app/[locale]/(marketing)/services/managed-service/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.managedService.hero.title,
      description: messages.pages.managedService.hero.description,
    }),
  },
  {
    path: "/services",
    load: () => import("@/app/[locale]/(marketing)/services/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.services.hero.title,
      description: messages.pages.services.hero.description,
    }),
  },
] as const;

describe("Wave 5 T3 SEO metadata behavior", () => {
  it("builds localized canonical, alternate, and Open Graph metadata", () => {
    for (const [locale, { messages, openGraphLocale }] of Object.entries(
      LOCALES,
    )) {
      const page = messages.pages.about;
      const metadata = buildMarketingMetadata({
        description: page.hero.description,
        locale,
        path: "/about",
        title: page.hero.title,
      });

      expect(metadata.title).toBe(page.hero.title);
      expect(metadata.description).toBe(page.hero.description);
      expect(metadata.alternates).toEqual({
        canonical: `${SITE_ORIGIN}/${locale}/about`,
        languages: {
          en: `${SITE_ORIGIN}/en/about`,
          th: `${SITE_ORIGIN}/th/about`,
          zh: `${SITE_ORIGIN}/zh/about`,
        },
      });
      expect(metadata.openGraph).toMatchObject({
        locale: openGraphLocale,
        url: `${SITE_ORIGIN}/${locale}/about`,
        images: [OPEN_GRAPH_IMAGE],
      });
    }
  });

  it("falls back to English for an unsupported locale", () => {
    const metadata = buildMarketingMetadata({
      description: enMessages.pages.about.hero.description,
      locale: "xx",
      path: "/about",
      title: enMessages.pages.about.hero.title,
    });

    expect(metadata.alternates?.canonical).toBe(`${SITE_ORIGIN}/en/about`);
    expect(metadata.openGraph).toMatchObject({
      locale: "en_US",
      url: `${SITE_ORIGIN}/en/about`,
    });
  });

  it("uses the locale dictionaries for the converted about, features, and pricing routes", async () => {
    const routeMetadata = [
      {
        path: "/about",
        page: enMessages.pages.about,
      },
      {
        path: "/features",
        page: enMessages.pages.feature,
      },
      {
        path: "/pricing",
        page: enMessages.pages.pricing,
      },
    ];

    for (const { page, path } of routeMetadata) {
      const metadata = buildMarketingMetadata({
        description: page.hero.description,
        locale: "en",
        path,
        title: page.hero.title,
      });

      expect(metadata.title).toBe(page.hero.title);
      expect(metadata.description).toBe(page.hero.description);
      expect(metadata.alternates?.canonical).toBe(`${SITE_ORIGIN}/en${path}`);
    }

    const helper = vi.mocked(buildMarketingMetadata);
    helper.mockClear();

    for (const [locale, { messages, openGraphLocale }] of LOCALE_ENTRIES) {
      mockLocaleDictionary(messages);

      for (const route of COMPLETED_ROUTE_METADATA) {
        const routeModule = await route.load();
        expect(routeModule.generateMetadata).toEqual(expect.any(Function));

        const callsBeforeRoute = helper.mock.calls.length;
        const metadata = await routeModule.generateMetadata({
          params: Promise.resolve({ locale }),
        });
        const input = helper.mock.calls.at(-1)?.[0];
        const routeSuffix = route.path === "/" ? "" : route.path;
        const localizedPath = `${SITE_ORIGIN}/${locale}${routeSuffix}`;
        const expected = route.expected(messages);

        expect(helper.mock.calls).toHaveLength(callsBeforeRoute + 1);
        expect(input).toMatchObject({
          locale,
          path: route.path,
          title: expected.title,
          description: expected.description,
        });
        expect(metadata).toMatchObject({
          title: expected.title,
          description: expected.description,
          alternates: {
            canonical: localizedPath,
            languages: {
              en: `${SITE_ORIGIN}/en${routeSuffix}`,
              th: `${SITE_ORIGIN}/th${routeSuffix}`,
              zh: `${SITE_ORIGIN}/zh${routeSuffix}`,
            },
          },
          openGraph: {
            locale: openGraphLocale,
            url: localizedPath,
            images: [OPEN_GRAPH_IMAGE],
          },
        });
      }
    }

    expect(helper).toHaveBeenCalledTimes(
      COMPLETED_ROUTE_METADATA.length * LOCALE_ENTRIES.length,
    );
  });

  it("uses a real PNG asset for Open Graph images", () => {
    const signature = readFileSync(
      resolve(APP_ROOT, "public", OPEN_GRAPH_IMAGE.slice(1)),
    ).subarray(0, 8);

    expect([...signature]).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  });
});
