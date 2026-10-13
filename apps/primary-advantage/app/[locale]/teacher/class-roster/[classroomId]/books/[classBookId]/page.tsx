import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon, BarChart3Icon } from "lucide-react";
import { db } from "@reading-advantage/db";
import { getClassBookPacing, type ClassBookPacing } from "@reading-advantage/domain/primary-books";
import { WORKBOOK_STEPS } from "@reading-advantage/domain/primary-books/step-map";
import { StatusChip } from "@reading-advantage/ui";
import { currentUser } from "@/lib/session";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { LessonActions, StepChecklist } from "@/components/teacher/class-book-pacing-controls";
import { TEACHER_ACTION, TEACHER_BACK_LINK, TEACHER_CARD, TeacherPageHeader } from "@/components/teacher/teacher-shell";

/**
 * Counts the runs of a lesson that were taught: the earlier runs with a taught time, and the current run when taught.
 * @param lesson The pacing lesson.
 * @returns The count.
 */
const taughtTimes = (lesson: ClassBookPacing["lessons"][number]): number => lesson.earlierRuns.filter((run) => run.taughtAt).length + (lesson.taughtAt ? 1 : 0);

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
          <Link href={`/teacher/class-roster/${classroomId}`} className={cn(TEACHER_BACK_LINK, "min-h-12")}>
            <ArrowLeftIcon aria-hidden="true" />
            {t("backToClass")}
          </Link>
        }
        actions={
          <Link href={`/teacher/class-roster/${classroomId}/books/${classBookId}/progress`} className={cn(buttonVariants({ variant: "outline" }), TEACHER_ACTION)}>
            <BarChart3Icon aria-hidden="true" />
            {t("progress.open")}
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
                    {taughtTimes(lesson) >= 2 ? ` · ${t("taughtTimes", { count: taughtTimes(lesson) })}` : ""}
                    {lesson.approved ? "" : ` · ${t("draft")}`}
                  </span>
                  {lesson.earlierRuns.length ? (
                    <details className="text-muted-foreground mt-1 text-sm">
                      <summary className="cursor-pointer">{t("earlierRuns", { count: lesson.earlierRuns.length })}</summary>
                      <ul className="mt-1 flex flex-col gap-0.5">
                        {lesson.earlierRuns.map((run) => (
                          <li key={run.runNumber}>
                            {run.taughtAt
                              ? t("earlierRun", { number: run.runNumber, date: format.dateTime(run.taughtAt, { day: "numeric", month: "short" }), done: run.stepsDone.length, total: WORKBOOK_STEPS.length })
                              : t("earlierRunNoDate", { number: run.runNumber, done: run.stepsDone.length, total: WORKBOOK_STEPS.length })}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {lesson.current ? <StatusChip tone="info">{t("current")}</StatusChip> : null}
                  {lesson.runNumber >= 2 ? <StatusChip tone="warning">{t("runChip", { number: lesson.runNumber })}</StatusChip> : null}
                  <Link href={`/teacher/class-roster/${classroomId}/books/${classBookId}/lessons/${lesson.number}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), TEACHER_ACTION)}>
                    {t("guide.open")}
                  </Link>
                  <LessonActions classBookId={classBook.id} lessonNumber={lesson.number} current={lesson.current} taught={lesson.taughtAt !== null} canTeachAgain={lesson.taughtAt !== null || lesson.stepsDone.length > 0 || lesson.earlierRuns.length > 0} />
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
