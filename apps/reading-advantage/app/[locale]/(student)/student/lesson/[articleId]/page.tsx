import LessonCard from "@/components/lesson/lesson-card";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import React from "react";
import { getScopedI18n } from "@/locales/server";
import CustomError from "./custom-error";
import ChatBotFloatingChatButton from "@/components/chatbot-floating-button";
import { Article } from "@/components/models/article-model";
import { getArticleForReader } from "@/server/services/article-service";
import { getStudentClassroomId } from "@/server/services/classroom-service";

export const metadata = {
  title: "Lesson",
  description: "Interactive Reading Lesson",
};

export default async function LessonPage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const [{ articleId }, t, user] = await Promise.all([
    params,
    getScopedI18n("pages.student.readPage.article"),
    getCurrentUser(),
  ]);
  if (!user) return redirect("/auth/signin");

  // Run the article and classroom lookups in parallel. Failures resolve to a
  // real error state instead of an unhandled page crash.
  const [articleResponse, classroomId] = await Promise.all([
    getArticleForReader(articleId, user.id, user.level),
    getStudentClassroomId(user.id),
  ]);

  if (!articleResponse.ok)
    return (
      <CustomError message={articleResponse.message} resp={articleResponse} />
    );

  const article = articleResponse.article as unknown as Article;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-[hsl(222.2_90%_4.9%)] to-20% rounded-xl">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="relative">
          <LessonCard
            article={article}
            articleId={articleId}
            userId={user.id}
            classroomId={classroomId ?? undefined}
          />
          <ChatBotFloatingChatButton article={article} />
        </div>
      </div>
    </div>
  );
}
