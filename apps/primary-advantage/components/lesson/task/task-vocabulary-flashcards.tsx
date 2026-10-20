"use client";

import React from "react";
import LessonFlashcardGame from "../games/lesson-flashcard-game";
import { FlashcardType } from "@/types/enum";
import { Book } from "lucide-react";
import { useTranslations } from "next-intl";
import { TaskHeader } from "./task-header";

export default function TaskVocabularyFlashcards({
  articleId,
}: {
  articleId: string;
}) {
  const t = useTranslations("Lesson.tasks");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <TaskHeader icon={<Book />} title={t("vocabularyFlashcardsTitle")} subtitle={t("vocabularyFlashcardsDescription")} />

      {/* Vocabulary Flashcard Component */}
      <LessonFlashcardGame articleId={articleId as string} cardKind={FlashcardType.VOCABULARY} />
    </div>
  );
}
