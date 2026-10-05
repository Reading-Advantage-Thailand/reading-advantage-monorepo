import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon } from "lucide-react";
import { currentUser } from "@/lib/session";
import { Link, redirect } from "@/i18n/navigation";
import { ProjectorView } from "@/components/teacher/projector-view";
import { TEACHER_BACK_LINK } from "@/components/teacher/teacher-shell";
import { loadTeacherLesson } from "../page";

type Params = Promise<{ classroomId: string; classBookId: string; number: string }>;

/**
 * Page title: the projector.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TeacherUi.classBook.lesson");
  return { title: t("projector") };
}

/**
 * Projector mode of a lesson (FR-11): the article in large type with paragraph focus, the
 * vocabulary, and the questions with an answer reveal.
 * @param props.params The class, the class book, and the lesson number.
 * @returns The page.
 */
export default async function ProjectorPage({ params }: { params: Params }) {
  const { classroomId, classBookId, number: rawNumber } = await params;
  const number = Number(rawNumber);
  const user = await currentUser();
  const locale = await getLocale();
  if (!user) return redirect({ href: "/auth/signin", locale });
  const lesson = await loadTeacherLesson(user, classBookId, number);
  if (!lesson) notFound();
  const t = await getTranslations("TeacherUi.classBook");
  return (
    <div className="flex flex-col gap-6">
      <Link href={`/teacher/class-roster/${classroomId}/books/${classBookId}/lessons/${number}`} className={TEACHER_BACK_LINK}>
        <ArrowLeftIcon aria-hidden="true" />
        {t("lesson.backToLesson")}
      </Link>
      <h1 className="text-3xl font-bold md:text-4xl">{lesson.article?.title ?? `${t("lessonNumber", { number })} · ${lesson.lesson.title}`}</h1>
      <ProjectorView lesson={lesson} showThai={locale === "th"} />
    </div>
  );
}
