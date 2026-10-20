import { redirect } from "@/i18n/navigation";
import { BookLanding } from "@/components/book-link/book-landing";
import { BookLinkCase } from "@/components/book-link/book-link-case";
import { openBookLink } from "@/lib/book-link/open-book-link";

/**
 * Opens a printed QR address and turns the outcome into a page: the reading page and the writing
 * page both use it, so the lookup and the cases exist once.
 * @param params The locale, the book key, the lesson number text, and `writing` for the writing code.
 * @returns The landing or the case page; a redirect never returns.
 */
export async function renderBookLink(params: { locale: string; book: string; n: string; writing: boolean }) {
  const outcome = await openBookLink(params);
  if (outcome.type === "redirect") return redirect({ href: outcome.href, locale: params.locale });
  if (outcome.type === "landing") return <BookLanding {...outcome} />;
  return <BookLinkCase {...outcome} />;
}
