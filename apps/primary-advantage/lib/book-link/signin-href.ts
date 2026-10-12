/**
 * Builds the sign-in link of a printed QR book address. The `callbackUrl` has the form that
 * `proxy.ts` uses (`/<locale>/b/<book>/<n>[/writing]`), so the reader returns to the same lesson.
 * @param opts.locale The locale of the page.
 * @param opts.book The book key from the address.
 * @param opts.number The lesson number from the address.
 * @param opts.writing True for the writing QR code (`/writing`).
 * @returns A href object for the i18n navigation helpers, with the locale-less sign-in path.
 */
export function bookSignInHref({ locale, book, number, writing = false }: { locale: string; book: string; number: number; writing?: boolean }) {
  return {
    pathname: "/auth/signin",
    query: { callbackUrl: `/${locale}/b/${book}/${number}${writing ? "/writing" : ""}` },
  };
}
