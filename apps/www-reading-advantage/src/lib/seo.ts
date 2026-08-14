import type { Metadata } from "next";

const SUPPORTED_LOCALES = ["en", "th", "zh"] as const;
const OPEN_GRAPH_LOCALES = {
  en: "en_US",
  th: "th_TH",
  zh: "zh_CN",
} as const;
const SITE_ORIGIN = "https://reading-advantage.com";
const OPEN_GRAPH_IMAGE = "/images/teacher-at-board.png";

type MarketingMetadataInput = {
  description: string;
  locale: string;
  path: string;
  title: string;
};

/**
 * Builds locale-aware metadata for a public marketing route.
 * @param input The route locale, path, title, and description.
 * @returns Metadata with canonical, alternate, Open Graph, and Twitter values.
 */
export function buildMarketingMetadata({
  description,
  locale,
  path,
  title,
}: MarketingMetadataInput): Metadata {
  const resolvedLocale = SUPPORTED_LOCALES.includes(
    locale as (typeof SUPPORTED_LOCALES)[number],
  )
    ? (locale as (typeof SUPPORTED_LOCALES)[number])
    : "en";
  const normalizedPath = path === "/" ? "" : path;
  const localizedPath = `${SITE_ORIGIN}/${resolvedLocale}${normalizedPath}`;
  const alternateLanguages = Object.fromEntries(
    SUPPORTED_LOCALES.map((supportedLocale) => [
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
      images: [OPEN_GRAPH_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OPEN_GRAPH_IMAGE],
    },
  };
}
