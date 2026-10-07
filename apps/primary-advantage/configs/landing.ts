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
  heroesPhone: { src: "/landing/heroes-phone.webp", width: 560, height: 1213 },
  heroesDesktop: { src: "/landing/heroes-desktop.webp", width: 1200, height: 844 },
  shopPhone: { src: "/landing/shop-phone.webp", width: 560, height: 1213 },
  questPhone: { src: "/landing/quest-phone.webp", width: 560, height: 1213 },
} as const;

/** A picture of the public pages. */
export type LandingPicture = (typeof LANDING_ART)[keyof typeof LANDING_ART];

/** A flat front cover on Our books; `key` names its alt text in `PublicBooks.covers`. */
type BookCover = { key: string; src: string; width: number; height: number };

/**
 * The flat front covers of each series on Our books, in book order (final covers from the
 * Workbooks session, 2026-10-07). Later covers come through PR after Daniel approves them.
 */
export const BOOK_COVERS: Readonly<Record<"origins" | "quest" | "adventure", readonly BookCover[]>> = {
  origins: [
    { key: "origins2", src: "/landing/covers/origins-2.webp", width: 240, height: 326 },
    { key: "origins31", src: "/landing/covers/origins-3.1.webp", width: 240, height: 326 },
    { key: "origins32", src: "/landing/covers/origins-3.2.webp", width: 240, height: 326 },
  ],
  quest: [{ key: "quest4", src: "/landing/covers/quest-4.webp", width: 240, height: 326 }],
  adventure: [],
};

const WWW_LOCALE: Readonly<Record<string, string>> = { en: "en", th: "th", cn: "zh", tw: "zh" };

/**
 * The Tutor Advantage page of the www site in the visitor's language (www has en, th, and zh).
 * @param locale The Primary locale.
 * @returns The page URL; a locale that www does not have gets English.
 */
export function tutorAdvantageUrl(locale: string): string {
  return `https://www.reading-advantage.com/${WWW_LOCALE[locale] ?? "en"}/products/tutor-advantage`;
}
