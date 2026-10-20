"use client";

import { Book } from "lucide-react";
import React from "react";
import LessonFlashcardGame from "../games/lesson-flashcard-game";
import { FlashcardType } from "@/types/enum";
import { useTranslations } from "next-intl";
import { TaskHeader } from "./task-header";

export default function TaskSentenceFlashcards({
  articleId,
}: {
  articleId: string;
}) {
  const t = useTranslations("Lesson.tasks");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <TaskHeader icon={<Book />} title={t("sentenceFlashcardsTitle")} subtitle={t("sentenceFlashcardsDescription")} />

      {/* Sentence Flashcard Component */}
      <LessonFlashcardGame articleId={articleId} cardKind={FlashcardType.SENTENCE} />
    </div>
  );
}
