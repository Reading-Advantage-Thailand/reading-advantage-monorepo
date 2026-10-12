import { getTranslations } from "next-intl/server";
import { BookMarkedIcon, TriangleAlertIcon } from "lucide-react";
import type { CatalogueBook, ClassBook } from "@reading-advantage/domain/primary-books";
import { Panel, RpgLink } from "@/components/rpg/chrome";
import { AssignBookForm } from "./assign-book-form";

/**
 * The class book card of the class page (FR-1, FR-3): the assigned books with the lesson pointer
 * and the taught count, a link to each lesson plan, and the assign form. When the books fail to
 * load it shows the load error with a retry link instead (Phase S3).
 * @param props.classroomId The class.
 * @param props.books The books assigned to the class.
 * @param props.catalogue The books a teacher can assign.
 * @param props.failed True when the page could not load the books; the card shows the error state.
 * @param props.className Extra classes.
 * @returns The card.
 */
export async function ClassBooksCard({ classroomId, books, catalogue, failed, className }: { classroomId: string; books: ClassBook[]; catalogue: CatalogueBook[]; failed?: boolean; className?: string }) {
  const t = await getTranslations("TeacherUi.classBook");
  const headingId = `class-books-${classroomId}`;
  return (
    <Panel aria-labelledby={headingId} data-class-book-slot={classroomId} className={className}>
      <h2 id={headingId} className="flex items-center gap-2 text-xl font-bold">
        <BookMarkedIcon className="size-6" aria-hidden="true" />
        {t("title")}
      </h2>
      {failed ? (
        <>
          <div role="alert" className="flex items-start gap-3">
            <TriangleAlertIcon className="mt-1 size-6 shrink-0" style={{ color: "var(--cq-red)" }} aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <p className="text-base font-bold">{t("loadErrorTitle")}</p>
              <p className="text-base">{t("loadErrorBody")}</p>
            </div>
          </div>
          <div>
            <RpgLink href={`/teacher/class-roster/${classroomId}`} tone="iron" className="w-full sm:w-auto">
              {t("retry")}
            </RpgLink>
          </div>
        </>
      ) : (
        <>
          {books.length ? (
            <ul className="flex flex-col gap-2">
              {books.map((book) => (
                <li key={book.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border-2 p-3" style={{ borderColor: "var(--cq-parchment-edge)" }}>
                  <div className="flex min-w-0 flex-col">
                    <span className="font-bold">{book.bookName}</span>
                    <span className="text-sm">
                      {t("pointer", { current: book.currentLesson, total: book.lessonCount })} · {t("taughtCount", { count: book.taughtCount })}
                    </span>
                  </div>
                  <RpgLink href={`/teacher/class-roster/${classroomId}/books/${book.id}`} tone="wood" className="w-full sm:w-auto">
                    {t("pacing")}
                  </RpgLink>
                </li>
              ))}
            </ul>
          ) : catalogue.length ? (
            <p className="text-base">{t("none")}</p>
          ) : null}
          <AssignBookForm classroomId={classroomId} catalogue={catalogue} />
        </>
      )}
    </Panel>
  );
}
