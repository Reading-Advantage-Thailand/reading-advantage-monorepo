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

const ROUTE_LOCALES = [
  {
    locale: "en",
    effectiveLocale: "en",
    messages: enMessages,
    openGraphLocale: "en_US",
  },
  {
    locale: "th",
    effectiveLocale: "th",
    messages: thMessages,
    openGraphLocale: "th_TH",
  },
  {
    locale: "zh",
    effectiveLocale: "zh",
    messages: zhMessages,
    openGraphLocale: "zh_CN",
  },
  {
    locale: "xx",
    effectiveLocale: "en",
    messages: enMessages,
    openGraphLocale: "en_US",
  },
] as const;

type LocaleMessages = (typeof ROUTE_LOCALES)[number]["messages"];
type Translator = Awaited<ReturnType<typeof getScopedI18n>>;
type MetadataRecord = {
  title?: unknown;
  description?: unknown;
  alternates?: unknown;
  openGraph?: unknown;
};
type GenerateMetadata = (props: {
  params: Promise<{ locale: string }>;
}) => Promise<MetadataRecord>;

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
      readLocaleMessage(messages, String(scope), key)) as Translator;

    return Promise.resolve(translator);
  });
}

const REMAINING_STATIC_ROUTES = [
  {
    path: "/mastery-advantage",
    load: () => import("@/app/[locale]/(marketing)/mastery-advantage/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.masteryAdvantage.hero.title,
      description: messages.pages.masteryAdvantage.hero.description,
    }),
  },
  {
    path: "/products",
    load: () => import("@/app/[locale]/(marketing)/products/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.products.overview.hero.title,
      description: messages.pages.products.overview.hero.description,
    }),
  },
  {
    path: "/products/codecamp-advantage",
    load: () =>
      import("@/app/[locale]/(marketing)/products/codecamp-advantage/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.products.codecampAdvantage.hero.title,
      description: messages.pages.products.codecampAdvantage.hero.description,
    }),
  },
  {
    path: "/products/math-advantage",
    load: () =>
      import("@/app/[locale]/(marketing)/products/math-advantage/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.products.mathAdvantage.hero.title,
      description: messages.pages.products.mathAdvantage.hero.description,
    }),
  },
  {
    path: "/products/science-advantage",
    load: () =>
      import("@/app/[locale]/(marketing)/products/science-advantage/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.products.scienceAdvantage.hero.title,
      description: messages.pages.products.scienceAdvantage.hero.description,
    }),
  },
  {
    path: "/products/stem-advantage",
    load: () =>
      import("@/app/[locale]/(marketing)/products/stem-advantage/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.products.stemAdvantage.hero.title,
      description: messages.pages.products.stemAdvantage.hero.description,
    }),
  },
  {
    path: "/products/storytime-advantage",
    load: () =>
      import("@/app/[locale]/(marketing)/products/storytime-advantage/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.products.storytimeAdvantage.hero.title,
      description: messages.pages.products.storytimeAdvantage.hero.description,
    }),
  },
  {
    path: "/products/tutor-advantage",
    load: () =>
      import("@/app/[locale]/(marketing)/products/tutor-advantage/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.products.tutorAdvantage.hero.title,
      description: messages.pages.products.tutorAdvantage.hero.description,
    }),
  },
  {
    path: "/products/zhongwen-advantage",
    load: () =>
      import("@/app/[locale]/(marketing)/products/zhongwen-advantage/page"),
    expected: (messages: LocaleMessages) => ({
      title: messages.pages.products.zhongwenAdvantage.hero.title,
      description: messages.pages.products.zhongwenAdvantage.hero.description,
    }),
  },
] as const;

function expectedMetadata(
  route: (typeof REMAINING_STATIC_ROUTES)[number],
  locale: (typeof ROUTE_LOCALES)[number],
) {
  const routeSuffix = route.path;
  const localizedPath = `${SITE_ORIGIN}/${locale.effectiveLocale}${routeSuffix}`;
  const expectedCopy = route.expected(locale.messages);

  return {
    copy: expectedCopy,
    canonical: localizedPath,
    languages: {
      en: `${SITE_ORIGIN}/en${routeSuffix}`,
      th: `${SITE_ORIGIN}/th${routeSuffix}`,
      zh: `${SITE_ORIGIN}/zh${routeSuffix}`,
    },
    openGraphLocale: locale.openGraphLocale,
  };
}

describe("Wave 5 remaining static SEO metadata Red", () => {
  it.each(REMAINING_STATIC_ROUTES)(
    "$path exposes complete locale-aware metadata",
    async (route) => {
      const routeModule = await route.load();
      const candidate =
        "generateMetadata" in routeModule
          ? routeModule.generateMetadata
          : undefined;
      const generateMetadata =
        typeof candidate === "function"
          ? (candidate as GenerateMetadata)
          : undefined;

      expect(generateMetadata).toEqual(expect.any(Function));
      if (!generateMetadata) return;

      const helper = vi.mocked(buildMarketingMetadata);
      helper.mockClear();
      const results = [];

      for (const locale of ROUTE_LOCALES) {
        mockLocaleDictionary(locale.messages);
        const metadata = await generateMetadata({
          params: Promise.resolve({ locale: locale.locale }),
        });
        results.push({ locale, metadata });
      }

      expect(results).toHaveLength(ROUTE_LOCALES.length);
      expect(helper).toHaveBeenCalledTimes(ROUTE_LOCALES.length);

      for (const { locale, metadata } of results) {
        const expected = expectedMetadata(route, locale);
        const input = helper.mock.calls.find(
          ([call]) =>
            call.path === route.path &&
            call.title === expected.copy.title &&
            call.description === expected.copy.description,
        )?.[0];

        expect(input).toMatchObject({
          path: route.path,
          title: expected.copy.title,
          description: expected.copy.description,
        });
        expect(metadata).toMatchObject({
          title: expected.copy.title,
          description: expected.copy.description,
          openGraph: {
            locale: expected.openGraphLocale,
            url: expected.canonical,
            images: [OPEN_GRAPH_IMAGE],
          },
        });
        expect(metadata.alternates).toEqual({
          canonical: expected.canonical,
          languages: expected.languages,
        });
      }
    },
  );

  it("uses the verified PNG for the shared Open Graph image", () => {
    const signature = readFileSync(
      resolve(APP_ROOT, "public", OPEN_GRAPH_IMAGE.slice(1)),
    ).subarray(0, 8);

    expect([...signature]).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  });
});
