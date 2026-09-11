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
  const { articleId } = await params;
  const t = await getScopedI18n("pages.student.readPage.article");

  const user = await getCurrentUser();
  if (!user) return redirect("/auth/signin");

  const articleResponse = await getArticleForReader(articleId, user.id, user.level);

  if (!articleResponse.ok)
    return (
      <CustomError message={articleResponse.message} resp={articleResponse} />
    );

  const classroomId = await getStudentClassroomId(user.id);
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
