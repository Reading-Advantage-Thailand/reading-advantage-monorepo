import LessonCard from "@/components/lesson/lesson-card";
import { currentUser } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import React from "react";
import { getTranslations } from "next-intl/server";
import { db, assignments, eq } from "@reading-advantage/db";
import { getStudentClassBooks } from "@reading-advantage/domain/primary-books";
import { Scene } from "@/components/rpg/scene";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Lesson" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

/**
 * The workbook-first lock of the article (FR-4 rules): when the article is the current lesson
 * of one of the student's teacher-led class books, the last app step the class has opened.
 * Null when no class book locks the article or the read fails.
 * @param user The signed-in student.
 * @param articleId The article of the lesson.
 * @returns The last open step, or null.
 */
async function maxUnlockedStepFor(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>, articleId: string): Promise<number | null> {
  try {
    const books = (await getStudentClassBooks({ db, user })).filter((book) => book.mode === "teacher_led" && book.lesson?.articleId === articleId);
    if (!books.length) return null;
    return Math.max(0, ...books.map((book) => Math.max(0, ...(book.lesson?.unlockedAppSteps ?? []))));
  } catch {
    return null;
  }
}

/**
 * Lesson page: an assignment lesson when the id is an assignment, otherwise the standalone
 * lesson of an article (`?type=article` skips the assignment lookup).
 * @param props.params The locale and the assignment or article id.
 * @param props.searchParams The lesson type.
 * @returns The lesson.
 */
export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale, id } = await params;
  const search = await searchParams;
  const user = await currentUser();
  if (!user) return redirect({ href: "/auth/signin", locale });

  // Check if there's a 'type' parameter to explicitly indicate lesson type
  const lessonType = search.type as string | undefined;

  // If type is explicitly 'article', use standalone lesson
  if (lessonType === "article") {
    return (
      <Scene place="clearing">
        <LessonCard source="article" articleId={id} maxUnlockedStep={await maxUnlockedStepFor(user, id)} />
      </Scene>
    );
  }

  // Otherwise, check if it's an assignment.
  // Drizzle equivalent of the legacy Prisma
  // `db.assignment.findUnique({ where: { id }, select: { id: true } })` call.
  const [assignment] = await db
    .select({ id: assignments.id, articleId: assignments.articleId })
    .from(assignments)
    .where(eq(assignments.id, id))
    .limit(1);

  // If it's an assignment, use the assignment-based lesson; otherwise treat the id as an article.
  const maxUnlockedStep = await maxUnlockedStepFor(user, assignment?.articleId ?? id);
  // The lesson path is the clearing (docs/primary-rpg-skin.md §4).
  return (
    <Scene place="clearing">
      {assignment ? <LessonCard source="assignment" id={id} maxUnlockedStep={maxUnlockedStep} /> : <LessonCard source="article" articleId={id} maxUnlockedStep={maxUnlockedStep} />}
    </Scene>
  );
}
