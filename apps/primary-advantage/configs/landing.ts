/**
 * The pictures of the public pages (spec PP-5, PP-10): WebP at display size under
 * `public/landing/`, made from the captures that Daniel accepted for public use (RPG skin
 * Phases 2 to 5) and from the flat front cover of the workbook.
 */
export const LANDING_ART = {
  /** The flat front cover of Primary Advantage Origins 3.2 (Workbooks session, 2026-10-07). */
  bookCover: { src: "/landing/pa-origins-3.2-cover.webp", width: 600, height: 814 },
  homePhone: { src: "/landing/home-phone.webp", width: 560, height: 859 },
  classBookPhone: { src: "/landing/class-book-phone.webp", width: 560, height: 1213 },
  classBookDesktop: { src: "/landing/class-book-desktop.webp", width: 1200, height: 844 },
  heroesDesktop: { src: "/landing/heroes-desktop.webp", width: 1200, height: 844 },
  shopPhone: { src: "/landing/shop-phone.webp", width: 560, height: 1213 },
  questPhone: { src: "/landing/quest-phone.webp", width: 560, height: 1213 },
} as const;

/** A picture of the public pages. */
export type LandingPicture = (typeof LANDING_ART)[keyof typeof LANDING_ART];

const WWW_LOCALE: Readonly<Record<string, string>> = { en: "en", th: "th", cn: "zh", tw: "zh" };

/**
 * The Tutor Advantage page of the www site in the visitor's language (www has en, th, and zh).
 * @param locale The Primary locale.
 * @returns The page URL; a locale that www does not have gets English.
 */
export function tutorAdvantageUrl(locale: string): string {
  return `https://reading-advantage.com/${WWW_LOCALE[locale] ?? "en"}/products/tutor-advantage`;
}
