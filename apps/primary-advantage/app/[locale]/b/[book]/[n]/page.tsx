import { redirect } from "@/i18n/navigation";
import { BookLanding } from "@/components/book-link/book-landing";
import { BookLinkCase } from "@/components/book-link/book-link-case";
import { openBookLink } from "@/lib/book-link/open-book-link";

/**
 * The printed QR link (FR-16): `/b/<book>/<n>` (for example `/b/o3-2/5`). The shared lookup
 * decides: a student lands in the lesson flow of the lesson's article, a teacher on the lesson
 * page of the first class that has the book, a signed-out reader on the landing (S2), and every other
 * case gets a clear page (spec S4).
 * @param props.params The locale, the book key, and the lesson number.
 * @returns A redirect, the landing, or the case page.
 */
export default async function BookLessonLinkPage({ params }: { params: Promise<{ locale: string; book: string; n: string }> }) {
  const { locale, book, n } = await params;
  const outcome = await openBookLink({ locale, book, n, writing: false });
  if (outcome.type === "redirect") return redirect({ href: outcome.href, locale });
  if (outcome.type === "landing") return <BookLanding {...outcome} />;
  return <BookLinkCase {...outcome} />;
}
