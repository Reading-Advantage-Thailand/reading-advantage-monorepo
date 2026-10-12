import { renderBookLink } from "@/components/book-link/render-book-link";

/**
 * The printed writing QR link: `/b/<book>/<n>/writing`. It uses the same lookup as the reading
 * link; a student lands in the writing flow of the article, a teacher on the lesson page (spec S3).
 * @param props.params The locale, the book key, and the lesson number.
 * @returns A redirect, the landing, or the case page.
 */
export default async function BookWritingLinkPage({ params }: { params: Promise<{ locale: string; book: string; n: string }> }) {
  const { locale, book, n } = await params;
  return renderBookLink({ locale, book, n, writing: true });
}
