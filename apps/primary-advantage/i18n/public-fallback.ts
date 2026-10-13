/** The message namespaces of the public pages (home, About, Contact, Our books). */
export const PUBLIC_NAMESPACES = ["PublicSite", "PublicHome", "PublicAbout", "PublicContact", "PublicBooks"] as const;

/** Locales with no public page strings: they read the public pages in English (owner decision 2026-10-07). */
const ENGLISH_PUBLIC_LOCALES: ReadonlySet<string> = new Set(["vi"]);

/**
 * Tells whether a locale reads the public pages in English.
 * @param locale The request locale.
 * @returns True for a locale with no public page strings.
 */
export function usesEnglishPublicPages(locale: string): boolean {
  return ENGLISH_PUBLIC_LOCALES.has(locale);
}

/**
 * Puts the English public namespaces into the messages of a locale that has none.
 * @param messages The messages of the locale.
 * @param english The English messages.
 * @returns A new message object with the English public namespaces; the input is not changed.
 */
export function withPublicFallback(messages: Record<string, unknown>, english: Record<string, unknown>): Record<string, unknown> {
  return { ...messages, ...Object.fromEntries(PUBLIC_NAMESPACES.map((namespace) => [namespace, english[namespace]])) };
}
