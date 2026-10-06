import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon } from "lucide-react";
import { db } from "@reading-advantage/db";
import { getStudentLessonSteps, type StudentLessonSteps } from "@reading-advantage/domain/primary-books";
import { StatusChip } from "@reading-advantage/ui";
import { currentUser } from "@/lib/session";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { CELL_TONE } from "@/components/teacher/class-book-progress-tone";
import { TEACHER_BACK_LINK, TEACHER_CARD, TeacherPageHeader } from "@/components/teacher/teacher-shell";

type Params = Promise<{ classroomId: string; classBookId: string; studentId: string }>;

/**
 * Page title: the student's progress.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TeacherUi.classBook.progress");
  return { title: t("title") };
}

/**
 * Reads the student's steps; null when the class book or the student is not the teacher's.
 * @param user The signed-in teacher.
 * @param classBookId The class book.
 * @param studentId The student.
 * @returns The steps, or null.
 */
async function loadSteps(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>, classBookId: string, studentId: string): Promise<StudentLessonSteps | null> {
  try {
    return await getStudentLessonSteps({ db, user, classBookId, studentId });
  } catch {
    return null;
  }
}

/**
 * The drill-down of one student (FR-6 click-through): every lesson with its 14 app steps, the
 * time on the lesson, and the fidelity signal (FR-7) when the student opened the lesson in the
 * app before the class taught it.
 * @param props.params The class, the class book, and the student.
 * @returns The page.
 */
export default async function StudentProgressPage({ params }: { params: Params }) {
  const { classroomId, classBookId, studentId } = await params;
  const user = await currentUser();
  if (!user) return redirect({ href: "/auth/signin", locale: await getLocale() });
  const data = await loadSteps(user, classBookId, studentId);
  if (!data) notFound();
  const [t, format] = await Promise.all([getTranslations("TeacherUi.classBook.progress"), getFormatter()]);
  const name = data.student.name ?? data.student.username;

  return (
    <div className="flex flex-col gap-6">
      <TeacherPageHeader
        title={name}
        description={data.classBook.bookName}
        back={
          <Link href={`/teacher/class-roster/${classroomId}/books/${classBookId}/progress`} className={TEACHER_BACK_LINK}>
            <ArrowLeftIcon aria-hidden="true" />
            {t("backToGrid")}
          </Link>
        }
      />
      <ol className="flex flex-col gap-3">
        {data.lessons.map((lesson) => {
          const done = lesson.steps.filter((step) => step.status === "done").length;
          const latest = lesson.steps.reduce<number>((best, step) => Math.max(best, step.seconds), 0);
          const starts = lesson.steps.map((step) => step.startedAt).filter((date): date is Date => date !== null);
          const firstStartedAt = starts.length ? new Date(Math.min(...starts.map((date) => date.getTime()))) : null;
          const openedBeforeTaught = firstStartedAt !== null && (lesson.taughtAt === null || firstStartedAt < lesson.taughtAt);
          return (
            <li key={lesson.number} className={TEACHER_CARD}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  {t("lessonShort", { number: lesson.number })} · {lesson.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span>{t("steps", { done })}</span>
                  {latest > 0 ? <span className="text-muted-foreground">{t("minutes", { minutes: Math.round(latest / 60) })}</span> : null}
                  {openedBeforeTaught ? <StatusChip tone="warning">{t("openedBeforeTaught")}</StatusChip> : null}
                </div>
              </div>
              <p className="text-muted-foreground text-sm">
                {lesson.taughtAt ? t("taughtOn", { date: format.dateTime(lesson.taughtAt, { day: "numeric", month: "short" }) }) : t("notTaught")}
              </p>
              <ol aria-label={t("gridCaption")} className="flex flex-wrap gap-1">
                {lesson.steps.map((step) => (
                  <li
                    key={step.appStep}
                    aria-label={t("stepLabel", { step: step.appStep, status: t(`status.${step.status}`) })}
                    className={cn("flex size-8 items-center justify-center rounded-md text-xs font-semibold", CELL_TONE[step.status])}
                  >
                    {step.appStep}
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
