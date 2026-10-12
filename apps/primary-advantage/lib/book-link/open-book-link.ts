import { db } from "@reading-advantage/db";
import { findTeacherClassBook, resolveBookLink } from "@reading-advantage/domain/primary-books";
import { currentUser } from "@/lib/session";
import { logger } from "@/lib/observability/logger";
import { bookSignInHref } from "@/lib/book-link/signin-href";

/** The case pages of a `/b/` address that is not the normal one (spec S4). */
export type BookLinkCaseName = "unknown-book" | "no-lesson" | "not-ready" | "no-class" | "teacher-only" | "wrong-account" | "unknown-address" | "retry";

/** What the page does for a `/b/` address: redirect, or render a case page. */
export type BookLinkOutcome =
  | { type: "redirect"; href: string | ReturnType<typeof bookSignInHref> }
  | { type: "case"; name: BookLinkCaseName; homeHref: string; bookName?: string; lessonCount?: number; retryHref?: string };

/** Roles that may open the lesson page of a class (a class teacher, or staff with a school class). */
const STAFF_ROLES = ["TEACHER", "ADMIN", "SYSTEM"];

/**
 * The role home that a case page links to: the student home, the teacher class list, or the start
 * page for any other reader.
 * @param role The role of the signed-in user, or undefined when signed out.
 * @returns A locale-less path.
 */
const homeOf = (role?: string) => (role === "STUDENT" ? "/student/home" : role === "TEACHER" ? "/teacher/my-classes" : "/");

/**
 * Decides what a printed QR address `/b/<book>/<n>[/writing]` does for the current reader. The
 * reading page and the writing page share this function (spec S3, S4). It logs one event for each
 * case page, with the case, the book key, and the number, and never the user name.
 * @param params The locale, the book key and number text from the address, and `writing` for the writing code.
 * @returns A redirect target, or the case page to render.
 */
export async function openBookLink(params: { locale: string; book: string; n: string; writing?: boolean }): Promise<BookLinkOutcome> {
  const { locale, book, writing = false } = params;
  // Only plain digits count; "1e1", "0x5", "1.5", "-1" become NaN and give the no-lesson page.
  const number = /^[1-9]\d*$/.test(params.n) ? Number(params.n) : Number.NaN;
  const where = { book, number };
  const user = await currentUser();
  const homeHref = homeOf(user?.role);
  const failed = (error: unknown): BookLinkOutcome => {
    logger.error("book_link.lookup_failed", { ...where, error });
    return { type: "case", name: "retry", homeHref, retryHref: `/b/${book}/${params.n}${writing ? "/writing" : ""}` };
  };

  let result;
  try {
    result = await resolveBookLink({ db, bookKey: book, number });
  } catch (error) {
    return failed(error);
  }
  if (result.kind === "unknown_book") {
    logger.info("book_link.unknown_book", where);
    return { type: "case", name: "unknown-book", homeHref };
  }
  if (result.kind === "no_lesson") {
    logger.info("book_link.no_lesson", where);
    return { type: "case", name: "no-lesson", bookName: result.bookName, lessonCount: result.lessonCount, homeHref };
  }
  const { lesson } = result;
  if (!user) return { type: "redirect", href: bookSignInHref({ locale, book, number, writing }) };
  if (user.role === "STUDENT") {
    if (result.kind === "unpublished") {
      logger.info("book_link.unpublished", where);
      return { type: "case", name: "not-ready", homeHref };
    }
    return { type: "redirect", href: writing ? `/student/read/${lesson.articleId}` : `/student/lesson/${lesson.articleId}?type=article` };
  }
  if (!STAFF_ROLES.includes(user.role)) {
    logger.info("book_link.wrong_role", { ...where, role: user.role, reason: "wrong_account" });
    return { type: "case", name: "wrong-account", homeHref };
  }
  let classBook = null;
  if (user.schoolId) {
    try {
      classBook = await findTeacherClassBook({ db, user, bookId: lesson.bookId });
    } catch (error) {
      return failed(error);
    }
  }
  if (classBook) return { type: "redirect", href: `/teacher/class-roster/${classBook.classroomId}/books/${classBook.classBookId}/lessons/${number}` };
  if (user.role === "TEACHER") {
    logger.info("book_link.no_class", where);
    return { type: "case", name: "no-class", bookName: lesson.bookName, homeHref };
  }
  logger.info("book_link.wrong_role", { ...where, role: user.role, reason: "teacher_only" });
  return { type: "case", name: "teacher-only", homeHref };
}
