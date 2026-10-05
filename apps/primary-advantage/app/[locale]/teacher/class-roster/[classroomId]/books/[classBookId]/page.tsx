import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon } from "lucide-react";
import { db } from "@reading-advantage/db";
import { getClassBookPacing, type ClassBookPacing } from "@reading-advantage/domain/primary-books";
import { WORKBOOK_STEPS } from "@reading-advantage/domain/primary-books/step-map";
import { StatusChip } from "@reading-advantage/ui";
import { currentUser } from "@/lib/session";
import { Link, redirect } from "@/i18n/navigation";
import { LessonActions, StepChecklist } from "@/components/teacher/class-book-pacing-controls";
import { TEACHER_BACK_LINK, TEACHER_CARD, TeacherPageHeader } from "@/components/teacher/teacher-shell";

type Params = Promise<{ classroomId: string; classBookId: string }>;

/**
 * Page title: the lesson plan.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TeacherUi.classBook");
  return { title: t("pacing") };
}

/**
 * Reads the pacing view; null when the class book is unknown or not the teacher's.
 * @param user The signed-in teacher.
 * @param classBookId The class book.
 * @returns The pacing view, or null.
 */
async function loadPacing(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>, classBookId: string): Promise<ClassBookPacing | null> {
  try {
    return await getClassBookPacing({ db, user, classBookId });
  } catch {
    return null;
  }
}

/**
 * The lesson plan of a class book (FR-3): the next workbook step with its period, the 13 step
 * toggles of the current lesson, and every lesson with its taught date and actions.
 * @param props.params The class and the class book.
 * @returns The page.
 */
export default async function ClassBookPacingPage({ params }: { params: Params }) {
  const { classroomId, classBookId } = await params;
  const user = await currentUser();
  if (!user) return redirect({ href: "/auth/signin", locale: await getLocale() });
  const pacing = await loadPacing(user, classBookId);
  if (!pacing) notFound();
  const [t, format] = await Promise.all([getTranslations("TeacherUi.classBook"), getFormatter()]);
  const { classBook, lessons } = pacing;
  const current = lessons.find((lesson) => lesson.current);
  const next = pacing.nextStep ? WORKBOOK_STEPS.find((step) => step.step === pacing.nextStep) : null;

  return (
    <div className="flex flex-col gap-6">
      <TeacherPageHeader
        title={classBook.bookName}
        description={`${t("pointer", { current: classBook.currentLesson, total: classBook.lessonCount })} · ${t("taughtCount", { count: classBook.taughtCount })}`}
        back={
          <Link href={`/teacher/class-roster/${classroomId}`} className={TEACHER_BACK_LINK}>
            <ArrowLeftIcon aria-hidden="true" />
            {t("backToClass")}
          </Link>
        }
      />

      <section aria-labelledby="pacing-next" className={TEACHER_CARD}>
        <h2 id="pacing-next" className="text-lg font-semibold">
          {t("nextStep")}
        </h2>
        {current ? (
          <>
            <p className="text-muted-foreground text-sm">{t("lessonNumber", { number: current.number })} · {current.title}</p>
            {next ? (
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                {t("nextStepValue", { step: next.step, title: next.title })}
                <StatusChip tone="info">{t("period", { period: next.period })}</StatusChip>
              </p>
            ) : (
              <p className="font-semibold">{t("allStepsDone")}</p>
            )}
            <StepChecklist classBookId={classBook.id} lessonNumber={current.number} steps={WORKBOOK_STEPS} stepsDone={current.stepsDone} />
          </>
        ) : (
          <p className="text-muted-foreground text-sm">{t("noLessons")}</p>
        )}
      </section>

      <section aria-labelledby="pacing-lessons" className={TEACHER_CARD}>
        <h2 id="pacing-lessons" className="text-lg font-semibold">
          {t("lessons")}
        </h2>
        {lessons.length ? (
          <ol className="flex flex-col divide-y">
            {lessons.map((lesson) => (
              <li key={lesson.number} aria-current={lesson.current ? "step" : undefined} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="flex min-w-0 flex-col">
                  <span className="font-semibold">
                    {t("lessonNumber", { number: lesson.number })} · {lesson.title}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {lesson.taughtAt ? t("taughtOn", { date: format.dateTime(lesson.taughtAt, { day: "numeric", month: "short" }) }) : t("notTaught")}
                    {lesson.approved ? "" : ` · ${t("draft")}`}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {lesson.current ? <StatusChip tone="info">{t("current")}</StatusChip> : null}
                  <LessonActions classBookId={classBook.id} lessonNumber={lesson.number} current={lesson.current} taught={lesson.taughtAt !== null} />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground text-sm">{t("noLessons")}</p>
        )}
      </section>
    </div>
  );
}
