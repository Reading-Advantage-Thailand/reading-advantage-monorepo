import LessonCard from "@/components/lesson/lesson-card";
import StandaloneLessonCard from "@/components/lesson/standalone-lesson-card";
import { currentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import React from "react";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";

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

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const user = await currentUser();
  if (!user) return redirect("/auth/signin");

  // Check if there's a 'type' parameter to explicitly indicate lesson type
  const lessonType = search.type as string | undefined;

  // If type is explicitly 'article', use standalone lesson
  if (lessonType === "article") {
    return (
      <div className="rounded-xl bg-gradient-to-b from-gray-50 to-white to-20% dark:from-slate-900 dark:to-[hsl(222.2_90%_4.9%)]">
        <div className="relative">
          <StandaloneLessonCard articleId={id} />
        </div>
      </div>
    );
  }

  // Otherwise, check if it's an assignment
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    select: { id: true },
  });

  // If it's an assignment, use the assignment-based lesson
  if (assignment) {
    return (
      <div className="rounded-xl bg-gradient-to-b from-gray-50 to-white to-20% dark:from-slate-900 dark:to-[hsl(222.2_90%_4.9%)]">
        <div className="relative">
          <LessonCard id={id} />
        </div>
      </div>
    );
  }

  // If no assignment found, treat it as an article ID for standalone lesson
  return (
    <div className="rounded-xl bg-gradient-to-b from-gray-50 to-white to-20% dark:from-slate-900 dark:to-[hsl(222.2_90%_4.9%)]">
      <div className="relative">
        <StandaloneLessonCard articleId={id} />
      </div>
    </div>
  );
}
