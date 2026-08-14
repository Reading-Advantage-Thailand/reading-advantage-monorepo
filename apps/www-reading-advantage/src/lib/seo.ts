import type { Metadata } from "next";

const SUPPORTED_LOCALES = ["en", "th", "zh"] as const;
const OPEN_GRAPH_LOCALES = {
  en: "en_US",
  th: "th_TH",
  zh: "zh_CN",
} as const;
const SITE_ORIGIN = "https://reading-advantage.com";
const OPEN_GRAPH_IMAGE = "/images/teacher-at-board.png";

/** A locale supported by the public marketing routes. */
export type MarketingLocale = (typeof SUPPORTED_LOCALES)[number];

type MarketingMetadataInput = {
  description: string;
  locale: string;
  path: string;
  title: string;
  alternateLocales?: readonly MarketingLocale[];
  image?: string;
};

/**
 * Resolves an unknown marketing locale to the English fallback.
 * @param locale The requested marketing locale.
 * @returns The supported locale used for metadata.
 */
export function resolveMarketingLocale(locale: string): MarketingLocale {
  return SUPPORTED_LOCALES.includes(locale as MarketingLocale)
    ? (locale as MarketingLocale)
    : "en";
}

/**
 * Builds locale-aware metadata for a public marketing route.
 * @param input The route locale, path, title, and description.
 * @returns Metadata with canonical, alternate, Open Graph, and Twitter values.
 */
export function buildMarketingMetadata({
  alternateLocales,
  description,
  image = OPEN_GRAPH_IMAGE,
  locale,
  path,
  title,
}: MarketingMetadataInput): Metadata {
  const resolvedLocale = resolveMarketingLocale(locale);
  const normalizedPath = path === "/" ? "" : path;
  const localizedPath = `${SITE_ORIGIN}/${resolvedLocale}${normalizedPath}`;
  const localesForAlternates = alternateLocales?.length
    ? alternateLocales
    : SUPPORTED_LOCALES;
  const alternateLanguages = Object.fromEntries(
    localesForAlternates.map((supportedLocale) => [
      supportedLocale,
      `${SITE_ORIGIN}/${supportedLocale}${normalizedPath}`,
    ]),
  );

  return {
    metadataBase: new URL(SITE_ORIGIN),
    title,
    description,
    alternates: {
      canonical: localizedPath,
      languages: alternateLanguages,
    },
    openGraph: {
      type: "website",
      title,
      description,
      locale: OPEN_GRAPH_LOCALES[resolvedLocale],
      url: localizedPath,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
