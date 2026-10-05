import { notFound } from "next/navigation";
import { db } from "@reading-advantage/db";
import { findTeacherClassBook, resolveBookLesson } from "@reading-advantage/domain/primary-books";
import { currentUser } from "@/lib/session";
import { redirect } from "@/i18n/navigation";

/**
 * The printed QR link (FR-16): `/b/<book>/<n>` (for example `/b/o3-2/5`). A student lands in the
 * lesson flow of the lesson's article (or on the home when the lesson is not published); a
 * teacher lands on the lesson page of the first class that has the book (or on the class list).
 * @param props.params The locale, the book key, and the lesson number.
 * @returns A redirect.
 */
export default async function BookLessonLinkPage({ params }: { params: Promise<{ locale: string; book: string; n: string }> }) {
  const { locale, book, n } = await params;
  const number = Number(n);
  if (!Number.isInteger(number) || number < 1) notFound();
  const lesson = await resolveBookLesson({ db, bookKey: book, number });
  if (!lesson) notFound();
  const user = await currentUser();
  if (!user) return redirect({ href: "/auth/signin", locale });
  if (user.role === "STUDENT") {
    return redirect({ href: lesson.articleId && lesson.approved ? `/student/lesson/${lesson.articleId}?type=article` : "/student/home", locale });
  }
  const classBook = await findTeacherClassBook({ db, user, bookId: lesson.bookId }).catch(() => null);
  return redirect({ href: classBook ? `/teacher/class-roster/${classBook.classroomId}/books/${classBook.classBookId}/lessons/${number}` : "/teacher/my-classes", locale });
}
