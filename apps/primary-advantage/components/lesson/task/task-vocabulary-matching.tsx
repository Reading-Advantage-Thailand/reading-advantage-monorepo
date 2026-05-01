"use client";

import { Book } from "lucide-react";
import React from "react";
import LessonVocabularyMatching from "../games/lesson-vocabulary-matching";
import { useTranslations } from "next-intl";

export default function TaskVocabularyMatching({
  articleId,
}: {
  articleId: string;
}) {
  const t = useTranslations("Lesson.tasks");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header Section */}
      <div className="space-y-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-300 via-purple-300 to-pink-300 p-8 text-center dark:border-indigo-800 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950">
        <div className="mb-4 inline-flex items-center justify-center rounded-full bg-indigo-100 p-3 dark:bg-indigo-900">
          <Book className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("vocabularyMatchingTitle")}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          {t("vocabularyMatchingDescription")}
        </p>
      </div>

      {/* Matching Component */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-zinc-200 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <div className="p-6">
          <LessonVocabularyMatching articleId={articleId as string} />
        </div>
      </div>
    </div>
  );
}
