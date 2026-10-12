import { and, eq } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { primaryBookLessons, primaryBooks } from "@reading-advantage/db/schema";
import { createTenantDB } from "../db-contract.js";
import { MAX_BOOK_LINK_NUMBER, type BookLinkResult } from "./book-link-contracts.js";

const CATALOGUE_REASON = "the book catalogue is global (EXEMPT); no tenant";

/**
 * Resolves a printed QR link `/b/<book>/<n>` to one of four results (spec S4). It does not check
 * the reader; the caller decides what each result means for a role.
 * @param params The database, the book key (`o3-2`), and the lesson number from the address.
 * @returns `ok` or `unpublished` with the lesson, `no_lesson` with the book name and lesson count,
 *   or `unknown_book`. A number that is not a whole number from 1 to 10000 is `no_lesson` (or
 *   `unknown_book` when the key is unknown); the lesson query does not run for it.
 * @throws When the database fails.
 */
export async function resolveBookLink(params: { db: DB; bookKey: string; number: number }): Promise<BookLinkResult> {
  const raw = createTenantDB(params.db, { schoolId: null }).unscoped(CATALOGUE_REASON);
  if (Number.isInteger(params.number) && params.number >= 1 && params.number <= MAX_BOOK_LINK_NUMBER) {
    const rows = await raw
      .select({ bookId: primaryBooks.id, bookKey: primaryBooks.key, bookName: primaryBooks.name, number: primaryBookLessons.number, title: primaryBookLessons.title, articleId: primaryBookLessons.articleId, approved: primaryBookLessons.approved })
      .from(primaryBookLessons)
      .innerJoin(primaryBooks, eq(primaryBooks.id, primaryBookLessons.bookId))
      .where(and(eq(primaryBooks.key, params.bookKey), eq(primaryBookLessons.number, params.number)))
      .limit(1);
    const lesson = rows[0];
    if (lesson) return { kind: lesson.articleId && lesson.approved ? "ok" : "unpublished", lesson };
  }
  const books = await raw.select({ bookName: primaryBooks.name, lessonCount: primaryBooks.lessonCount }).from(primaryBooks).where(eq(primaryBooks.key, params.bookKey)).limit(1);
  const book = books[0];
  return book ? { kind: "no_lesson", bookName: book.bookName, lessonCount: book.lessonCount } : { kind: "unknown_book" };
}
