import { getTranslations } from "next-intl/server";
import { BookMarkedIcon } from "lucide-react";
import type { CatalogueBook, ClassBook } from "@reading-advantage/domain/primary-books";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AssignBookForm } from "./assign-book-form";
import { TEACHER_ACTION, TEACHER_CARD } from "./teacher-shell";

/**
 * The class book card of the class page (FR-1, FR-3): the assigned books with the lesson pointer
 * and the taught count, a link to each lesson plan, and the assign form.
 * @param props.classroomId The class.
 * @param props.books The books assigned to the class.
 * @param props.catalogue The books a teacher can assign.
 * @param props.className Extra classes.
 * @returns The card.
 */
export async function ClassBooksCard({ classroomId, books, catalogue, className }: { classroomId: string; books: ClassBook[]; catalogue: CatalogueBook[]; className?: string }) {
  const t = await getTranslations("TeacherUi.classBook");
  const headingId = `class-books-${classroomId}`;
  return (
    <section aria-labelledby={headingId} data-class-book-slot={classroomId} className={cn(TEACHER_CARD, className)}>
      <h2 id={headingId} className="flex items-center gap-2 text-lg font-semibold">
        <BookMarkedIcon className="text-primary size-5" aria-hidden="true" />
        {t("title")}
      </h2>
      {books.length ? (
        <ul className="flex flex-col gap-2">
          {books.map((book) => (
            <li key={book.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
              <div className="flex min-w-0 flex-col">
                <span className="font-semibold">{book.bookName}</span>
                <span className="text-muted-foreground text-sm">
                  {t("pointer", { current: book.currentLesson, total: book.lessonCount })} · {t("taughtCount", { count: book.taughtCount })}
                </span>
              </div>
              <Link href={`/teacher/class-roster/${classroomId}/books/${book.id}`} className={cn(buttonVariants({ variant: "outline" }), TEACHER_ACTION)}>
                {t("pacing")}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">{t("none")}</p>
      )}
      <AssignBookForm classroomId={classroomId} catalogue={catalogue} />
    </section>
  );
}
