import { BookLinkCase } from "@/components/book-link/book-link-case";
import { logger } from "@/lib/observability/logger";

/**
 * Any address below `/b/<book>/<n>` other than `writing` (spec S4): the unknown-address page.
 * @param props.params The locale, the book key, the lesson number, and the extra path segments.
 * @returns The unknown-address case page.
 */
export default async function UnknownBookAddressPage({ params }: { params: Promise<{ locale: string; book: string; n: string; rest: string[] }> }) {
  const { book, n } = await params;
  logger.info("book_link.unknown_address", { book: book.slice(0, 64), n: n.slice(0, 64) });
  return <BookLinkCase name="unknown-address" homeHref="/" />;
}
