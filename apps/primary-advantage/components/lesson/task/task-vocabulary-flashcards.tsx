"use client";

import React from "react";
import LessonVocabularyFlashcardGame from "../games/lesson-vocabulary-flashcard-card";
import { Book } from "lucide-react";
import { useTranslations } from "next-intl";

export default function TaskVocabularyFlashcards({
  articleId,
}: {
  articleId: string;
}) {
  const t = useTranslations("Lesson.tasks");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header Section */}
      <div className="space-y-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-300 via-green-300 to-teal-300 p-8 text-center dark:border-emerald-800 dark:from-emerald-950 dark:via-green-950 dark:to-teal-950">
        <div className="mb-4 inline-flex items-center justify-center rounded-full bg-emerald-100 p-3 dark:bg-emerald-900">
          <Book className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("vocabularyFlashcardsTitle")}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          {t("vocabularyFlashcardsDescription")}
        </p>
      </div>

      {/* Vocabulary Flashcard Component */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-zinc-200 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <div className="p-6">
          <LessonVocabularyFlashcardGame articleId={articleId as string} />
        </div>
      </div>
    </div>
  );
}
