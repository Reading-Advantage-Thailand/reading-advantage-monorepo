import LessonCard from "@/components/lesson/lesson-card";
import { currentUser } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import React from "react";
import { getTranslations } from "next-intl/server";
import { db, assignments, eq } from "@reading-advantage/db";

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
    return <LessonCard source="article" articleId={id} />;
  }

  // Otherwise, check if it's an assignment.
  // Drizzle equivalent of the legacy Prisma
  // `db.assignment.findUnique({ where: { id }, select: { id: true } })` call.
  const [assignment] = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(eq(assignments.id, id))
    .limit(1);

  // If it's an assignment, use the assignment-based lesson; otherwise treat the id as an article.
  return assignment ? <LessonCard source="assignment" id={id} /> : <LessonCard source="article" articleId={id} />;
}
