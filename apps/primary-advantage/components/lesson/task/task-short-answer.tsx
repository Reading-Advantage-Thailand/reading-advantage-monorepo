"use client";

import { Book } from "lucide-react";
import LessonSAQ from "../pratice/lesson-task-saq";
import { Article } from "@/types";
import { useTranslations } from "next-intl";

export default function TaskShortAnswer({ article }: { article: Article }) {
  const t = useTranslations("Lesson.tasks");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header Section */}
      <div className="space-y-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-300 via-cyan-300 to-teal-300 p-8 text-center dark:border-blue-800 dark:from-blue-950 dark:via-cyan-950 dark:to-teal-950">
        <div className="mb-4 inline-flex items-center justify-center rounded-full bg-blue-100 p-3 dark:bg-blue-900">
          <Book className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("shortAnswerTitle")}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          {t("shortAnswerDescription", { title: article.title })}
        </p>
      </div>

      {/* SAQ Component */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-zinc-200 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <div className="p-6">
          <LessonSAQ article={article} />
        </div>
      </div>
    </div>
  );
}
