import React from "react";
import StandaloneLessonProgressBar from "./standalone-lesson-progress-bar";
import { BookOpenIcon, GraduationCapIcon } from "lucide-react";
import { getArticleForLesson } from "@/server/models/lessonModel";
import { QuizContextProvider } from "@/contexts/question-context";
import { getTranslations } from "next-intl/server";
import { Article } from "@/types";

export default async function StandaloneLessonCard({
  articleId,
}: {
  articleId: string;
}) {
  const t = await getTranslations("Lesson");
  const article = await getArticleForLesson(articleId);

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="mb-8">
        <div className="rounded-2xl border border-gray-200 bg-indigo-400 p-6 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-3">
                <BookOpenIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t("header.title", { default: "Lesson" })}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {t("header.subtitle", {
                    default: "Interactive Reading Experience",
                  })}
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-full bg-gradient-to-r from-purple-200 to-pink-200 px-4 py-2 md:flex dark:from-purple-950 dark:to-pink-950">
              <GraduationCapIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                {t("header.mode", { default: "Learning Mode" })}
              </span>
            </div>
          </div>

          {/* Article Title */}
          <div className="rounded-xl border-l-4 border-blue-500 bg-gradient-to-r from-gray-300 to-blue-300 p-4 dark:from-gray-800 dark:to-blue-950">
            <h2 className="text-xl leading-tight font-semibold text-gray-900 dark:text-white">
              {article?.title}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {t("header.cta", {
                default:
                  "Begin your interactive reading journey with this article",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Main Lesson Content */}
      <QuizContextProvider>
        <StandaloneLessonProgressBar article={article as unknown as Article} />
      </QuizContextProvider>
    </div>
  );
}
