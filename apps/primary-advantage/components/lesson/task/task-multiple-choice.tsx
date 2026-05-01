"use client";

import React from "react";
import { Book } from "lucide-react";
import { Article } from "@/types";
import LessonMCQContent from "../pratice/lesson-task-mcq";
import { useTranslations } from "next-intl";

export default function TaskMultipleChoice({ article }: { article: Article }) {
  const t = useTranslations("Lesson.tasks");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header Section */}
      <div className="space-y-4 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-300 via-blue-300 to-indigo-300 p-8 text-center dark:border-purple-800 dark:from-purple-950 dark:via-blue-950 dark:to-indigo-950">
        <div className="mb-4 inline-flex items-center justify-center rounded-full bg-purple-100 p-3 dark:bg-purple-900">
          <Book className="h-8 w-8 text-purple-600 dark:text-purple-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("multipleChoiceTitle")}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          {t("multipleChoiceDescription", { title: article.title })}
        </p>
      </div>

      {/* MCQ Component */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-zinc-200 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <div className="p-6">
          <LessonMCQContent article={article} />
        </div>
      </div>
    </div>
  );
}
