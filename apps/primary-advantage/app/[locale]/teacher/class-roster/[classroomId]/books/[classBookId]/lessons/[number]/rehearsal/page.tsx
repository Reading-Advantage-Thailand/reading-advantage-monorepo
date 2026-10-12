import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon } from "lucide-react";
import { currentUser } from "@/lib/session";
import { Link, redirect } from "@/i18n/navigation";
import LessonCard from "@/components/lesson/lesson-card";
import { TEACHER_BACK_LINK } from "@/components/teacher/teacher-shell";
import { loadTeacherLesson } from "../page";
import { StudentViewProvider } from "@/components/student/student-view-provider";

type Params = Promise<{ classroomId: string; classBookId: string; number: string }>;

/**
 * Page title: the rehearsal.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TeacherUi.classBook.lesson");
  return { title: t("rehearsal") };
}

/**
 * Lesson rehearsal (FR-10): the teacher runs the student lesson flow of the lesson's article.
 * The lesson runs in Preview mode: it saves no progress, activity, or XP for the teacher.
 * @param props.params The class, the class book, and the lesson number.
 * @returns The page.
 */
export default async function RehearsalPage({ params }: { params: Params }) {
  const { classroomId, classBookId, number: rawNumber } = await params;
  const number = Number(rawNumber);
  const user = await currentUser();
  const locale = await getLocale();
  if (!user) return redirect({ href: "/auth/signin", locale });
  const lesson = await loadTeacherLesson(user, classBookId, number);
  if (!lesson) notFound();
  const t = await getTranslations("TeacherUi.classBook.lesson");
  return (
    <div className="flex flex-col gap-4">
      <Link href={`/teacher/class-roster/${classroomId}/books/${classBookId}/lessons/${number}`} className={TEACHER_BACK_LINK}>
        <ArrowLeftIcon aria-hidden="true" />
        {t("backToLesson")}
      </Link>
      <p role="note" className="bg-muted text-muted-foreground rounded-xl px-4 py-2 text-sm">
        {t("rehearsalHint")}
      </p>
      {lesson.lesson.articleId ? (
        <StudentViewProvider mode="preview">
          <LessonCard source="article" articleId={lesson.lesson.articleId} />
        </StudentViewProvider>
      ) : <p className="text-muted-foreground">{t("noArticle")}</p>}
    </div>
  );
}
