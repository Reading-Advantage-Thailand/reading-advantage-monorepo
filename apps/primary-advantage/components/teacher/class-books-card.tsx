import { getTranslations } from "next-intl/server";
import { BookMarkedIcon, TriangleAlertIcon } from "lucide-react";
import type { CatalogueBook, ClassBook } from "@reading-advantage/domain/primary-books";
import { WORKBOOK_STEPS } from "@reading-advantage/domain/primary-books/step-map";
import { Meter, Panel, Plaque, RpgLink } from "@/components/rpg/chrome";
import { ART } from "@/lib/rpg/places";
import { cn } from "@/lib/utils";
import { AssignBookForm } from "./assign-book-form";

/**
 * The class book card of the class page (FR-1, FR-3), first card after the class heading (anchor
 * `#class-book`). Each assigned book shows plaques for the lesson and the taught count, the lesson
 * title, a meter of the workbook steps, the next step with its period, an "Open lesson" button,
 * and a link to the lesson plan. The assign form follows. When the books fail to load it shows the
 * load error with a retry link instead.
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
    <Panel id="class-book" aria-labelledby={headingId} className={cn("scroll-mt-20", className)} data-class-book-slot={classroomId}>
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
            <ul className="flex flex-col gap-4">
              {books.map((book, index) => {
                const next = book.nextStep ? WORKBOOK_STEPS.find((step) => step.step === book.nextStep) : null;
                const base = `/teacher/class-roster/${classroomId}/books/${book.id}`;
                return (
                  <li key={book.id} className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="cq-muted text-sm font-bold tracking-wide uppercase">{t("nowInClass")}</p>
                        <p className="text-2xl font-bold break-words">{book.bookName}</p>
                      </div>
                      <div className="grid w-full grid-cols-2 gap-2 sm:w-64">
                        <Plaque icon={ART.noticeBoard} label={t("pointer", { current: book.currentLesson, total: book.lessonCount })}>
                          {book.currentLesson}/{book.lessonCount}
                        </Plaque>
                        <Plaque icon={ART.banner} label={t("taughtLabel")}>
                          {book.taughtCount}
                        </Plaque>
                      </div>
                    </div>
                    {book.lessonTitle ? <p className="text-lg font-bold break-words">{t("lessonTitle", { number: book.currentLesson, title: book.lessonTitle })}</p> : null}
                    <Meter value={book.stepsDoneCount ?? 0} max={WORKBOOK_STEPS.length} label={t("stepsMeter")} tone="green" thin />
                    <p className="text-base">
                      <span className="cq-muted font-bold">{t("nextStep")}</span>
                      {" · "}
                      {next ? (
                        <>
                          {t("nextStepValue", { step: next.step, title: next.title })} · <span className="font-bold">{t("period", { period: next.period })}</span>
                        </>
                      ) : (
                        t("allStepsDone")
                      )}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <RpgLink href={`${base}/lessons/${book.currentLesson}`} tone={index === 0 ? "gold" : "wood"} className="w-full sm:w-auto">
                        {t("openLesson")}
                      </RpgLink>
                      <RpgLink href={base} tone="wood" className="w-full sm:w-auto">
                        {t("pacing")}
                      </RpgLink>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : catalogue.length ? (
            <p className="text-base">{t("none")}</p>
          ) : null}
          {books.length && catalogue.length ? (
            <details>
              <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">{t("assignAnother")}</summary>
              <AssignBookForm classroomId={classroomId} catalogue={catalogue} />
            </details>
          ) : (
            <AssignBookForm classroomId={classroomId} catalogue={catalogue} />
          )}
        </>
      )}
    </Panel>
  );
}
