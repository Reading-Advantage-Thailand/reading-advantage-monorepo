"use client";

import { Book } from "lucide-react";
import React from "react";
import LessonSentenceFlashcardGame from "../games/lesson-sentence-flashcard";
import { useTranslations } from "next-intl";

export default function TaskSentenceFlashcards({
  articleId,
}: {
  articleId: string;
}) {
  const t = useTranslations("Lesson.tasks");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header Section */}
      <div className="space-y-4 rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-300 via-cyan-300 to-blue-300 p-8 text-center dark:border-teal-800 dark:from-teal-950 dark:via-cyan-950 dark:to-blue-950">
        <div className="mb-4 inline-flex items-center justify-center rounded-full bg-teal-100 p-3 dark:bg-teal-900">
          <Book className="h-8 w-8 text-teal-600 dark:text-teal-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("sentenceFlashcardsTitle")}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          {t("sentenceFlashcardsDescription")}
        </p>
      </div>

      {/* Sentence Flashcard Component */}
      <LessonSentenceFlashcardGame articleId={articleId} />
    </div>
  );
}
